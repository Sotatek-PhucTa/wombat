import { parseEther, parseUnits } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai from 'chai'

import { BigNumber, Contract, ContractFactory } from 'ethers'
import { ethers } from 'hardhat'

const { expect } = chai

describe('DynamicPool', function () {
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
    AssetFactory = await ethers.getContractFactory('MockStakedEth')
    TestERC20Factory = await ethers.getContractFactory('TestERC20')
    const CoreV3Factory = await ethers.getContractFactory('CoreV3')
    const coreV3 = await CoreV3Factory.deploy()
    PoolFactory = await ethers.getContractFactory('DynamicPoolV3', { libraries: { CoreV3: coreV3.address } })
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

  describe('price of token B = 1 (test backward compatibility)', function () {
    it('swap', async function () {
      const { token: token0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1000000'),
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
      const [quote, haircut] = await pool.quotePotentialSwap(token0.address, token1.address, parseUnits('100000', 6))
      expect(quote).equal(parseUnits('99008.94795060', 8))
      expect(haircut).equal(parseUnits('39.61942695', 8))

      // reverse quote
      const [reverseQuote, reverseHaircut] = await pool.quotePotentialSwap(
        token1.address,
        token0.address,
        parseUnits('-99008.94795060', 8)
      )
      expect(reverseQuote).equal(parseUnits('99999.999999', 6))
      expect(reverseHaircut).equal(parseUnits('39.61942695', 8))

      // swap
      await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('100000', 6), 0, users[0].address, fiveSecondsSince)

      expect(await token1.balanceOf(users[0].address)).equal(parseUnits('99008.94795060', 8))
    })

    it('deposit', async function () {
      const { token: token0 } = await createAsset(
        ['Binance USD', 'BUSD', 8, parseUnits('1000000', 8)],
        parseEther('600000'),
        parseEther('1000000'),
        pool
      )

      await token0.connect(users[0]).faucet(parseUnits('1000', 8))
      await token0.connect(users[0]).approve(pool.address, parseUnits('1000', 8))

      const receipt = await pool
        .connect(users[0])
        .deposit(token0.address, parseUnits('1000', 8), 0, users[0].address, fiveSecondsSince, false)

      await expect(receipt)
        .to.emit(pool, 'Deposit')
        .withArgs(
          users[0].address,
          token0.address,
          parseUnits('1000', 8),
          parseEther('1019.869329548946422920'),
          users[0].address
        )
    })

    it('withdraw', async function () {
      const { token: token0, asset: asset0 } = await createAsset(
        ['Binance USD', 'BUSD', 8, parseUnits('1000000', 8)],
        parseEther('600000'),
        parseEther('1000000'),
        pool
      )

      await asset0.transfer(users[0].address, parseEther('100000'))
      await asset0.connect(users[0]).approve(pool.address, parseEther('100000'))

      const expectedAmount = parseUnits('97703.64252047', 8)
      const withdrawAmount = await pool
        .connect(users[0])
        .callStatic.withdraw(token0.address, parseEther('100000'), 0, owner.address, fiveSecondsSince)

      expect(withdrawAmount).to.equal(expectedAmount)
    })

    it('withdraw from other asset', async function () {
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
  })

  describe('price of token B: 1.0 => 1.2', function () {
    it('swap (dynamic to asset)', async function () {
      const { token: token0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1, asset: asset1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      await token0.connect(users[0]).faucet(parseUnits('100000', 6))
      await token0.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)
      await token1.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      // swap
      await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('100000', 6), 0, users[0].address, fiveSecondsSince)

      expect(await token1.balanceOf(users[0].address)).equal(parseUnits('99008.94795060', 8))

      // time pass, increase price of token1
      await asset1.setRelativePrice(parseEther('1.2'))

      await pool
        .connect(users[0])
        .swap(token1.address, token0.address, parseUnits('99008.94795060', 8), 0, users[0].address, fiveSecondsSince)

      // The user should gets more than 10k, as the value of token1 increases
      expect(await token0.balanceOf(users[0].address)).equal(parseUnits('119798.801202', 6))

      // globalEquilCovRatio should have changed slightly
      expect(await pool.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('0.990952379152868904'),
        parseEther('2069090.909090909090000000'),
      ])
    })

    it('swap (dynamic from asset)', async function () {
      const { token: token0, asset: asset0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('1000000'),
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
      await token1.connect(users[0]).approve(pool.address, ethers.constants.MaxUint256)

      // swap
      await pool
        .connect(users[0])
        .swap(token0.address, token1.address, parseUnits('100000', 6), 0, users[0].address, fiveSecondsSince)

      expect(await token1.balanceOf(users[0].address)).equal(parseUnits('99008.94795060', 8))

      // time pass, increase price of token0
      await asset0.setRelativePrice(parseEther('1.2'))

      await pool
        .connect(users[0])
        .swap(token1.address, token0.address, parseUnits('99008.94795060', 8), 0, users[0].address, fiveSecondsSince)

      // The user should gets less than 10k, as the value of token0 increases
      expect(await token0.balanceOf(users[0].address)).equal(parseUnits('83326.153169', 6))

      // globalEquilCovRatio should have changed slightly
      expect(await pool.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('1.009055424259485054'),
        parseEther('2110909.090909090910200000'),
      ])
    })

    it('deposit', async function () {
      const { token: token0, asset: asset0 } = await createAsset(
        ['Binance USD', 'BUSD', 8, parseUnits('1000000', 8)],
        parseEther('600000'),
        parseEther('1000000'),
        pool
      )

      await token0.connect(users[0]).faucet(parseUnits('1000', 8))
      await token0.connect(users[0]).approve(pool.address, parseUnits('1000', 8))

      // increase price of token0, deposit should not change
      await asset0.setRelativePrice(parseEther('1.2'))

      const receipt = await pool
        .connect(users[0])
        .deposit(token0.address, parseUnits('1000', 8), 0, users[0].address, fiveSecondsSince, false)

      await expect(receipt)
        .to.emit(pool, 'Deposit')
        .withArgs(
          users[0].address,
          token0.address,
          parseUnits('1000', 8),
          parseEther('1019.869329548946422920'),
          users[0].address
        )
    })

    it('withdraw', async function () {
      const { token: token0, asset: asset0 } = await createAsset(
        ['Binance USD', 'BUSD', 8, parseUnits('1000000', 8)],
        parseEther('600000'),
        parseEther('1000000'),
        pool
      )

      // increase price of token0, withdraw should not change
      await asset0.setRelativePrice(parseEther('1.2'))

      await asset0.transfer(users[0].address, parseEther('100000'))
      await asset0.connect(users[0]).approve(pool.address, parseEther('100000'))

      const expectedAmount = parseUnits('97703.64252047', 8)
      const withdrawAmount = await pool
        .connect(users[0])
        .callStatic.withdraw(token0.address, parseEther('100000'), 0, owner.address, fiveSecondsSince)

      expect(withdrawAmount).to.equal(expectedAmount)
    })

    it('withdraw from other asset', async function () {
      const { token: token0, asset: asset0 } = await createAsset(
        ['Binance USD', 'BUSD', 6, parseUnits('1000000', 6)],
        parseEther('800000'),
        parseEther('1000000'),
        pool
      )

      const { token: token1, asset: asset1 } = await createAsset(
        ['Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)],
        parseEther('1000000'),
        parseEther('1000000'),
        pool
      )

      // increase price of token0 and token 1
      await asset0.setRelativePrice(parseEther('1.2'))
      await asset1.setRelativePrice(parseEther('1.1'))

      await asset0.transfer(users[0].address, parseEther('100000'))
      await asset0.connect(users[0]).approve(pool.address, parseEther('100000'))

      const [quotedWithdrawl] = await pool.quotePotentialWithdrawFromOtherAsset(
        token0.address,
        token1.address,
        parseEther('100000')
      )

      const expectedAmount = parseUnits('110342.55792125', 8)
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
  })
})
