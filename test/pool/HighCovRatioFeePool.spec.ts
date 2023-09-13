import { parseEther, parseUnits } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai from 'chai'

import { BigNumber, Contract, ContractFactory } from 'ethers'
import { ethers } from 'hardhat'
import { near } from '../assertions/near'

const { expect } = chai

chai.use(near)

describe('High Coverage Ratio Pool - Swap', function () {
  let owner: SignerWithAddress
  let users: SignerWithAddress[]

  let AssetFactory: ContractFactory
  let TestERC20Factory: ContractFactory
  let PoolFactory: ContractFactory
  let pool: Contract
  let coreV3: Contract
  let fiveSecondsSince: number

  before(async function () {
    ;[owner, ...users] = await ethers.getSigners()

    // Get Factories
    AssetFactory = await ethers.getContractFactory('Asset')
    TestERC20Factory = await ethers.getContractFactory('TestERC20')
    const CoreV3Factory = await ethers.getContractFactory('CoreV3')
    coreV3 = await CoreV3Factory.deploy()
    PoolFactory = await ethers.getContractFactory('HighCovRatioFeePoolV3', { libraries: { CoreV3: coreV3.address } })
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

  describe('start = 1.5, end = 1.8 - swap, quote and reverse quote', function () {
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

      // quote
      const [quote, fee] = await pool.quotePotentialSwap(token0.address, token1.address, parseUnits('100000', 6))
      expect(quote).equal(parseUnits('48229.70731636', 8))
      expect(fee).equal(parseUnits('48268.30652189', 8))

      // reverse quote
      const [reverseQuote, reverseFee] = await pool.quotePotentialSwap(
        token1.address,
        token0.address,
        parseUnits('-48229.70731636', 8)
      )
      expect(reverseQuote).equal(parseUnits('100000', 6))
      expect(reverseFee).equal(parseUnits('48268.30652189', 8))

      // swap
      const receipt = await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('100000', 6), 0, users[0].address, fiveSecondsSince)

      // 96459 * [1 - (1.65 - 1.5) / (1.8 - 1.5)] (high cov ratio fee) = 48229
      expect(await token1.balanceOf(users[0].address)).equal(parseUnits('48229.70731636', 8))

      await expect(receipt)
        .to.emit(pool, 'SwapV2')
        .withArgs(
          users[0].address,
          token0.address,
          token1.address,
          parseUnits('100000', 6),
          parseUnits('48229.70731636', 8),
          parseUnits('38.59920553', 8).add(parseUnits('48229.70731636', 8)),
          users[0].address
        )
      expect(fee).eq(parseUnits('48229.70731636', 8).add(parseUnits('38.59920553', 8)))
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

      await token0.connect(users[0]).faucet(parseUnits('100000', 6))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      // quote
      const [quote, fee] = await pool.quotePotentialSwap(token0.address, token1.address, parseUnits('100000', 6))
      expect(quote).equal(parseUnits('16044.50486957', 8))
      expect(fee).equal(parseUnits('80261.04656845', 8))

      // reverse quote
      const [reverseQuote, reverseFee] = await pool.quotePotentialSwap(
        token1.address,
        token0.address,
        parseUnits('-16044.50486957', 8)
      )
      // we need less than 100000 as the marginal swap fee when r approach 1.8 is almost 100%
      expect(reverseQuote).equal(parseUnits('99355.893005', 6))
      expect(reverseFee).equal(parseUnits('79644.70566988', 8))

      // swap
      const receipt = await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('100000', 6), 0, users[0].address, fiveSecondsSince)

      // 96266 * [1 - (1.75 - 1.5) / (1.8 - 1.5)] (high cov ratio fee) = 16044
      expect(await token1.balanceOf(users[0].address)).equal(parseUnits('16044.50486957', 8))

      await expect(receipt)
        .to.emit(pool, 'SwapV2')
        .withArgs(
          users[0].address,
          token0.address,
          token1.address,
          parseUnits('100000', 6),
          parseUnits('16044.50486957', 8),
          parseUnits('38.52222057', 8).add(parseUnits('80222.52434788', 8)),
          users[0].address
        )
      expect(fee).eq(parseUnits('38.52222057', 8).add(parseUnits('80222.52434788', 8)))
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

      await token0.connect(users[0]).faucet(parseUnits('200000', 6))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      // quote
      const [quote, fee] = await pool.quotePotentialSwap(token0.address, token1.address, parseUnits('200000', 6))
      expect(quote).equal(parseUnits('63847.82205890', 8))
      expect(fee).equal(parseUnits('127772.29216349', 8))

      // reverse quote
      const [reverseQuote, reverseFee] = await pool.quotePotentialSwap(
        token1.address,
        token0.address,
        parseUnits('-63847.82205890', 8)
      )
      // we need less than 200000 as the marginal swap fee when r approach 1.8 is almost 100%
      expect(reverseQuote).equal(parseUnits('196910.494181', 6))
      expect(reverseFee).equal(parseUnits('124857.26484320', 8))

      // swap
      const receipt = await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('200000', 6), 0, users[0].address, fiveSecondsSince)

      // 191542 * [1 - (1.7 - 1.5) / (1.8 - 1.5)] (high cov ratio fee) = 63848
      expect(await token1.balanceOf(users[0].address)).equal(parseUnits('63847.82205890', 8))

      await expect(receipt)
        .to.emit(pool, 'SwapV2')
        .withArgs(
          users[0].address,
          token0.address,
          token1.address,
          parseUnits('200000', 6),
          parseUnits('63847.82205890', 8),
          parseUnits('76.64804568', 8).add(parseUnits('127695.64411781', 8)),
          users[0].address
        )
      expect(fee).eq(parseUnits('76.64804568', 8).add(parseUnits('127695.64411781', 8)))
    })

    it('from asset: r = 1.5 -> r = 1.7 (18 decimals)', async function () {
      const { token: token0 } = await createAsset(
        ['Binance USD', 'BUSD', 18, parseUnits('1000000', 18)],
        parseEther('1500000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 18, parseUnits('1000000', 18)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await token0.connect(users[0]).faucet(parseUnits('200000', 18))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      // quote
      const [quote, fee] = await pool.quotePotentialSwap(token0.address, token1.address, parseUnits('200000', 18))
      expect(quote).equal(parseUnits('127973.795208341950948787', 18))
      expect(fee).equal(parseUnits('64063.712607297231051213', 18))

      // reverse quote
      const [reverseQuote, reverseFee] = await pool.quotePotentialSwap(
        token1.address,
        token0.address,
        parseUnits('-127973.795208341950948787', 18)
      )
      expect(reverseQuote).equal(parseUnits('199999.999999999999500000', 18))
      expect(reverseFee).equal(parseUnits('64063.712607297231051213', 18))

      // swap
      const receipt = await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('200000', 18), 0, users[0].address, fiveSecondsSince)

      // 189282 * [1 - (1.6 - 1.5) / (1.8 - 1.5)] (high cov ratio fee) = 126188
      expect(await token1.balanceOf(users[0].address)).equal(parseUnits('127973.795208341950948787', 18))

      await expect(receipt)
        .to.emit(pool, 'SwapV2')
        .withArgs(
          users[0].address,
          token0.address,
          token1.address,
          parseUnits('200000', 18),
          parseUnits('127973.795208341950948787', 18),
          parseUnits('76.815003126255672800', 18).add(parseUnits('63986.897604170975378413', 18)),
          users[0].address
        )
      expect(fee).eq(parseUnits('76.815003126255672800', 18).add(parseUnits('63986.897604170975378413', 18)))
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

      // quote
      const [quote, fee] = await pool.quotePotentialSwap(token0.address, token1.address, parseUnits('300000', 6))
      expect(quote).equal(parseUnits('222549.82030921', 8))
      expect(fee).equal(parseUnits('63700.16293879', 8))

      // reverse quote
      const [reverseQuote, reverseFee] = await pool.quotePotentialSwap(
        token1.address,
        token0.address,
        parseUnits('-222549.82030921', 8)
      )
      expect(reverseQuote).equal(parseUnits('300000', 6))
      expect(reverseFee).equal(parseUnits('63700.16293879', 8))

      // swap
      const receipt = await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('300000', 6), 0, users[0].address, fiveSecondsSince)

      // 286135 * [1 - (1.6 - 1.5) / (1.8 - 1.5) * 0.66] (high cov ratio fee) = 222549
      expect(await token1.balanceOf(users[0].address)).equal(parseUnits('222549.82030921', 8))

      await expect(receipt)
        .to.emit(pool, 'SwapV2')
        .withArgs(
          users[0].address,
          token0.address,
          token1.address,
          parseUnits('300000', 6),
          parseUnits('222549.82030921', 8),
          parseUnits('114.49999329', 8).add(parseUnits('63585.66294550', 8)),
          users[0].address
        )
      expect(fee).eq(parseUnits('114.49999329', 8).add(parseUnits('63585.66294550', 8)))
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

      // quote
      const [quote, fee] = await pool.quotePotentialSwap(token0.address, token1.address, parseUnits('100000', 6))
      expect(quote).equal(parseUnits('97315.57802417', 8))
      expect(fee).equal(parseUnits('38.94180793', 8))

      // reverse quote
      const [reverseQuote, reverseFee] = await pool.quotePotentialSwap(
        token1.address,
        token0.address,
        parseUnits('-97315.57802417', 8)
      )
      expect(reverseQuote).equal(parseUnits('99999.999999', 6))
      expect(reverseFee).equal(parseUnits('38.94180793', 8))

      // swap
      const receipt = await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('100000', 6), 0, users[0].address, fiveSecondsSince)

      // 97315 * 1 (high cov ratio fee) = 97315
      expect(await token1.balanceOf(users[0].address)).equal(parseUnits('97315.57802417', 8))

      await expect(receipt)
        .to.emit(pool, 'SwapV2')
        .withArgs(
          users[0].address,
          token0.address,
          token1.address,
          parseUnits('100000', 6),
          parseUnits('97315.57802417', 8),
          parseUnits('38.94180793', 8),
          users[0].address
        )
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

      // reverse quote is rejected
      await expect(
        pool.quotePotentialSwap(token1.address, token0.address, parseUnits('-63861', 8))
      ).to.be.revertedWithCustomError(pool, 'WOMBAT_COV_RATIO_LIMIT_EXCEEDED')

      // swap is rejected
      await expect(
        pool
          .connect(users[0])
          .swap(token0.address, token1.address, parseUnits('200001', 6), 0, users[0].address, fiveSecondsSince)
      ).to.revertedWithCustomError(coreV3, 'CORE_COV_RATIO_LIMIT_EXCEEDED')
    })

    it('from asset: r = 1.4 -> r = 1.8+ (reject)', async function () {
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

      await token0.connect(users[0]).faucet(parseUnits('400001', 6))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      // reverse quote is rejected
      await expect(
        pool.quotePotentialSwap(token1.address, token0.address, parseUnits('-235907', 8))
      ).to.be.revertedWithCustomError(pool, 'WOMBAT_COV_RATIO_LIMIT_EXCEEDED')

      // swap is rejected
      await expect(
        pool
          .connect(users[0])
          .swap(token0.address, token1.address, parseUnits('400001', 6), 0, users[0].address, fiveSecondsSince)
      ).to.revertedWithCustomError(coreV3, 'CORE_COV_RATIO_LIMIT_EXCEEDED')
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

      // reverse quote is rejected
      await expect(
        pool.quotePotentialSwap(token1.address, token0.address, parseUnits('-1', 8))
      ).to.be.revertedWithCustomError(pool, 'WOMBAT_COV_RATIO_LIMIT_EXCEEDED')

      // swap is rejected
      await expect(
        pool
          .connect(users[0])
          .swap(token0.address, token1.address, parseUnits('1', 6), 0, users[0].address, fiveSecondsSince)
      ).to.revertedWithCustomError(coreV3, 'CORE_COV_RATIO_LIMIT_EXCEEDED')
    })

    it('from asset: r = 1.7 -> 1.4 (should not change high cov ratio fee)', async function () {
      const { token: token0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1700000'),
        parseEther('1000000'),
        pool
      )

      await token0.connect(users[0]).faucet(parseUnits('300000', 8))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      // quote
      const [quote, fee] = await pool.quotePotentialSwap(token0.address, token1.address, parseUnits('300000', 6))
      expect(quote).equal(parseUnits('304983.18636529', 8))
      expect(fee).equal(parseUnits('122.04209138', 8))

      // reverse quote
      const [reverseQuote, reverseFee] = await pool.quotePotentialSwap(
        token1.address,
        token0.address,
        parseUnits('-304983.18636529', 8)
      )
      expect(reverseQuote).equal(parseUnits('299999.999999', 6))
      expect(reverseFee).equal(parseUnits('122.04209138', 8))

      // swap
      const receipt = await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('300000', 6), 0, users[0].address, fiveSecondsSince)

      expect(await token1.balanceOf(users[0].address)).equal(parseUnits('304983.18636529', 8))

      await expect(receipt)
        .to.emit(pool, 'SwapV2')
        .withArgs(
          users[0].address,
          token0.address,
          token1.address,
          parseUnits('300000', 6),
          parseUnits('304983.18636529', 8),
          parseUnits('122.04209138', 8),
          users[0].address
        )
    })
  })

  describe('start = 1.5, end = 1.8 - withdraw', function () {
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

  describe('start = 1.5, end = 1.8 - quotePotentialWithdrawFromOtherAsset', function () {
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

      expect(quotedWithdrawl).to.equal(parseUnits('24657.58039437', 8))
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
