import { ethers } from 'hardhat'
import { parseEther, parseUnits } from '@ethersproject/units'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { Contract, ContractFactory } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const { expect } = chai
chai.use(solidity)

describe('Pool - Fee', function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let AssetFactory: ContractFactory
  let TestERC20Factory: ContractFactory
  let AggregateAccountFactory: ContractFactory
  let PoolFactory: ContractFactory
  let poolContract: Contract
  let token0: Contract // BUSD
  let token1: Contract // USDC
  let token2: Contract // CAKE
  let asset0: Contract // BUSD LP
  let asset1: Contract // USDC LP
  let asset2: Contract // CAKE LP
  let aggregateAccount: Contract // stables
  let aggregateAccount1: Contract // non-stables
  let lastBlockTime: number
  let fiveSecondsSince: number

  before(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    user1 = rest[0]
    user2 = rest[1]

    // Get Factories
    AssetFactory = await ethers.getContractFactory('Asset')
    TestERC20Factory = await ethers.getContractFactory('TestERC20')
    AggregateAccountFactory = await ethers.getContractFactory('AggregateAccount')
    PoolFactory = await ethers.getContractFactory('Pool')
  })

  beforeEach(async function () {
    // get last block time
    const lastBlock = await ethers.provider.getBlock('latest')
    lastBlockTime = lastBlock.timestamp
    fiveSecondsSince = lastBlockTime + 5 * 1000

    // Deploy with factories
    token0 = await TestERC20Factory.deploy('Binance USD', 'BUSD', 18, parseUnits('1000000', 18)) // 1 mil BUSD
    token1 = await TestERC20Factory.deploy('Venus USDC', 'vUSDC', 8, parseUnits('10000000', 8)) // 10 mil vUSDC
    token2 = await TestERC20Factory.deploy('PancakeSwap Token', 'CAKE', 18, parseUnits('1000000', 18)) // 1 mil CAKE
    aggregateAccount = await AggregateAccountFactory.connect(owner).deploy('USD-Stablecoins', true)
    aggregateAccount1 = await AggregateAccountFactory.connect(owner).deploy('Non-Stablecoins', false)
    asset0 = await AssetFactory.deploy(token0.address, 'Binance USD LP', 'BUSD-LP', aggregateAccount.address)
    asset1 = await AssetFactory.deploy(token1.address, 'Venus USDC LP', 'vUSDC-LP', aggregateAccount.address)
    asset2 = await AssetFactory.deploy(token2.address, 'PancakeSwap Token LP', 'CAKE-LP', aggregateAccount1.address)
    poolContract = await PoolFactory.connect(owner).deploy()

    // wait for transactions to be mined
    await token0.deployTransaction.wait()
    await token1.deployTransaction.wait()
    await token2.deployTransaction.wait()
    await aggregateAccount.deployTransaction.wait()
    await asset0.deployTransaction.wait()
    await asset1.deployTransaction.wait()
    await asset2.deployTransaction.wait()
    await poolContract.deployTransaction.wait()

    // set pool address
    await asset0.setPool(poolContract.address)
    await asset1.setPool(poolContract.address)
    await asset2.setPool(poolContract.address)

    // initialize pool contract
    await poolContract.connect(owner).initialize()

    // set retention ratio
    await poolContract.connect(owner).setRetentionRatio(parseEther('0.8'))

    // Add BUSD & USDC assets to pool
    await poolContract.connect(owner).addAsset(token0.address, asset0.address)
    await poolContract.connect(owner).addAsset(token1.address, asset1.address)
    await poolContract.connect(owner).addAsset(token2.address, asset2.address)
  })

  describe('Various Paths', function () {
    it('should not set fee to 0', async function () {
      await expect(
        poolContract.connect(owner).setFeeTo('0x0000000000000000000000000000000000000000')
      ).to.be.revertedWith('Wombat: set retention ratio instead')
    })

    it('fee should not collected if feeTo is 0', async function () {
      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000')) // 100k BUSD
      await token1.connect(owner).transfer(user1.address, parseUnits('100000', 8)) // 100k vUSDC
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)

      // deposit 10k BUSD and 1k vUSDC to pool
      await poolContract.connect(user1).deposit(token0.address, parseEther('10000'), user1.address, fiveSecondsSince)
      await poolContract.connect(user1).deposit(token1.address, parseUnits('1000', 8), user1.address, fiveSecondsSince)

      const beforeFromBalance = await token1.balanceOf(user1.address)
      const beforeToBalance = await token0.balanceOf(user1.address)

      const [quotedAmount] = await poolContract
        .connect(user1)
        .quotePotentialSwap(token1.address, token0.address, parseUnits('100', 8))

      const receipt = await poolContract.connect(user1).swap(
        token1.address,
        token0.address,
        parseUnits('100', 8),
        parseEther('90'), //expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )
      const afterFromBalance = await token1.balanceOf(user1.address)
      const afterToBalance = await token0.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)
      expect(tokenSent).to.be.equal(parseUnits('-100', 8))
      expect(tokenGot).to.be.equal(parseEther('99.479655212388724896'))

      //check if token got is equal to token quoted
      expect(tokenGot).to.be.equal(quotedAmount)

      // check BUSD post swap positions
      expect(await asset0.cash()).to.be.equal(parseEther('9900.520344787611275104'))
      expect(await asset0.liability()).to.be.equal(parseEther('10000'))
      expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('9900.520344787611275104')) // should always equal cash

      // check vUSDC post swap positions
      expect(await asset1.cash()).to.be.equal(parseUnits('1100', 8))
      expect(await asset1.liability()).to.be.equal(parseUnits('1000', 8))
      expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('1100', 8)) // should always equal cash

      await expect(receipt)
        .to.emit(poolContract, 'Swap')
        .withArgs(
          user1.address,
          token1.address,
          token0.address,
          parseUnits('100', 8),
          parseEther('99.479655212388724896'),
          user1.address
        )

      expect(tokenSent.add(await asset1.cash())).to.be.equal(parseUnits('1000', 8))
      expect(tokenGot.add(await asset0.cash())).to.be.equal(parseEther('10000'))

      await poolContract.mintFee(asset0.address)
      await poolContract.mintFee(asset1.address)
      expect(await asset0.liability()).to.be.equal(parseEther('10000'))
      expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
      expect(await asset1.balanceOf(user2.address)).to.be.equal(parseUnits('0', 8))
    })
  })

  describe('Asset BUSD (18 decimals) and vUSDC (6 decimals)', function () {
    beforeEach(async function () {
      // set fee collection address
      await poolContract.connect(owner).setFeeTo(user2.address)

      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000')) // 100k BUSD
      await token1.connect(owner).transfer(user1.address, parseUnits('100000', 8)) // 100k vUSDC
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)

      // deposit 10k BUSD and 1k vUSDC to pool
      await poolContract.connect(user1).deposit(token0.address, parseEther('10000'), user1.address, fiveSecondsSince)
      await poolContract.connect(user1).deposit(token1.address, parseUnits('1000', 8), user1.address, fiveSecondsSince)
    })

    describe('single swap', function () {
      it('works (BUSD -> vUSDC) without haircut fees', async function () {
        // set haircut rate to 0
        poolContract.connect(owner).setHaircutRate(0)
        const beforeFromBalance = await token0.balanceOf(user1.address)
        const beforeToBalance = await token1.balanceOf(user1.address)

        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token1.address, parseEther('100'))

        const receipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token0.balanceOf(user1.address)
        const afterToBalance = await token1.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-100'))
        expect(tokenGot).to.be.equal(parseUnits('99.43009646', 8))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10100'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10100')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseUnits('900.56990354', 8))
        expect(await asset1.liability()).to.be.equal(parseUnits('1000', 8))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('900.56990354', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'Swap')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('100'),
            parseUnits('99.43009646', 8),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10000'))
        expect(tokenGot.add(await asset1.cash())).to.be.equal(parseUnits('1000', 8))

        await poolContract.mintFee(asset0.address)
        await poolContract.mintFee(asset1.address)
        expect(await asset1.liability()).to.be.equal(parseUnits('1000', 8))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseEther('0'))
      })

      it('works (vUSDC -> BUSD) with haircut fees and no dividend', async function () {
        // set dividend to 0
        await poolContract.connect(owner).setRetentionRatio(parseEther('1.0'))

        const beforeFromBalance = await token1.balanceOf(user1.address)
        const beforeToBalance = await token0.balanceOf(user1.address)

        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token1.address, token0.address, parseUnits('100', 8))

        const receipt = await poolContract.connect(user1).swap(
          token1.address,
          token0.address,
          parseUnits('100', 8),
          parseEther('90'), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token1.balanceOf(user1.address)
        const afterToBalance = await token0.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)
        expect(tokenSent).to.be.equal(parseUnits('-100', 8))
        expect(tokenGot).to.be.equal(parseEther('99.479655212388724896'))

        //check if token got is equal to token quoted
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('9900.520344787611275104'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('9900.520344787611275104')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseUnits('1100', 8))
        expect(await asset1.liability()).to.be.equal(parseUnits('1000', 8))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('1100', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'Swap')
          .withArgs(
            user1.address,
            token1.address,
            token0.address,
            parseUnits('100', 8),
            parseEther('99.479655212388724896'),
            user1.address
          )

        expect(tokenSent.add(await asset1.cash())).to.be.equal(parseUnits('1000', 8))
        expect(tokenGot.add(await asset0.cash())).to.be.equal(parseEther('10000'))

        await poolContract.mintFee(asset0.address)
        await poolContract.mintFee(asset1.address)
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseUnits('0', 8))
      })

      it('works (BUSD -> vUSDC) with haircut fees and dividend', async function () {
        const beforeFromBalance = await token0.balanceOf(user1.address)
        const beforeToBalance = await token1.balanceOf(user1.address)

        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token1.address, parseEther('100'))

        const receipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token0.balanceOf(user1.address)
        const afterToBalance = await token1.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-100'))
        expect(tokenGot).to.be.equal(parseUnits('99.39032442', 8))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10100'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10100')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseUnits('900.60967558', 8))
        expect(await asset1.liability()).to.be.equal(parseUnits('1000', 8))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('900.60967558', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'Swap')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('100'),
            parseUnits('99.39032442', 8),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10000'))
        expect(tokenGot.add(await asset1.cash())).to.be.equal(parseUnits('1000', 8))

        await poolContract.mintFee(asset0.address)
        await poolContract.mintFee(asset1.address)
        expect(await asset1.liability()).to.be.equal(parseUnits('1000.00795441', 8))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseUnits('0.00795441', 8))
      })

      it('works (vUSDC -> BUSD) with haircut fees and dividend', async function () {
        const beforeFromBalance = await token1.balanceOf(user1.address)
        const beforeToBalance = await token0.balanceOf(user1.address)

        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token1.address, token0.address, parseUnits('100', 8))

        const receipt = await poolContract.connect(user1).swap(
          token1.address,
          token0.address,
          parseUnits('100', 8),
          parseEther('90'), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token1.balanceOf(user1.address)
        const afterToBalance = await token0.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)
        expect(tokenSent).to.be.equal(parseUnits('-100', 8))
        expect(tokenGot).to.be.equal(parseEther('99.479655212388724896'))

        //check if token got is equal to token quoted
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('9900.520344787611275104'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('9900.520344787611275104')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseUnits('1100', 8))
        expect(await asset1.liability()).to.be.equal(parseUnits('1000', 8))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('1100', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'Swap')
          .withArgs(
            user1.address,
            token1.address,
            token0.address,
            parseUnits('100', 8),
            parseEther('99.479655212388724896'),
            user1.address
          )

        expect(tokenSent.add(await asset1.cash())).to.be.equal(parseUnits('1000', 8))
        expect(tokenGot.add(await asset0.cash())).to.be.equal(parseEther('10000'))

        await poolContract.mintFee(asset0.address)
        await poolContract.mintFee(asset1.address)
        expect(await asset0.liability()).to.be.equal(parseEther('10000.007961557039807021'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0.007961557039807021'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseUnits('0', 8))
      })

      it('revert if assets are in 2 different aggregate pools', async function () {
        await expect(
          poolContract.connect(user1).swap(
            token1.address,
            token2.address,
            parseUnits('100', 8),
            parseEther('90'), //expect at least 90% of ideal quoted amount
            user1.address,
            fiveSecondsSince
          )
        ).to.be.revertedWith('Wombat: INTERPOOL_SWAP_NOT_SUPPORTED')
      })
    })

    describe('multiple swap', function () {
      it('works (BUSD -> vUSDC) and collect fee', async function () {
        let beforeFromBalance,
          beforeToBalance,
          quotedAmount,
          receipt,
          afterFromBalance,
          afterToBalance,
          tokenSent,
          tokenGot

        // first swap

        beforeFromBalance = await token0.balanceOf(user1.address)
        beforeToBalance = await token1.balanceOf(user1.address)
        ;[quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token1.address, parseEther('100'))

        receipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        afterFromBalance = await token0.balanceOf(user1.address)
        afterToBalance = await token1.balanceOf(user1.address)

        tokenSent = afterFromBalance.sub(beforeFromBalance)
        tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-100'))
        expect(tokenGot).to.be.equal(parseUnits('99.39032442', 8))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10100'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10100')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseUnits('900.60967558', 8))
        expect(await asset1.liability()).to.be.equal(parseUnits('1000', 8))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('900.60967558', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'Swap')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('100'),
            parseUnits('99.39032442', 8),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10000'))
        expect(tokenGot.add(await asset1.cash())).to.be.equal(parseUnits('1000', 8))

        // second swap

        beforeFromBalance = await token0.balanceOf(user1.address)
        beforeToBalance = await token1.balanceOf(user1.address)
        ;[quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token1.address, parseEther('100'))

        receipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        afterFromBalance = await token0.balanceOf(user1.address)
        afterToBalance = await token1.balanceOf(user1.address)

        tokenSent = afterFromBalance.sub(beforeFromBalance)
        tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-100'))
        expect(tokenGot).to.be.equal(parseUnits('98.02999052', 8))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10200'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10200')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseUnits('802.57968506', 8))
        expect(await asset1.liability()).to.be.equal(parseUnits('1000', 8))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('802.57968506', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'Swap')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('100'),
            parseUnits('98.02999052', 8),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10100'))
        expect(tokenGot.add(await asset1.cash())).to.be.equal(parseUnits('900.60967558', 8))

        // collect fee

        await poolContract.mintFee(asset0.address)
        await poolContract.mintFee(asset1.address)
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset1.liability()).to.be.equal(parseUnits('1000.01579995', 8))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseUnits('0.01579995', 8))

        // third swap

        beforeFromBalance = await token0.balanceOf(user1.address)
        beforeToBalance = await token1.balanceOf(user1.address)
        ;[quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token1.address, parseEther('100'))

        receipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        afterFromBalance = await token0.balanceOf(user1.address)
        afterToBalance = await token1.balanceOf(user1.address)

        tokenSent = afterFromBalance.sub(beforeFromBalance)
        tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-100'))
        expect(tokenGot).to.be.equal(parseUnits('96.22926527', 8))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10300'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10300')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseUnits('706.35041979', 8))
        expect(await asset1.liability()).to.be.equal(parseUnits('1000.01579995', 8))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('706.35041979', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'Swap')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('100'),
            parseUnits('96.22926527', 8),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10200'))
        expect(tokenGot.add(await asset1.cash())).to.be.equal(parseUnits('802.57968506', 8))

        // forth swap

        beforeFromBalance = await token0.balanceOf(user1.address)
        beforeToBalance = await token1.balanceOf(user1.address)
        ;[quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token1.address, parseEther('100'))

        receipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        afterFromBalance = await token0.balanceOf(user1.address)
        afterToBalance = await token1.balanceOf(user1.address)

        tokenSent = afterFromBalance.sub(beforeFromBalance)
        tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-100'))
        expect(tokenGot).to.be.equal(parseUnits('93.78698463', 8))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10400'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10400')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseUnits('612.56343516', 8))
        expect(await asset1.liability()).to.be.equal(parseUnits('1000.01579995', 8))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('612.56343516', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'Swap')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('100'),
            parseUnits('93.78698463', 8),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10300'))
        expect(tokenGot.add(await asset1.cash())).to.be.equal(parseUnits('706.35041979', 8))

        // collect fee

        await poolContract.mintFee(asset0.address)
        await poolContract.mintFee(asset1.address)
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset1.liability()).to.be.equal(parseUnits('1000.03100733', 8))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseUnits('0.03100733', 8))
      })

      it('should collect fee before deposit', async function () {
        // copies from "works (vUSDC -> BUSD) with haircut fees and dividend" and replace mintFee() with deposit
        const beforeFromBalance = await token1.balanceOf(user1.address)
        const beforeToBalance = await token0.balanceOf(user1.address)

        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token1.address, token0.address, parseUnits('100', 8))

        const receipt = await poolContract.connect(user1).swap(
          token1.address,
          token0.address,
          parseUnits('100', 8),
          parseEther('90'), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token1.balanceOf(user1.address)
        const afterToBalance = await token0.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)
        expect(tokenSent).to.be.equal(parseUnits('-100', 8))
        expect(tokenGot).to.be.equal(parseEther('99.479655212388724896'))

        //check if token got is equal to token quoted
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('9900.520344787611275104'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('9900.520344787611275104')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseUnits('1100', 8))
        expect(await asset1.liability()).to.be.equal(parseUnits('1000', 8))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('1100', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'Swap')
          .withArgs(
            user1.address,
            token1.address,
            token0.address,
            parseUnits('100', 8),
            parseEther('99.479655212388724896'),
            user1.address
          )

        expect(tokenSent.add(await asset1.cash())).to.be.equal(parseUnits('1000', 8))
        expect(tokenGot.add(await asset0.cash())).to.be.equal(parseEther('10000'))

        // deposit some token to pool
        await poolContract.connect(user1).deposit(token0.address, parseEther('1'), user1.address, fiveSecondsSince)

        expect(await asset0.liability()).to.be.equal(parseEther('10001.007961557039807021'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0.007961557039807021'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseUnits('0', 8))
      })

      it('should collect fee before withdraw', async function () {
        const beforeFromBalance = await token0.balanceOf(user1.address)
        const beforeToBalance = await token1.balanceOf(user1.address)

        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token1.address, parseEther('100'))

        const receipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token0.balanceOf(user1.address)
        const afterToBalance = await token1.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-100'))
        expect(tokenGot).to.be.equal(parseUnits('99.39032442', 8))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10100'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10100')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseUnits('900.60967558', 8))
        expect(await asset1.liability()).to.be.equal(parseUnits('1000', 8))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('900.60967558', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'Swap')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('100'),
            parseUnits('99.39032442', 8),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10000'))
        expect(tokenGot.add(await asset1.cash())).to.be.equal(parseUnits('1000', 8))

        await asset1.connect(user1).approve(poolContract.address, parseUnits('10', 8))
        await poolContract
          .connect(user1)
          .withdraw(token1.address, parseUnits('1', 8), parseUnits('1', 8), user1.address, fiveSecondsSince)

        expect(await asset1.liability()).to.be.equal(parseUnits('999.00795441', 8))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseUnits('0.00795441', 8))
      })
    })
  })
})
