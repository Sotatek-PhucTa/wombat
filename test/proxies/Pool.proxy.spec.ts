import { parseEther } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { Contract, ContractFactory } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { ethers, upgrades } from 'hardhat'
import { latest } from '../helpers/time'

chai.use(solidity)

const proxyImplAddr = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' // EIP1967

describe('Asset (proxy)', function () {
  let owner: SignerWithAddress
  let users: SignerWithAddress[]
  let poolOwner: SignerWithAddress
  let AssetFactory: ContractFactory
  let TestERC20Factory: ContractFactory
  let PoolFactory: ContractFactory
  let DummyPoolFactory: ContractFactory
  let token0: Contract
  let token1: Contract
  let asset0: Contract
  let asset1: Contract
  let poolContract: Contract

  before(async function () {
    ;[owner, ...users] = await ethers.getSigners()
    poolOwner = users[9]

    // Get Factories
    AssetFactory = await ethers.getContractFactory('Asset')
    TestERC20Factory = await ethers.getContractFactory('TestERC20')
    PoolFactory = await ethers.getContractFactory('Pool', poolOwner) // set signer
    DummyPoolFactory = await ethers.getContractFactory('TestPoolV2', poolOwner)
  })

  beforeEach(async function () {
    // Deploy with factories
    token0 = await TestERC20Factory.deploy('Binance USD', 'BUSD', 18, parseUnits('1000000', 18)) // 1 mil BUSD
    token1 = await TestERC20Factory.deploy('Venus USDC', 'vUSDC', 8, parseUnits('10000000', 8))
    asset0 = await AssetFactory.deploy(token0.address, 'Binance USD LP', 'BUSD-LP')
    asset1 = await AssetFactory.deploy(token1.address, 'Venus USD LP', 'vUSDC-LP')

    // wait for transactions to be mined
    await token0.deployed()
    await token1.deployed()
    await asset0.deployed()
    await asset1.deployed()

    // initialize pool contract
    poolContract = await upgrades.deployProxy(PoolFactory, [parseEther('0.05'), parseEther('0.0004')], {
      unsafeAllow: ['delegatecall'], // allow unsafe delegate call as SafeERC20 is no upgradable
    })

    // set pool address
    await asset0.setPool(poolContract.address)
    await asset1.setPool(poolContract.address)

    // Add BUSD & USDC assets to pool
    await poolContract.connect(poolOwner).addAsset(token0.address, asset0.address)
    await poolContract.connect(poolOwner).addAsset(token1.address, asset1.address)
  })

  describe('deploy', async function () {
    it('should initialize correctly', async function () {
      expect(await poolContract.ampFactor()).to.be.equal(parseEther('0.05'))
      expect(await poolContract.haircutRate()).to.be.equal(parseEther('0.0004'))
    })
  })

  describe('upgrade', async function () {
    it('should keep storage correctly', async function () {
      await poolContract.setHaircutRate(parseEther('0.0001'))
      await poolContract.connect(poolOwner).setFee(parseEther('0.5'), parseEther('0.5'))

      poolContract = await upgrades.upgradeProxy(poolContract.address, PoolFactory, { unsafeAllow: ['delegatecall'] })

      expect(await poolContract.ampFactor()).to.be.equal(parseEther('0.05'))
      expect(await poolContract.haircutRate()).to.be.equal(parseEther('0.0001'))
      expect(await poolContract.retentionRatio()).to.be.equal(parseEther('0.5'))
      expect(await poolContract.lpDividendRatio()).to.be.equal(parseEther('0.5'))
    })

    it('multiple upgrade should success', async function () {
      poolContract = await upgrades.upgradeProxy(poolContract.address, PoolFactory, { unsafeAllow: ['delegatecall'] })

      poolContract = await upgrades.upgradeProxy(poolContract.address, PoolFactory, { unsafeAllow: ['delegatecall'] })

      poolContract = await upgrades.upgradeProxy(poolContract.address, PoolFactory, { unsafeAllow: ['delegatecall'] })
    })

    it('should not change assets', async function () {
      poolContract = await upgrades.upgradeProxy(poolContract.address, PoolFactory, { unsafeAllow: ['delegatecall'] })
      const fiveSecondsSince = (await latest()).add(5)

      await token0.connect(owner).transfer(users[0].address, parseEther('100'))
      await token0.connect(users[0]).approve(poolContract.address, parseEther('100'))

      // Pool is still the owner of Asset
      await poolContract
        .connect(users[0])
        .deposit(token0.address, parseEther('100'), users[0].address, fiveSecondsSince, false)
    })

    it.skip('change admin', async function () {
      const newPoolOwner = users[10]
      await poolContract.connect(poolOwner).transferOwnership(newPoolOwner.address)

      expect(await poolContract.owner()).to.equal(newPoolOwner.address)
      const newPoolFactoryOwner = await ethers.getContractFactory('Pool', newPoolOwner)
      poolContract = await upgrades.upgradeProxy(poolContract.address, newPoolFactoryOwner, {
        unsafeAllow: ['delegatecall'],
      })

      // should keep ownership
      expect(await poolContract.owner()).to.equal(newPoolOwner.address)
    })

    it('should change implementation address', async function () {
      const implAddr = await users[0].provider?.getStorageAt(poolContract.address, proxyImplAddr)

      await upgrades.upgradeProxy(poolContract.address, DummyPoolFactory, {
        unsafeAllow: ['delegatecall'],
      })

      expect(await users[0]?.provider?.getStorageAt(poolContract.address, proxyImplAddr)).to.not.equal(implAddr)
    })
  })
})
