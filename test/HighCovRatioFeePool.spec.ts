import { parseEther, parseUnits } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { BigNumber, Contract, ContractFactory } from 'ethers'
import { ethers } from 'hardhat'
import { near } from './assertions/near'

const { expect } = chai
chai.use(solidity)
chai.use(near)

describe('High Coverage Ratio Pool - Swap', function () {
  let owner: SignerWithAddress
  let users: SignerWithAddress[]

  let AssetFactory: ContractFactory
  let TestERC20Factory: ContractFactory
  let PoolFactory: ContractFactory
  let pool: Contract

  let fiveSecondsSince: number

  before(async function () {
    ;[owner, ...users] = await ethers.getSigners()

    const lastBlock = await ethers.provider.getBlock('latest')
    const lastBlockTime = lastBlock.timestamp
    fiveSecondsSince = lastBlockTime + 5 * 1000

    // Get Factories
    AssetFactory = await ethers.getContractFactory('Asset')
    TestERC20Factory = await ethers.getContractFactory('TestERC20')
    PoolFactory = await ethers.getContractFactory('HighCovRatioFeePool')
  })

  beforeEach(async function () {
    pool = await PoolFactory.connect(owner).deploy()

    // initialize pool contract
    await pool.connect(owner).initialize(parseEther('0.05'), parseEther('0.0004'))
    await pool.connect(owner).setFee(0, parseEther('1'))
  })

  const createAsset = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tokenParams: any,
    cash: BigNumber,
    liability: BigNumber,
    pool?: Contract
  ): Promise<{
    token: Contract
    asset: Contract
  }> => {
    const token = await TestERC20Factory.deploy(...tokenParams)
    const asset = await AssetFactory.deploy(token.address, tokenParams[0] + ' LP', tokenParams[1] + '-LP')

    await asset.setPool(owner.address)
    await asset.addCash(cash)
    await asset.addLiability(liability)

    await token.transfer(asset.address, tokenParams[3])

    if (pool) {
      await asset.setPool(pool.address)
      await pool.addAsset(token.address, asset.address)
    }

    return { token, asset }
  }

  describe('start = 1.5, end = 1.8', async function () {
    it('from asset: r = 1.6 -> r = 1.7', async function () {
      const { token: token0, asset: asset0 } = await createAsset(
        ['Binance USD', 'BUSD', 18, parseEther('1000000')],
        parseEther('1600000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1, asset: asset1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await token0.connect(users[0]).faucet(parseEther('1000000'))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseEther('100000'), 0, users[0].address, fiveSecondsSince)

      // 96459 * (1.7-1.5)/(1.8-1.5) (high cov ratio fee) = 32153
      expect(await token1.balanceOf(users[0].address)).near(parseUnits('32153', 8))
    })

    it('from asset: r = 1.5 -> r = 1.7')

    it('from asset: r = 1.4 -> r = 1.7')

    it('from asset: r = 1.6 -> r = 1.8+ (reject)')

    it('from asset: r = 1.8+ -> (reject)')
  })
})
