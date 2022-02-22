import { parseEther } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { BigNumber, Contract, ContractFactory } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { ethers, upgrades } from 'hardhat'

chai.use(solidity)

describe('Asset (proxy)', function () {
  let owner: SignerWithAddress
  let users: SignerWithAddress[]
  let AssetFactory: ContractFactory
  let TestERC20Factory: ContractFactory
  let PoolFactory: ContractFactory
  let token0: Contract
  let token1: Contract
  let asset0: Contract
  let asset1: Contract
  let poolContract: Contract

  beforeEach(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    users = rest

    // Get Factories
    AssetFactory = await ethers.getContractFactory('Asset')
    TestERC20Factory = await ethers.getContractFactory('TestERC20')
    PoolFactory = await ethers.getContractFactory('Pool')

    // Deploy with factories
    token0 = await TestERC20Factory.deploy('Binance USD', 'BUSD', 18, parseUnits('1000000', 18)) // 1 mil BUSD
    token1 = await TestERC20Factory.deploy('Venus USDC', 'vUSDC', 8, parseUnits('10000000', 8))
    asset0 = await AssetFactory.deploy(token0.address, 'Binance USD LP', 'BUSD-LP')
    asset1 = await AssetFactory.deploy(token1.address, 'Venus USD LP', 'vUSDC-LP')

    // wait for transactions to be mined
    await token0.deployTransaction.wait()
    await token1.deployTransaction.wait()
    await asset0.deployTransaction.wait()
    await asset1.deployTransaction.wait()

    // initialize pool contract
    poolContract = await upgrades.deployProxy(PoolFactory, [parseEther('0.05'), parseEther('0.0004')], {
      unsafeAllow: ['delegatecall'],
    })

    // set pool address
    await asset0.setPool(poolContract.address)
    await asset1.setPool(poolContract.address)

    // Add BUSD & USDC assets to pool
    await poolContract.connect(owner).addAsset(token0.address, asset0.address)
    await poolContract.connect(owner).addAsset(token1.address, asset1.address)
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
      await poolContract.setLpDividendRatio(parseEther('0.5'))
      await poolContract.setRetentionRatio(parseEther('0.5'))

      poolContract = await upgrades.upgradeProxy(poolContract.address, PoolFactory, { unsafeAllow: ['delegatecall'] })

      expect(await poolContract.ampFactor()).to.be.equal(parseEther('0.05'))
      expect(await poolContract.haircutRate()).to.be.equal(parseEther('0.0001'))
      expect(await poolContract.retentionRatio()).to.be.equal(parseEther('0.5'))
      expect(await poolContract.lpDividendRatio()).to.be.equal(parseEther('0.5'))
    })
  })
})
