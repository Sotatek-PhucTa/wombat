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

    // Get Factories
    AssetFactory = await ethers.getContractFactory('Asset')
    TestERC20Factory = await ethers.getContractFactory('TestERC20')
    PoolFactory = await ethers.getContractFactory('HighCovRatioFeePool')
  })

  beforeEach(async function () {
    const lastBlock = await ethers.provider.getBlock('latest')
    const lastBlockTime = lastBlock.timestamp
    fiveSecondsSince = lastBlockTime + 5 * 1000

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
    await asset.mint(owner.address, liability)

    if (pool) {
      await asset.setPool(pool.address)
      await pool.addAsset(token.address, asset.address)
    }

    return { token, asset }
  }

  describe('start = 1.5, end = 1.8 - swap', async function () {
    it('from asset: r = 1.6 -> r = 1.7', async function () {
      const { token: token0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1600000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await token0.connect(users[0]).faucet(parseUnits('100000', 6))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('100000', 6), 0, users[0].address, fiveSecondsSince)

      // 96459 * [1 - (1.65 - 1.5) / (1.8 - 1.5)] (high cov ratio fee) = 48229
      expect(await token1.balanceOf(users[0].address)).near(parseUnits('48229', 8))
    })

    it('from asset: r = 1.7 -> r = 1.8', async function () {
      const { token: token0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1700000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await token0.connect(users[0]).faucet(parseUnits('99999', 6))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('99999', 6), 0, users[0].address, fiveSecondsSince)

      // 96266 * [1 - (1.75 - 1.5) / (1.8 - 1.5)] (high cov ratio fee) = 16044
      expect(await token1.balanceOf(users[0].address)).near(parseUnits('16044', 8))
    })

    it('from asset: r = 1.6 -> r = 1.8', async function () {
      const { token: token0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1600000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await token0.connect(users[0]).faucet(parseUnits('199999', 6))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('199999', 6), 0, users[0].address, fiveSecondsSince)

      // 191542 * [1 - (1.7 - 1.5) / (1.8 - 1.5)] (high cov ratio fee) = 63848
      expect(await token1.balanceOf(users[0].address)).near(parseUnits('63848', 8))
    })

    it('from asset: r = 1.5 -> r = 1.7', async function () {
      const { token: token0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1500000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await token0.connect(users[0]).faucet(parseUnits('200000', 6))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('200000', 6), 0, users[0].address, fiveSecondsSince)

      // 191194?? * [1 - (1.6 - 1.5) / (1.8 - 1.5)] (high cov ratio fee) = 126188
      expect(await token1.balanceOf(users[0].address)).near(parseUnits('127973', 8))
    })

    it('from asset: r = 1.4 -> r = 1.7', async function () {
      const { token: token0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1400000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await token0.connect(users[0]).faucet(parseUnits('300000', 6))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('300000', 6), 0, users[0].address, fiveSecondsSince)

      // 286135 * [1 - (1.6 - 1.5) / (1.8 - 1.5) * 0.66] (high cov ratio fee) = 222549
      expect(await token1.balanceOf(users[0].address)).near(parseUnits('222549', 8))
    })

    it('from asset: r = 1.3 -> r = 1.4', async function () {
      const { token: token0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1300000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await token0.connect(users[0]).faucet(parseUnits('100000', 6))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('100000', 6), 0, users[0].address, fiveSecondsSince)

      // 97315 * 1 (high cov ratio fee) = 97315
      expect(await token1.balanceOf(users[0].address)).near(parseUnits('97315', 8))
    })

    it('from asset: r = 1.6 -> r = 1.8+ (reject)', async function () {
      const { token: token0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1600000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await token0.connect(users[0]).faucet(parseUnits('200001', 6))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      // rejected
      await expect(
        pool
          .connect(users[0])
          .swap(token0.address, token1.address, parseUnits('200001', 6), 0, users[0].address, fiveSecondsSince)
      ).to.reverted
    })

    it('from asset: r = 1.8+ -> (reject)', async function () {
      const { token: token0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1800000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await token0.connect(users[0]).faucet(parseUnits('1', 6))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      // rejected
      await expect(
        pool
          .connect(users[0])
          .swap(token0.address, token1.address, parseUnits('1', 6), 0, users[0].address, fiveSecondsSince)
      ).to.reverted
    })

    it('from asset: r = 1.7 -> 1.4 (should not change high cov ratio fee)', async function () {
      const { token: token0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1700000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await token1.connect(users[0]).faucet(parseUnits('300000', 8))
      await token1.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      await pool
        .connect(users[0])
        .swap(token1.address, token0.address, parseUnits('300000', 8), 0, users[0].address, fiveSecondsSince)

      expect(await token0.balanceOf(users[0].address)).near(parseUnits('304983.186365', 6))
    })

    it('from asset: r = 1.7 - withdraw should not charge high cov ratio fee', async function () {
      const { token: token0, asset: asset0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1700000'),
        parseEther('1000000'),
        pool
      )

      await asset0.transfer(users[0].address, parseEther('100000'))
      await asset0.connect(users[0]).approve(pool.address, parseEther('100000'))

      const expectedAmount = parseUnits('99113.285043', 6)
      const withdrawAmount = await pool
        .connect(users[0])
        .callStatic.withdraw(token0.address, parseEther('100000'), 0, owner.address, fiveSecondsSince)

      expect(withdrawAmount).to.equal(expectedAmount)
    })
  })

  describe('start = 1.5, end = 1.8 - quotePotentialWithdrawFromOtherAsset', async function () {
    it('from asset: r = 1.6 -> r = 1.7', async function () {
      const { token: token0, asset: asset0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1600000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await asset0.transfer(users[0].address, parseEther('100000'))
      await asset0.connect(users[0]).approve(pool.address, parseEther('100000'))

      const [quotedWithdrawl] = await pool.quotePotentialWithdrawFromOtherAsset(
        token0.address,
        token1.address,
        parseEther('100000')
      )

      const expectedAmount = parseUnits('24657.58039438', 8)
      expect(quotedWithdrawl).to.equal(expectedAmount)

      const withdrawAmount = await pool
        .connect(users[0])
        .callStatic.withdrawFromOtherAsset(
          token0.address,
          token1.address,
          parseEther('100000'),
          0,
          owner.address,
          fiveSecondsSince
        )

      // 0.00000001 difference in value! It probably comes from some rounding error
      expect(withdrawAmount).to.equal(parseUnits('24657.58039437', 8))
    })

    it('from asset: r = 0.8 -> r = 0.9', async function () {
      const { token: token0, asset: asset0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('800000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await asset0.transfer(users[0].address, parseEther('100000'))
      await asset0.connect(users[0]).approve(pool.address, parseEther('100000'))

      const [quotedWithdrawl] = await pool.quotePotentialWithdrawFromOtherAsset(
        token0.address,
        token1.address,
        parseEther('100000')
      )

      const expectedAmount = parseUnits('101202.13561677', 8)
      expect(quotedWithdrawl).to.equal(expectedAmount)

      const withdrawAmount = await pool
        .connect(users[0])
        .callStatic.withdrawFromOtherAsset(
          token0.address,
          token1.address,
          parseEther('100000'),
          0,
          owner.address,
          fiveSecondsSince
        )

      expect(withdrawAmount).to.equal(expectedAmount)
    })

    it('from asset: r = 1.4 -> r = 1.6', async function () {
      const { token: token0, asset: asset0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1400000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await asset0.transfer(users[0].address, parseEther('200000'))
      await asset0.connect(users[0]).approve(pool.address, parseEther('200000'))

      const [quotedWithdrawl] = await pool.quotePotentialWithdrawFromOtherAsset(
        token0.address,
        token1.address,
        parseEther('200000')
      )

      const expectedAmount = parseUnits('111029.82818996', 8)
      expect(quotedWithdrawl).to.equal(expectedAmount)

      const withdrawAmount = await pool
        .connect(users[0])
        .callStatic.withdrawFromOtherAsset(
          token0.address,
          token1.address,
          parseEther('200000'),
          0,
          owner.address,
          fiveSecondsSince
        )

      expect(withdrawAmount).to.equal(expectedAmount)
    })
  })
})
