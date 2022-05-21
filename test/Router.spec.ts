import { ethers } from 'hardhat'
import { parseEther, parseUnits } from '@ethersproject/units'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { Contract, ContractFactory } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expectAssetValues } from './helpers/helper'

const { expect } = chai
chai.use(solidity)

describe('Wombat Router01', function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let AssetFactory: ContractFactory
  let TestERC20Factory: ContractFactory
  let PoolFactory: ContractFactory
  let Router: ContractFactory
  let pool1: Contract
  let pool2: Contract
  let pool3: Contract
  let BUSD: Contract
  let USDC: Contract
  let USDT: Contract
  let vUSDC: Contract
  let vUSDT: Contract
  let UST: Contract
  let assetBUSD: Contract
  let assetBUSD2: Contract
  let assetUSDC: Contract
  let assetUSDT: Contract
  let assetvUSDC: Contract
  let assetvUSDT: Contract
  let assetUST: Contract
  let assetUST2: Contract
  let lastBlockTime: number
  let fiveSecondsSince: number
  let fiveSecondsAgo: number

  beforeEach(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    user1 = rest[0]

    // get last block time
    const lastBlock = await ethers.provider.getBlock('latest')
    lastBlockTime = lastBlock.timestamp
    fiveSecondsSince = lastBlockTime + 5 * 1000
    fiveSecondsAgo = lastBlockTime - 5 * 1000

    // Get Factories
    AssetFactory = await ethers.getContractFactory('Asset')
    TestERC20Factory = await ethers.getContractFactory('TestERC20')
    PoolFactory = await ethers.getContractFactory('Pool')
    Router = await ethers.getContractFactory('WombatRouter')

    // Deploy with factories
    BUSD = await TestERC20Factory.deploy('Binance USD', 'BUSD', 18, parseUnits('1000000', 18)) // 1 mil BUSD
    USDC = await TestERC20Factory.deploy('USD Coin', 'USDC', 18, parseUnits('1000000', 18)) // 1 mil USDC
    USDT = await TestERC20Factory.deploy('USD Tether', 'USDT', 18, parseUnits('1000000', 18)) // 1 mil USDT
    vUSDC = await TestERC20Factory.deploy('Venus USDC', 'vUSDC', 8, parseUnits('1000000', 8)) // 1 mil vUSDC
    vUSDT = await TestERC20Factory.deploy('Venus USDT', 'vUSDT', 8, parseUnits('1000000', 8)) // 1 mil vUSDT
    UST = await TestERC20Factory.deploy('TerraUSD', 'UST', 18, parseUnits('1000000', 18)) // 1 mil UST
    assetBUSD = await AssetFactory.deploy(BUSD.address, 'Binance USD LP 1', 'BUSD-LP01')
    assetBUSD2 = await AssetFactory.deploy(BUSD.address, 'Binance USD LP 2', 'BUSD-LP02')
    assetUSDC = await AssetFactory.deploy(USDC.address, 'USD Coin LP', 'USDC-LP')
    assetUSDT = await AssetFactory.deploy(USDT.address, 'USD Tether LP', 'USDT-LP')
    assetvUSDC = await AssetFactory.deploy(vUSDC.address, 'Venus USDC LP', 'vUSDC-LP')
    assetvUSDT = await AssetFactory.deploy(vUSDT.address, 'Venus USDT LP', 'vUSDT-LP')
    assetUST = await AssetFactory.deploy(UST.address, 'TerraUST LP', 'UST-LP')
    assetUST2 = await AssetFactory.deploy(UST.address, 'TerraUST LP 2', 'UST-LP02')

    pool1 = await PoolFactory.connect(owner).deploy() // Main Pool
    pool2 = await PoolFactory.connect(owner).deploy() // Alt Pool 1
    pool3 = await PoolFactory.connect(owner).deploy() // Alt Pool 2

    // wait for transactions to be mined
    await BUSD.deployTransaction.wait()
    await USDC.deployTransaction.wait()
    await USDT.deployTransaction.wait()
    await vUSDC.deployTransaction.wait()
    await vUSDT.deployTransaction.wait()
    await UST.deployTransaction.wait()

    await assetBUSD.deployTransaction.wait()
    await assetBUSD2.deployTransaction.wait()
    await assetUSDC.deployTransaction.wait()
    await assetUSDT.deployTransaction.wait()
    await assetvUSDC.deployTransaction.wait()
    await assetvUSDT.deployTransaction.wait()
    await assetUST.deployTransaction.wait()
    await assetUST2.deployTransaction.wait()

    await pool1.deployTransaction.wait()
    await pool2.deployTransaction.wait()
    await pool3.deployTransaction.wait()

    // set main pool address
    await assetBUSD.setPool(pool1.address)
    await assetUSDC.setPool(pool1.address)
    await assetUSDT.setPool(pool1.address)

    // set alt pool 1 address
    await assetBUSD2.setPool(pool2.address)
    await assetUST.setPool(pool2.address)

    // set alt pool 2 address
    await assetUST2.setPool(pool3.address)
    await assetvUSDC.setPool(pool3.address)
    await assetvUSDT.setPool(pool3.address)

    // initialize pool contract
    pool1.connect(owner).initialize(parseEther('0.05'), parseEther('0.0004'))
    pool2.connect(owner).initialize(parseEther('0.05'), parseEther('0.0004'))
    pool3.connect(owner).initialize(parseEther('0.05'), parseEther('0.0004'))

    // Add BUSD & USDC & USDT assets to main pool
    await pool1.connect(owner).addAsset(BUSD.address, assetBUSD.address)
    await pool1.connect(owner).addAsset(USDC.address, assetUSDC.address)
    await pool1.connect(owner).addAsset(USDT.address, assetUSDT.address)

    // Add BUSD and UST assets to alt pool 1
    await pool2.connect(owner).addAsset(BUSD.address, assetBUSD2.address)
    await pool2.connect(owner).addAsset(UST.address, assetUST.address)

    // Add UST & vUSDC & vUSDT assets to alt pool 2
    await pool3.connect(owner).addAsset(UST.address, assetUST2.address)
    await pool3.connect(owner).addAsset(vUSDC.address, assetvUSDC.address)
    await pool3.connect(owner).addAsset(vUSDT.address, assetvUSDT.address)

    // deploy Router
    this.router = await Router.deploy()
    await this.router.deployTransaction.wait()

    // IMPORTANT FOR THE ROUTER TO WORK EFFICIENTLY
    // approve pool spending tokens from router
    await this.router.connect(owner).approveSpendingByPool([BUSD.address, USDC.address, USDT.address], pool1.address)

    await this.router.connect(owner).approveSpendingByPool([BUSD.address, UST.address], pool2.address)

    await this.router.connect(owner).approveSpendingByPool([UST.address, vUSDC.address, vUSDT.address], pool3.address)
  })
  beforeEach(async function () {
    // Transfer 100k of stables to user1
    await BUSD.connect(owner).transfer(user1.address, parseEther('200000'))
    await USDC.connect(owner).transfer(user1.address, parseEther('100000'))
    await USDT.connect(owner).transfer(user1.address, parseEther('100000'))
    await vUSDC.connect(owner).transfer(user1.address, parseUnits('100000', 8))
    await vUSDT.connect(owner).transfer(user1.address, parseUnits('100000', 8))
    await UST.connect(owner).transfer(user1.address, parseEther('200000'))

    // Approve max allowance of tokens from users to pool
    await BUSD.connect(user1).approve(pool1.address, ethers.constants.MaxUint256)
    await USDC.connect(user1).approve(pool1.address, ethers.constants.MaxUint256)
    await USDT.connect(user1).approve(pool1.address, ethers.constants.MaxUint256)

    await BUSD.connect(user1).approve(pool2.address, ethers.constants.MaxUint256)
    await UST.connect(user1).approve(pool2.address, ethers.constants.MaxUint256)

    await UST.connect(user1).approve(pool3.address, ethers.constants.MaxUint256)
    await vUSDC.connect(user1).approve(pool3.address, ethers.constants.MaxUint256)
    await vUSDT.connect(user1).approve(pool3.address, ethers.constants.MaxUint256)

    // deposit
    await pool1.connect(user1).deposit(BUSD.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)
    await pool1.connect(user1).deposit(USDC.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)
    await pool1.connect(user1).deposit(USDT.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)

    await pool2.connect(user1).deposit(BUSD.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)
    await pool2.connect(user1).deposit(UST.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)

    await pool3.connect(user1).deposit(UST.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)
    await pool3.connect(user1).deposit(vUSDC.address, parseUnits('10000', 8), 0, user1.address, fiveSecondsSince, false)
    await pool3.connect(user1).deposit(vUSDT.address, parseUnits('10000', 8), 0, user1.address, fiveSecondsSince, false)
  })

  describe('Router', function () {
    it('reverts if expired', async function () {
      await BUSD.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)
      // swap via router
      await expect(
        this.router.connect(user1).swapTokensForTokens(
          [BUSD.address, USDT.address],
          [pool1.address],
          parseEther('100'),
          parseEther('90'), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsAgo
        )
      ).to.be.revertedWith('expired')
    })

    it('reverts if invalid from amount', async function () {
      await BUSD.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      await expect(
        this.router.connect(user1).quotePotentialSwaps([BUSD.address, USDT.address], [pool1.address], 0)
      ).to.be.revertedWith('invalid from amount')

      // swap via router
      await expect(
        this.router
          .connect(user1)
          .swapTokensForTokens([BUSD.address, USDT.address], [pool1.address], 0, 0, user1.address, fiveSecondsSince)
      ).to.be.revertedWith('invalid from amount')
    })

    it('reverts if invalid token path', async function () {
      await BUSD.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      await expect(
        this.router.connect(user1).quotePotentialSwaps([BUSD.address], [pool1.address], parseEther('100'))
      ).to.be.revertedWith('invalid token path')

      // swap via router
      await expect(
        this.router
          .connect(user1)
          .swapTokensForTokens(
            [BUSD.address],
            [pool1.address],
            parseEther('100'),
            parseEther('90'),
            user1.address,
            fiveSecondsSince
          )
      ).to.be.revertedWith('invalid token path')
    })

    it('reverts if invalid token path', async function () {
      await BUSD.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      await expect(
        this.router
          .connect(user1)
          .quotePotentialSwaps([BUSD.address, USDT.address], [pool1.address, pool1.address], parseEther('100'))
      ).to.be.revertedWith('invalid pool path')

      // swap via router
      await expect(
        this.router
          .connect(user1)
          .swapTokensForTokens(
            [BUSD.address, USDT.address],
            [pool1.address, pool1.address],
            parseEther('100'),
            parseEther('90'),
            user1.address,
            fiveSecondsSince
          )
      ).to.be.revertedWith('invalid pool path')
    })

    it('reverts if zero address', async function () {
      await BUSD.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)
      // swap via router
      await expect(
        this.router
          .connect(user1)
          .swapTokensForTokens(
            [BUSD.address, USDT.address],
            [pool1.address],
            parseEther('100'),
            parseEther('90'),
            '0x0000000000000000000000000000000000000000',
            fiveSecondsSince
          )
      ).to.be.revertedWith('zero address')
    })

    it('reverts if amountOut too low', async function () {
      await BUSD.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)
      // swap via router
      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps([BUSD.address, USDT.address], [pool1.address], parseEther('100'))

      await expect(
        this.router
          .connect(user1)
          .swapTokensForTokens(
            [BUSD.address, USDT.address],
            [pool1.address],
            parseEther('100'),
            quotedAmount.add(parseEther('0.000000001')),
            user1.address,
            fiveSecondsSince
          )
      ).to.be.revertedWith('amountOut too low')
    })
  })

  describe('Router Swap', function () {
    it('works (BUSD -> USDT) with haircut fees in same pool', async function () {
      const beforeFromBalance = await BUSD.balanceOf(user1.address)
      const beforeToBalance = await USDT.balanceOf(user1.address)

      await BUSD.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps([BUSD.address, USDT.address], [pool1.address], parseEther('100'))
      // swap via router
      const receipt = await this.router.connect(user1).swapTokensForTokens(
        [BUSD.address, USDT.address],
        [pool1.address],
        parseEther('100'),
        parseEther('90'), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await BUSD.balanceOf(user1.address)
      const afterToBalance = await USDT.balanceOf(user1.address)
      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)
      expect(tokenSent).to.be.equal(parseEther('-100'))
      expect(tokenGot).to.be.equal(parseEther('99.864882399989350224'))

      //check if token got is equal to token quoted
      expect(tokenGot).to.be.equal(quotedAmount)

      // check assets post swap positions
      await expectAssetValues(assetBUSD, 18, { cash: '10100', liability: '10000', tokenBN: '10100' })
      await expectAssetValues(assetUSDT, 18, {
        cash: '9900.095155662275560000',
        liability: '10000',
        tokenBN: '9900.135117600010649776',
      })

      expect(receipt)
        .to.emit(pool1, 'Swap')
        .withArgs(
          this.router.address,
          BUSD.address,
          USDT.address,
          parseEther('100'),
          parseEther('99.864882399989350224'),
          user1.address
        )

      expect(tokenSent.add(await assetBUSD.cash())).to.be.equal(parseEther('10000'))
      expect(tokenGot.add(await assetUSDT.cash())).to.be.equal(parseEther('9999.960038062264910224'))
    })

    it('works (BUSD -> USDT) without haircut fees in same pool', async function () {
      // set haircut rate to 0
      pool1.connect(owner).setHaircutRate(0)

      const beforeFromBalance = await BUSD.balanceOf(user1.address)
      const beforeToBalance = await USDT.balanceOf(user1.address)

      await BUSD.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps([BUSD.address, USDT.address], [pool1.address], parseEther('100'))
      // swap via router
      const receipt = await this.router.connect(user1).swapTokensForTokens(
        [BUSD.address, USDT.address],
        [pool1.address],
        parseEther('100'),
        parseEther('90'), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await BUSD.balanceOf(user1.address)
      const afterToBalance = await USDT.balanceOf(user1.address)
      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)
      expect(tokenSent).to.be.equal(parseEther('-100'))
      expect(tokenGot).to.be.equal(parseEther('99.904844337724440000'))

      //check if token got is equal to token quoted
      expect(tokenGot).to.be.equal(quotedAmount)

      // check assets post swap positions
      await expectAssetValues(assetBUSD, 18, {
        cash: '10100',
        liability: '10000',
        tokenBN: '10100',
      })

      await expectAssetValues(assetUSDT, 18, {
        cash: '9900.095155662275560000',
        liability: '10000',
        tokenBN: '9900.095155662275560000',
      })

      expect(receipt)
        .to.emit(pool1, 'Swap')
        .withArgs(
          this.router.address,
          BUSD.address,
          USDT.address,
          parseEther('100'),
          parseEther('99.904844337724440000'),
          user1.address
        )

      expect(tokenSent.add(await assetBUSD.cash())).to.be.equal(parseEther('10000'))
      expect(tokenGot.add(await assetUSDT.cash())).to.be.equal(parseEther('10000'))
    })

    it('works (USDT -> BUSD -> UST) with haircut fees with 2 pools', async function () {
      const beforeFromBalance = await USDT.balanceOf(user1.address)
      const beforeToBalance = await UST.balanceOf(user1.address)

      await USDT.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps(
          [USDT.address, BUSD.address, UST.address],
          [pool1.address, pool2.address],
          parseEther('100')
        )

      // swap via router
      const receipt = await this.router.connect(user1).swapTokensForTokens(
        [USDT.address, BUSD.address, UST.address],
        [pool1.address, pool2.address],
        parseEther('100'),
        parseEther('90'), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await USDT.balanceOf(user1.address)
      const afterToBalance = await UST.balanceOf(user1.address)
      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)
      expect(tokenSent).to.be.equal(parseEther('-100'))
      expect(tokenGot).to.be.equal(parseEther('99.730075614659868756'))

      //check if token got is equal to token quoted
      expect(tokenGot).to.be.equal(quotedAmount)

      // check assets post swap positions
      await expectAssetValues(assetUSDT, 18, { cash: '10100', liability: '10000', tokenBN: '10100' })
      await expectAssetValues(assetBUSD, 18, {
        cash: '9900.09515566227556',
        liability: '10000',
        tokenBN: '9900.135117600010649776',
      })
      await expectAssetValues(assetBUSD2, 18, {
        cash: '10099.864882399989350224',
        liability: '10000',
        tokenBN: '10099.864882399989350224',
      })
      await expectAssetValues(assetUST, 18, {
        cash: '9900.23001639189689',
        liability: '10000',
        tokenBN: '9900.269924385340131244',
      })

      expect(receipt)
        .to.emit(pool1, 'Swap')
        .withArgs(
          this.router.address,
          USDT.address,
          BUSD.address,
          parseEther('100'),
          parseEther('99.864882399989350224'),
          this.router.address
        )

      expect(receipt)
        .to.emit(pool2, 'Swap')
        .withArgs(
          this.router.address,
          BUSD.address,
          UST.address,
          parseEther('99.864882399989350224'),
          parseEther('99.730075614659868756'),
          user1.address
        )
      expect(tokenSent.add(await assetUSDT.cash())).to.be.equal(parseEther('10000'))
      expect(tokenGot.add(await assetUST.cash())).to.be.equal(parseEther('9999.960092006556758756'))
    })

    it('works (USDT -> BUSD -> UST) without haircut fees with 2 pools', async function () {
      // set haircut rate to 0
      pool1.connect(owner).setHaircutRate(0)
      pool2.connect(owner).setHaircutRate(0)
      const beforeFromBalance = await USDT.balanceOf(user1.address)
      const beforeToBalance = await UST.balanceOf(user1.address)

      await USDT.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps(
          [USDT.address, BUSD.address, UST.address],
          [pool1.address, pool2.address],
          parseEther('100')
        )

      // swap via router
      const receipt = await this.router.connect(user1).swapTokensForTokens(
        [USDT.address, BUSD.address, UST.address],
        [pool1.address, pool2.address],
        parseEther('100'),
        parseEther('90'), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await USDT.balanceOf(user1.address)
      const afterToBalance = await UST.balanceOf(user1.address)
      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)
      expect(tokenSent).to.be.equal(parseEther('-100'))
      expect(tokenGot).to.be.equal(parseEther('99.80986961082596'))

      //check if token got is equal to token quoted
      expect(tokenGot).to.be.equal(quotedAmount)

      // check assets post swap positions
      await expectAssetValues(assetUSDT, 18, { cash: '10100', liability: '10000', tokenBN: '10100' })
      await expectAssetValues(assetBUSD, 18, {
        cash: '9900.09515566227556',
        liability: '10000',
        tokenBN: '9900.09515566227556',
      })
      await expectAssetValues(assetBUSD2, 18, {
        cash: '10099.90484433772444',
        liability: '10000',
        tokenBN: '10099.90484433772444',
      })
      await expectAssetValues(assetUST, 18, {
        cash: '9900.19013038917404',
        liability: '10000',
        tokenBN: '9900.19013038917404',
      })

      expect(receipt)
        .to.emit(pool1, 'Swap')
        .withArgs(
          this.router.address,
          USDT.address,
          BUSD.address,
          parseEther('100'),
          parseEther('99.90484433772444'),
          this.router.address
        )

      expect(receipt)
        .to.emit(pool2, 'Swap')
        .withArgs(
          this.router.address,
          BUSD.address,
          UST.address,
          parseEther('99.90484433772444'),
          parseEther('99.80986961082596'),
          user1.address
        )
      expect(tokenSent.add(await assetUSDT.cash())).to.be.equal(parseEther('10000'))
      expect(tokenGot.add(await assetUST.cash())).to.be.equal(parseEther('10000'))
    })

    it('works (USDT -> BUSD -> UST -> vUSDC) with haircut fees with 3 pools', async function () {
      const beforeFromBalance = await USDT.balanceOf(user1.address)
      const beforeToBalance = await vUSDC.balanceOf(user1.address)

      await USDT.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps(
          [USDT.address, BUSD.address, UST.address, vUSDC.address],
          [pool1.address, pool2.address, pool3.address],
          parseEther('100')
        )

      // swap via router
      const receipt = await this.router.connect(user1).swapTokensForTokens(
        [USDT.address, BUSD.address, UST.address, vUSDC.address],
        [pool1.address, pool2.address, pool3.address],
        parseEther('100'),
        parseUnits('90', 8), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await USDT.balanceOf(user1.address)
      const afterToBalance = await vUSDC.balanceOf(user1.address)
      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)
      expect(tokenSent).to.be.equal(parseEther('-100'))
      expect(tokenGot).to.be.equal(parseUnits('99.59557858', 8))

      //check if token got is equal to token quoted
      expect(tokenGot).to.be.equal(quotedAmount)

      // check assets post swap positions
      await expectAssetValues(assetUSDT, 18, { cash: '10100', liability: '10000', tokenBN: '10100' })
      await expectAssetValues(assetBUSD, 18, {
        cash: '9900.09515566227556',
        liability: '10000',
        tokenBN: '9900.135117600010649776',
      })
      await expectAssetValues(assetBUSD2, 18, {
        cash: '10099.864882399989350224',
        liability: '10000',
        tokenBN: '10099.864882399989350224',
      })
      await expectAssetValues(assetUST, 18, {
        cash: '9900.23001639189689',
        liability: '10000',
        tokenBN: '9900.269924385340131244',
      })
      await expectAssetValues(assetUST2, 18, {
        cash: '10099.730075614659868756',
        liability: '10000',
        tokenBN: '10099.730075614659868756',
      })
      await expectAssetValues(assetvUSDC, 8, {
        cash: '9900.36456724346286',
        liability: '10000',
        tokenBN: '9900.40442142',
      })

      expect(receipt)
        .to.emit(pool1, 'Swap')
        .withArgs(
          this.router.address,
          USDT.address,
          BUSD.address,
          parseEther('100'),
          parseEther('99.864882399989350224'),
          this.router.address
        )

      expect(receipt)
        .to.emit(pool2, 'Swap')
        .withArgs(
          this.router.address,
          BUSD.address,
          UST.address,
          parseEther('99.864882399989350224'),
          parseEther('99.730075614659868756'),
          this.router.address
        )

      expect(receipt)
        .to.emit(pool3, 'Swap')
        .withArgs(
          this.router.address,
          UST.address,
          vUSDC.address,
          parseEther('99.730075614659868756'),
          parseUnits('99.59557858', 8),
          user1.address
        )

      expect(tokenSent.add(await assetUSDT.cash())).to.be.equal(parseEther('10000'))
      expect(tokenGot.add(await assetvUSDC.cash())).to.be.equal(parseEther('9900.364567253422417858'))
    })

    it('works (USDT -> BUSD -> UST -> vUSDC) without haircut fees with 3 pools', async function () {
      // set haircut rate to 0
      pool1.connect(owner).setHaircutRate(0)
      pool2.connect(owner).setHaircutRate(0)
      pool3.connect(owner).setHaircutRate(0)

      const beforeFromBalance = await USDT.balanceOf(user1.address)
      const beforeToBalance = await vUSDC.balanceOf(user1.address)

      await USDT.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps(
          [USDT.address, BUSD.address, UST.address, vUSDC.address],
          [pool1.address, pool2.address, pool3.address],
          parseEther('100')
        )

      // swap via router
      const receipt = await this.router.connect(user1).swapTokensForTokens(
        [USDT.address, BUSD.address, UST.address, vUSDC.address],
        [pool1.address, pool2.address, pool3.address],
        parseEther('100'),
        parseUnits('90', 8), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await USDT.balanceOf(user1.address)
      const afterToBalance = await vUSDC.balanceOf(user1.address)
      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)
      expect(tokenSent).to.be.equal(parseEther('-100'))
      expect(tokenGot).to.be.equal(parseUnits('99.71507530', 8))

      //check if token got is equal to token quoted
      expect(tokenGot).to.be.equal(quotedAmount)

      // check assets post swap positions
      await expectAssetValues(assetUSDT, 18, { cash: '10100', liability: '10000', tokenBN: '10100' })
      await expectAssetValues(assetBUSD, 18, {
        cash: '9900.09515566227556',
        liability: '10000',
        tokenBN: '9900.09515566227556',
      })
      await expectAssetValues(assetBUSD2, 18, {
        cash: '10099.90484433772444',
        liability: '10000',
        tokenBN: '10099.90484433772444',
      })
      await expectAssetValues(assetUST, 18, {
        cash: '9900.19013038917404',
        liability: '10000',
        tokenBN: '9900.19013038917404',
      })
      await expectAssetValues(assetUST2, 18, {
        cash: '10099.80986961082596',
        liability: '10000',
        tokenBN: '10099.80986961082596',
      })
      await expectAssetValues(assetvUSDC, 8, {
        cash: '9900.2849246963135',
        liability: '10000',
        tokenBN: '9900.2849247',
      })

      expect(receipt)
        .to.emit(pool1, 'Swap')
        .withArgs(
          this.router.address,
          USDT.address,
          BUSD.address,
          parseEther('100'),
          parseEther('99.90484433772444'),
          this.router.address
        )

      expect(receipt)
        .to.emit(pool2, 'Swap')
        .withArgs(
          this.router.address,
          BUSD.address,
          UST.address,
          parseEther('99.90484433772444'),
          parseEther('99.80986961082596'),
          this.router.address
        )

      expect(receipt)
        .to.emit(pool3, 'Swap')
        .withArgs(
          this.router.address,
          UST.address,
          vUSDC.address,
          parseEther('99.80986961082596'),
          parseUnits('99.71507530', 8),
          user1.address
        )

      expect(tokenSent.add(await assetUSDT.cash())).to.be.equal(parseEther('10000'))
      expect(tokenGot.add(await assetvUSDC.cash())).to.be.equal(parseEther('9900.284924706285007530'))
    })
  })

  describe('Router quote with exact output', function () {
    it('works with exact output with haircut fee (1 pool) 1/3', async function () {
      const beforeFromBalance = await BUSD.balanceOf(user1.address)
      const beforeToBalance = await USDT.balanceOf(user1.address)

      await BUSD.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps([BUSD.address, USDT.address], [pool1.address], parseEther('-100'))

      // check if input token amount is correct
      expect(quotedAmount).to.be.equal(parseEther('100.13542948011617'))

      await this.router.connect(user1).swapTokensForTokens(
        [BUSD.address, USDT.address],
        [pool1.address],
        parseEther('100.13542948011617'), // input to get exact 100 output
        parseEther('90'), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await BUSD.balanceOf(user1.address)
      const afterToBalance = await USDT.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)

      expect(tokenSent).to.be.equal(parseEther('-100.13542948011617'))
      expect(tokenGot).to.be.equal(parseEther('99.999999999999998976')) // rounding error
    })

    it('works with exact output with haircut fee (1 pool) 2/3', async function () {
      const beforeFromBalance = await vUSDC.balanceOf(user1.address)
      const beforeToBalance = await UST.balanceOf(user1.address)

      await vUSDC.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps([UST.address, vUSDC.address], [pool3.address], parseEther('-100'))

      // check if input token amount is correct
      expect(quotedAmount).to.be.equal(parseUnits('100.13542948', 8))

      await this.router.connect(user1).swapTokensForTokens(
        [vUSDC.address, UST.address],
        [pool3.address],
        parseUnits('100.13542948', 8), // input to get exact 100 output
        parseEther('90'), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await vUSDC.balanceOf(user1.address)
      const afterToBalance = await UST.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)

      expect(tokenSent).to.be.equal(parseUnits('-100.13542948', 8))
      expect(tokenGot).to.be.equal(parseEther('99.999999999884095356')) // rounding error
    })

    it('works with exact output with haircut fee (1 pool) 3/3', async function () {
      const beforeFromBalance = await UST.balanceOf(user1.address)
      const beforeToBalance = await vUSDC.balanceOf(user1.address)

      await UST.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps([vUSDC.address, UST.address], [pool3.address], parseUnits('-100', 8))

      // check if input token amount is correct
      expect(quotedAmount).to.be.equal(parseEther('100.13542947370139'))

      await this.router.connect(user1).swapTokensForTokens(
        [UST.address, vUSDC.address],
        [pool3.address],
        parseEther('100.13542947370139'), // input to get exact 100 output
        parseUnits('90', 8), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await UST.balanceOf(user1.address)
      const afterToBalance = await vUSDC.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)

      expect(tokenSent).to.be.equal(parseEther('-100.13542947370139'))
      expect(tokenGot).to.be.equal(parseUnits('99.99999999', 8)) // rounding error
    })

    it('works with exact output without haircut fee (1 pool) 1/3', async function () {
      // set haircut rate to 0
      pool1.connect(owner).setHaircutRate(0)

      const beforeFromBalance = await BUSD.balanceOf(user1.address)
      const beforeToBalance = await USDT.balanceOf(user1.address)

      await BUSD.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps([BUSD.address, USDT.address], [pool1.address], parseEther('-100'))

      // check if input token amount is correct
      expect(quotedAmount).to.be.equal(parseEther('100.09533711523749'))

      await this.router.connect(user1).swapTokensForTokens(
        [BUSD.address, USDT.address],
        [pool1.address],
        parseEther('100.09533711523749'), // input to get exact 100 output
        parseEther('90'), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await BUSD.balanceOf(user1.address)
      const afterToBalance = await USDT.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)

      expect(tokenSent).to.be.equal(parseEther('-100.09533711523749'))
      expect(tokenGot).to.be.equal(parseEther('100')) // rounding error
    })

    it('works with exact output without haircut fee (1 pool) 2/3', async function () {
      // set haircut rate to 0
      pool3.connect(owner).setHaircutRate(0)

      const beforeFromBalance = await vUSDC.balanceOf(user1.address)
      const beforeToBalance = await UST.balanceOf(user1.address)

      await vUSDC.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps([UST.address, vUSDC.address], [pool3.address], parseEther('-100'))

      // check if input token amount is correct
      expect(quotedAmount).to.be.equal(parseUnits('100.09533711', 8))

      await this.router.connect(user1).swapTokensForTokens(
        [vUSDC.address, UST.address],
        [pool3.address],
        parseUnits('100.09533711', 8), // input to get exact 100 output
        parseEther('90'), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await vUSDC.balanceOf(user1.address)
      const afterToBalance = await UST.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)

      expect(tokenSent).to.be.equal(parseUnits('-100.09533711', 8))
      expect(tokenGot).to.be.equal(parseEther('99.999999994772480000')) // rounding error
    })

    it('works with exact output without haircut fee (1 pool) 3/3', async function () {
      // set haircut rate to 0
      pool3.connect(owner).setHaircutRate(0)

      const beforeFromBalance = await UST.balanceOf(user1.address)
      const beforeToBalance = await vUSDC.balanceOf(user1.address)

      await UST.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps([vUSDC.address, UST.address], [pool3.address], parseUnits('-100', 8))

      // check if input token amount is correct
      expect(quotedAmount).to.be.equal(parseEther('100.09533710521842'))

      await this.router.connect(user1).swapTokensForTokens(
        [UST.address, vUSDC.address],
        [pool3.address],
        parseEther('100.09533710521842'), // input to get exact 100 output
        parseUnits('90', 8), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await UST.balanceOf(user1.address)
      const afterToBalance = await vUSDC.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)

      expect(tokenSent).to.be.equal(parseEther('-100.09533710521842'))
      expect(tokenGot).to.be.equal(parseUnits('99.99999999', 8)) // rounding error
    })

    it('works with exact output with haircut fee (2 pools) 1/3', async function () {
      const beforeFromBalance = await USDT.balanceOf(user1.address)
      const beforeToBalance = await UST.balanceOf(user1.address)

      await USDT.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps(
          [UST.address, BUSD.address, USDT.address],
          [pool2.address, pool1.address],
          parseEther('-100')
        )

      // check if input token amount is correct
      expect(quotedAmount).to.be.equal(parseEther('100.27117191063727'))

      await this.router.connect(user1).swapTokensForTokens(
        [USDT.address, BUSD.address, UST.address],
        [pool1.address, pool2.address],
        parseEther('100.27117191063727'), // input to get exact 100 output
        parseEther('90'), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await USDT.balanceOf(user1.address)
      const afterToBalance = await UST.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)

      expect(tokenSent).to.be.equal(parseEther('-100.27117191063727'))
      expect(tokenGot).to.be.equal(parseEther('100.000000000000008972')) // rounding error
    })

    it('works with exact output with haircut fee (2 pools) 2/3', async function () {
      const beforeFromBalance = await BUSD.balanceOf(user1.address)
      const beforeToBalance = await vUSDC.balanceOf(user1.address)

      await BUSD.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps(
          [vUSDC.address, UST.address, BUSD.address],
          [pool3.address, pool2.address],
          parseUnits('-100', 8)
        )

      // check if input token amount is correct
      expect(quotedAmount).to.be.equal(parseEther('100.27117190420765'))

      await this.router.connect(user1).swapTokensForTokens(
        [BUSD.address, UST.address, vUSDC.address],
        [pool2.address, pool3.address],
        parseEther('100.27117190420765'), // input to get exact 100 output
        parseUnits('90', 8), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await BUSD.balanceOf(user1.address)
      const afterToBalance = await vUSDC.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)

      expect(tokenSent).to.be.equal(parseEther('-100.27117190420765'))
      expect(tokenGot).to.be.equal(parseUnits('99.99999999', 8)) // rounding error
    })

    it('works with exact output with haircut fee (2 pools) 3/3', async function () {
      const beforeFromBalance = await vUSDC.balanceOf(user1.address)
      const beforeToBalance = await BUSD.balanceOf(user1.address)

      await vUSDC.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps(
          [BUSD.address, UST.address, vUSDC.address],
          [pool2.address, pool3.address],
          parseEther('-100')
        )

      // check if input token amount is correct
      expect(quotedAmount).to.be.equal(parseUnits('100.27117191', 8))

      await this.router.connect(user1).swapTokensForTokens(
        [vUSDC.address, UST.address, BUSD.address],
        [pool3.address, pool2.address],
        parseUnits('100.27117191', 8), // input to get exact 100 output
        parseEther('90'), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await vUSDC.balanceOf(user1.address)
      const afterToBalance = await BUSD.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)

      expect(tokenSent).to.be.equal(parseUnits('-100.27117191', 8))
      expect(tokenGot).to.be.equal(parseEther('99.999999999365672808')) // rounding error
    })

    it('works with exact output without haircut fee (2 pools) 1/3', async function () {
      // set haircut rate to 0
      pool1.connect(owner).setHaircutRate(0)
      pool2.connect(owner).setHaircutRate(0)

      const beforeFromBalance = await USDT.balanceOf(user1.address)
      const beforeToBalance = await UST.balanceOf(user1.address)

      await USDT.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps(
          [UST.address, BUSD.address, USDT.address],
          [pool2.address, pool1.address],
          parseEther('-100')
        )

      // check if input token amount is correct
      expect(quotedAmount).to.be.equal(parseEther('100.19085620299796'))

      await this.router.connect(user1).swapTokensForTokens(
        [USDT.address, BUSD.address, UST.address],
        [pool1.address, pool2.address],
        parseEther('100.19085620299796'), // input to get exact 100 output
        parseEther('90'), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await USDT.balanceOf(user1.address)
      const afterToBalance = await UST.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)

      expect(tokenSent).to.be.equal(parseEther('-100.19085620299796'))
      expect(tokenGot).to.be.equal(parseEther('99.99999999999999')) // rounding error
    })

    it('works with exact output without haircut fee (2 pools) 2/3', async function () {
      // set haircut rate to 0
      pool2.connect(owner).setHaircutRate(0)
      pool3.connect(owner).setHaircutRate(0)

      const beforeFromBalance = await BUSD.balanceOf(user1.address)
      const beforeToBalance = await vUSDC.balanceOf(user1.address)

      await BUSD.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps(
          [vUSDC.address, UST.address, BUSD.address],
          [pool3.address, pool2.address],
          parseUnits('-100', 8)
        )

      // check if input token amount is correct
      expect(quotedAmount).to.be.equal(parseEther('100.19085619295976'))

      await this.router.connect(user1).swapTokensForTokens(
        [BUSD.address, UST.address, vUSDC.address],
        [pool2.address, pool3.address],
        parseEther('100.19085619295976'), // input to get exact 100 output
        parseUnits('90', 8), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await BUSD.balanceOf(user1.address)
      const afterToBalance = await vUSDC.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)

      expect(tokenSent).to.be.equal(parseEther('-100.19085619295976'))
      expect(tokenGot).to.be.equal(parseUnits('99.99999999', 8)) // rounding error
    })

    it('works with exact output without haircut fee (2 pools) 3/3', async function () {
      // set haircut rate to 0
      pool2.connect(owner).setHaircutRate(0)
      pool3.connect(owner).setHaircutRate(0)

      const beforeFromBalance = await vUSDC.balanceOf(user1.address)
      const beforeToBalance = await BUSD.balanceOf(user1.address)

      await vUSDC.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps(
          [BUSD.address, UST.address, vUSDC.address],
          [pool2.address, pool3.address],
          parseEther('-100')
        )

      // check if input token amount is correct
      expect(quotedAmount).to.be.equal(parseUnits('100.19085620', 8))

      await this.router.connect(user1).swapTokensForTokens(
        [vUSDC.address, UST.address, BUSD.address],
        [pool3.address, pool2.address],
        parseUnits('100.19085620', 8), // input to get exact 100 output
        parseEther('90'), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await vUSDC.balanceOf(user1.address)
      const afterToBalance = await BUSD.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)

      expect(tokenSent).to.be.equal(parseUnits('-100.19085620', 8))
      expect(tokenGot).to.be.equal(parseEther('99.99999999701344')) // rounding error
    })

    it('works with exact output with haircut fee (3 pools)', async function () {
      const beforeFromBalance = await USDT.balanceOf(user1.address)
      const beforeToBalance = await vUSDC.balanceOf(user1.address)

      await USDT.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps(
          [vUSDC.address, UST.address, BUSD.address, USDT.address],
          [pool3.address, pool2.address, pool1.address],
          parseUnits('-100', 8)
        )

      // check if input token amount is correct
      expect(quotedAmount).to.be.equal(parseEther('100.40722836032113'))

      await this.router.connect(user1).swapTokensForTokens(
        [USDT.address, BUSD.address, UST.address, vUSDC.address],
        [pool1.address, pool2.address, pool3.address],
        parseEther('100.40722836032113'), // input to get exact 100 output
        parseUnits('90', 8), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await USDT.balanceOf(user1.address)
      const afterToBalance = await vUSDC.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)

      expect(tokenSent).to.be.equal(parseEther('-100.40722836032113'))
      expect(tokenGot).to.be.equal(parseUnits('99.99999999', 8)) // rounding error
    })

    it('works with exact output without haircut fee (3 pools)', async function () {
      // set haircut rate to 0
      pool1.connect(owner).setHaircutRate(0)
      pool2.connect(owner).setHaircutRate(0)
      pool3.connect(owner).setHaircutRate(0)

      const beforeFromBalance = await USDT.balanceOf(user1.address)
      const beforeToBalance = await vUSDC.balanceOf(user1.address)

      await USDT.connect(user1).approve(this.router.address, ethers.constants.MaxUint256)

      const [quotedAmount] = await this.router
        .connect(user1)
        .quotePotentialSwaps(
          [vUSDC.address, UST.address, BUSD.address, USDT.address],
          [pool3.address, pool2.address, pool1.address],
          parseUnits('-100', 8)
        )

      // check if input token amount is correct
      expect(quotedAmount).to.be.equal(parseEther('100.28655777477072'))

      await this.router.connect(user1).swapTokensForTokens(
        [USDT.address, BUSD.address, UST.address, vUSDC.address],
        [pool1.address, pool2.address, pool3.address],
        parseEther('100.28655777477072'), // input to get exact 100 output
        parseUnits('90', 8), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )

      const afterFromBalance = await USDT.balanceOf(user1.address)
      const afterToBalance = await vUSDC.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)

      expect(tokenSent).to.be.equal(parseEther('-100.28655777477072'))
      expect(tokenGot).to.be.equal(parseUnits('99.99999999', 8)) // rounding error
    })
  })
})
