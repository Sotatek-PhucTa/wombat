import { expect } from 'chai'
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'
import { BigNumber, Contract } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { ethers, deployments } from 'hardhat'
import { getDeployedContract } from '../utils'
import { restoreOrCreateSnapshot } from './fixtures/executions'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { Safe, executeBatchTransaction } from '../utils/multisig/transactions'
import { executeTimelock, scheduleTimelock, upgradeProxy } from '../utils/multisig/utils'

describe('TimelockController', function () {
  const salt = '0x025e7b0be353a74631ad648c667493c0e1cd31caa4cc2d3520fdc171ea0cc726' // a random value
  const noPredecessor = ethers.constants.HashZero

  let multisig: SignerWithAddress
  let timelockDelay: BigNumber
  let timelockContract: Contract
  let poolContract: Contract
  let asset0: Contract
  let asset1: Contract

  const TIMELOCK_ADMIN_ROLE = ethers.utils.solidityKeccak256(['string'], ['TIMELOCK_ADMIN_ROLE'])
  const PROPOSER_ROLE = ethers.utils.solidityKeccak256(['string'], ['PROPOSER_ROLE'])
  const EXECUTOR_ROLE = ethers.utils.solidityKeccak256(['string'], ['EXECUTOR_ROLE'])
  const CANCELLER_ROLE = ethers.utils.solidityKeccak256(['string'], ['CANCELLER_ROLE'])
  beforeEach(
    restoreOrCreateSnapshot(async function () {
      await deployments.fixture(['HighCovRatioFeePoolAssets', 'MockTokens', 'TimelockController'])
      poolContract = await getDeployedContract('HighCovRatioFeePoolV2', 'MainPool')
      ;[multisig] = await ethers.getSigners()
      timelockContract = await getDeployedContract('TimelockController')
      timelockDelay = await timelockContract.getMinDelay()

      const tokens = await poolContract.getTokens()
      const assetAddress0 = await poolContract.addressOfAsset(tokens[0])
      const assetAddress1 = await poolContract.addressOfAsset(tokens[1])
      asset0 = await ethers.getContractAt('Asset', assetAddress0, multisig)
      asset1 = await ethers.getContractAt('Asset', assetAddress1, multisig)
      await asset0.connect(multisig).transferOwnership(timelockContract.address)
      await asset1.connect(multisig).transferOwnership(timelockContract.address)

      expect(await timelockContract.TIMELOCK_ADMIN_ROLE()).to.be.equal(TIMELOCK_ADMIN_ROLE)
      expect(await timelockContract.PROPOSER_ROLE()).to.be.equal(PROPOSER_ROLE)
      expect(await timelockContract.EXECUTOR_ROLE()).to.be.equal(EXECUTOR_ROLE)
      expect(await timelockContract.CANCELLER_ROLE()).to.be.equal(CANCELLER_ROLE)
    })
  )

  describe('Asset with Timelock', function () {
    beforeEach(async function () {
      expect(await asset0.owner()).to.be.equal(timelockContract.address)
      expect(await asset1.owner()).to.be.equal(timelockContract.address)
    })

    it('should initialize correctly', async function () {
      expect(await timelockContract.getMinDelay()).to.be.equal(timelockDelay)
      expect(await timelockContract.hasRole(TIMELOCK_ADMIN_ROLE, multisig.address)).to.be.equal(true)
      expect(await timelockContract.hasRole(CANCELLER_ROLE, multisig.address)).to.be.equal(true)
      expect(await timelockContract.hasRole(PROPOSER_ROLE, multisig.address)).to.be.equal(true)
      expect(await timelockContract.hasRole(EXECUTOR_ROLE, multisig.address)).to.be.equal(true)

      expect(await asset0.owner()).to.be.equal(timelockContract.address)
      expect(await asset1.owner()).to.be.equal(timelockContract.address)
    })

    it('should be able to transfer ownership in and out to multisig', async function () {
      expect(await asset0.owner()).to.be.equal(timelockContract.address)
      expect(await asset1.owner()).to.be.equal(timelockContract.address)

      // transfer ownership back to multisig
      const data = asset0.interface.encodeFunctionData('transferOwnership', [multisig.address])
      const receipt0 = await scheduleAndExecute(timelockContract, asset0.address, data)
      const receipt1 = await scheduleAndExecute(timelockContract, asset1.address, data)

      await expect(receipt0).to.emit(timelockContract, 'CallExecuted').withArgs(anyValue, 0, asset0.address, '0', data)
      await expect(receipt1).to.emit(timelockContract, 'CallExecuted').withArgs(anyValue, 0, asset1.address, '0', data)

      // owner should be multisig now
      expect(await asset0.owner()).to.be.equal(multisig.address)
      expect(await asset1.owner()).to.be.equal(multisig.address)

      // ownership is returned back to multisig. it should be able to setMaxSupply without Timelock
      await asset0.connect(multisig).setMaxSupply(parseEther('100'))
      expect(await asset0.maxSupply()).to.be.equal(parseEther('100'))
    })

    it('should be able to setMaxSupply for multiple assets', async function () {
      // ensure maxSupply remain unchanged
      expect(await asset0.maxSupply()).to.be.equal(0)
      expect(await asset1.maxSupply()).to.be.equal(0)

      const payload = asset0.interface.encodeFunctionData('setMaxSupply', [parseEther('100')])
      // set maxSupply to 100
      await timelockContract.scheduleBatch(
        [asset0.address, asset1.address],
        [BigNumber.from(0), BigNumber.from(0)],
        [payload, payload],
        noPredecessor,
        salt,
        timelockDelay
      )
      await time.increase(timelockDelay)

      await timelockContract.executeBatch(
        [asset0.address, asset1.address],
        [BigNumber.from(0), BigNumber.from(0)],
        [payload, payload],
        noPredecessor,
        salt
      )

      expect(await asset0.maxSupply()).to.be.equal(parseEther('100'))
      expect(await asset1.maxSupply()).to.be.equal(parseEther('100'))
    })

    it('should work with predecessor', async function () {
      const supplyPayload = asset0.interface.encodeFunctionData('setMaxSupply', [parseEther('100')])
      const ownershipPaylod = asset0.interface.encodeFunctionData('transferOwnership', [multisig.address])

      const supplyId = genOperationId(timelockContract, asset0.address, supplyPayload, BigNumber.from(0))

      await timelockContract.schedule(
        asset0.address,
        BigNumber.from(0),
        supplyPayload,
        noPredecessor,
        salt,
        timelockDelay
      )
      // expect transferOwnership to be executed after setMaxSupply
      await timelockContract.schedule(asset0.address, BigNumber.from(0), ownershipPaylod, supplyId, salt, timelockDelay)

      await time.increase(timelockDelay)

      // transferOwnership -> setMaxSupply, should revert
      await expect(
        timelockContract.execute(asset0.address, BigNumber.from(0), ownershipPaylod, noPredecessor, salt)
      ).to.be.revertedWith('TimelockController: operation is not ready')

      // setMaxSupply -> transferOwnership, should be executed with correct order
      const receipt0 = await timelockContract.execute(
        asset0.address,
        BigNumber.from(0),
        supplyPayload,
        noPredecessor,
        salt
      )
      const receipt1 = await timelockContract.execute(
        asset0.address,
        BigNumber.from(0),
        ownershipPaylod,
        supplyId,
        salt
      )

      await expect(receipt0)
        .to.emit(timelockContract, 'CallExecuted')
        .withArgs(anyValue, 0, asset0.address, '0', supplyPayload)
      await expect(receipt1)
        .to.emit(timelockContract, 'CallExecuted')
        .withArgs(anyValue, 0, asset0.address, '0', ownershipPaylod)

      expect(await asset0.maxSupply()).to.be.equal(parseEther('100'))
      expect(await asset0.owner()).to.be.equal(multisig.address)
    })
  })

  describe('ProxyAdmin with Timelock', function () {
    let proxyAdmin: Contract
    let newImpl: Contract

    beforeEach(async function () {
      proxyAdmin = await getDeployedContract('ProxyAdmin', 'DefaultProxyAdmin')
      expect(await proxyAdmin.owner()).to.be.equal(multisig.address)
      await proxyAdmin.transferOwnership(timelockContract.address)
      expect(await proxyAdmin.owner()).to.be.equal(timelockContract.address)

      newImpl = await ethers.deployContract('DynamicPoolV2')
      expect(await proxyAdmin.getProxyImplementation(poolContract.address)).to.not.eq(newImpl.address)
    })

    it('cannot be upgraded by multisig without timelock', async function () {
      await expect(proxyAdmin.connect(multisig).upgrade(poolContract.address, newImpl.address)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('can transfer ownership back to multisig', async function () {
      const payload = proxyAdmin.interface.encodeFunctionData('transferOwnership', [multisig.address])
      await scheduleAndExecute(timelockContract, proxyAdmin.address, payload)
      expect(await proxyAdmin.owner()).to.be.equal(multisig.address)
    })

    it('can upgrade through timelock', async function () {
      const payload = proxyAdmin.interface.encodeFunctionData('upgrade', [poolContract.address, newImpl.address])
      await scheduleAndExecute(timelockContract, proxyAdmin.address, payload)
      expect(await proxyAdmin.getProxyImplementation(poolContract.address)).to.eq(newImpl.address)
    })
  })

  describe('Multisig with timelock', function () {
    it('can setMaxSupply', async function () {
      expect(await asset0.maxSupply()).to.eq(0)
      expect(await asset0.owner()).to.eq(timelockContract.address)

      await executeBatchTransaction(multisig, await scheduleTimelock([Safe(asset0).setMaxSupply(parseEther('101'))]))
      await time.increase(timelockDelay)
      await executeBatchTransaction(multisig, await executeTimelock([Safe(asset0).setMaxSupply(parseEther('101'))]))
      expect(await asset0.maxSupply()).to.eq(parseEther('101'))
    })

    it('can upgrade proxy', async function () {
      const proxyAdmin = await getDeployedContract('ProxyAdmin', 'DefaultProxyAdmin')
      await proxyAdmin.transferOwnership(timelockContract.address)
      await executeBatchTransaction(
        multisig,
        await scheduleTimelock([await upgradeProxy('MainPool_Proxy', 'HighCovRatioFeePoolV2_Implementation')])
      )
      await time.increase(timelockDelay)
      await executeBatchTransaction(
        multisig,
        await executeTimelock([await upgradeProxy('MainPool_Proxy', 'HighCovRatioFeePoolV2_Implementation')])
      )
    })
  })

  async function scheduleAndExecute(
    timelockContract: Contract,
    target: string,
    payload: string,
    predecessor: string = noPredecessor,
    delay: BigNumber = timelockDelay
  ) {
    await timelockContract.schedule(target, BigNumber.from(0), payload, predecessor, salt, delay)
    await time.increase(delay)
    return timelockContract.execute(target, BigNumber.from(0), payload, predecessor, salt)
  }

  async function genOperationId(
    timelockContract: Contract,
    target: string,
    data: string,
    value: BigNumber = BigNumber.from(0),
    predecessor: string = noPredecessor,
    customSalt: string = salt
  ) {
    return await timelockContract.hashOperation(target, value, data, predecessor, customSalt)
  }
})
