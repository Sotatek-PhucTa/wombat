import { ethers } from 'hardhat'
import { parseEther, parseUnits } from '@ethersproject/units'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { Contract, ContractFactory } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const { expect } = chai
chai.use(solidity)

describe('Pool - Withdraw', function () {
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
  let aggregateAccount: Contract
  let lastBlockTime: number
  let fiveSecondsSince: number
  let fiveSecondsAgo: number

  beforeEach(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    user1 = rest[0]
    user2 = rest[1]

    // get last block time
    const lastBlock = await ethers.provider.getBlock('latest')
    lastBlockTime = lastBlock.timestamp
    fiveSecondsSince = lastBlockTime + 5 * 1000
    fiveSecondsAgo = lastBlockTime - 5 * 1000

    // Get Factories
    AssetFactory = await ethers.getContractFactory('Asset')
    TestERC20Factory = await ethers.getContractFactory('TestERC20')
    AggregateAccountFactory = await ethers.getContractFactory('AggregateAccount')
    PoolFactory = await ethers.getContractFactory('Pool')

    // Deploy with factories
    token0 = await TestERC20Factory.deploy('Binance USD', 'BUSD', 18, parseUnits('1000000', 18)) // 1 mil BUSD
    token1 = await TestERC20Factory.deploy('Venus USDC', 'vUSDC', 8, parseUnits('10000000', 8)) // 10 mil vUSDC
    token2 = await TestERC20Factory.deploy('PancakeSwap Token', 'CAKE', 18, parseUnits('1000000', 18)) // 1 mil CAKE
    aggregateAccount = await AggregateAccountFactory.connect(owner).deploy('stables', true)
    asset0 = await AssetFactory.deploy(token0.address, 'Binance USD LP', 'BUSD-LP', aggregateAccount.address)
    asset1 = await AssetFactory.deploy(token1.address, 'Venus USDC LP', 'vUSDC-LP', aggregateAccount.address)
    asset2 = await AssetFactory.deploy(token2.address, 'PancakeSwap Token LP', 'CAKE-LP', aggregateAccount.address)
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

    // initialize pool contract
    poolContract.connect(owner).initialize()

    // Add BUSD & USDC assets to pool
    await poolContract.connect(owner).addAsset(token0.address, asset0.address)
    await poolContract.connect(owner).addAsset(token1.address, asset1.address)
    await poolContract.connect(owner).addAsset(token2.address, asset2.address)

    // We want to test when r* may be any value other than 1
    await poolContract.connect(owner).setShouldEnableExactDeposit(false)
  })

  describe('Asset BUSD (18 decimals)', function () {
    beforeEach(async function () {
      // Transfer 100k from BUSD contract to users
      await token0.connect(owner).transfer(user1.address, parseEther('100000')) // 100 k
      await token0.connect(owner).transfer(user2.address, parseEther('600.123'))
      // Approve max allowance from users to pool
      await token0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token0.connect(user2).approve(poolContract.address, ethers.constants.MaxUint256)
      // Approve max allowance from users to asset
      await asset0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)

      // user1 deposits 100 BUSD to pool contract
      await poolContract.connect(user1).deposit(token0.address, parseEther('100'), user1.address, fiveSecondsSince)
    })
    describe('withdraw', function () {
      it('works (first LP)', async function () {
        // Get BUSD balance of user1
        const beforeBalance = await token0.balanceOf(user1.address)

        // quote withdrawal => 70000000000000000000
        const [quotedWithdrawal] = await poolContract.quotePotentialWithdraw(token0.address, parseEther('70'))

        const receipt = await poolContract
          .connect(user1)
          .withdraw(token0.address, parseEther('70'), 0, user1.address, fiveSecondsSince)
        const afterBalance = await token0.balanceOf(user1.address)

        // check that quoted withdrawal is the same as amount withdrawn
        expect(afterBalance.sub(beforeBalance)).to.be.equal(quotedWithdrawal)

        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseEther('70.000000000000000030')) // 70 (withdrawn) - 0 (deposited 100 already)
        expect(await asset0.balanceOf(user1.address)).to.be.equal(parseEther('30'))
        expect(await asset0.cash()).to.be.equal(parseEther('29.999999999999999970'))
        expect(await asset0.liability()).to.be.equal(parseEther('30'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('29.999999999999999970'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('30'))

        await expect(receipt)
          .to.emit(poolContract, 'Withdraw')
          .withArgs(user1.address, token0.address, parseEther('70.000000000000000030'), parseEther('70'), user1.address)
      })

      it('works to withdraw all', async function () {
        const beforeBalance = await token0.balanceOf(user1.address)

        // quote withdrawal
        const [withdrawAmount] = await poolContract.quotePotentialWithdraw(token0.address, parseEther('100'))

        await poolContract
          .connect(user1)
          .withdraw(token0.address, parseEther('100'), 0, user1.address, fiveSecondsSince)

        const afterBalance = await token0.balanceOf(user1.address)

        // check that quoted withdrawal is the same as amount withdrawn
        expect(afterBalance.sub(beforeBalance)).to.be.equal(withdrawAmount) // 100 - 0

        expect(await asset0.balanceOf(user1.address)).to.be.equal(parseEther('0'))
        expect(await asset0.cash()).to.be.equal(parseEther('0'))
        expect(await asset0.liability()).to.be.equal(parseEther('0'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('0'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('0'))
      })

      it.skip('works with fee (cov > 0.4)', async function () {
        // Adjust coverage ratio to 0.6
        await asset0.connect(owner).setPool(owner.address)
        await asset0.connect(owner).removeCash(parseEther('40'))
        await asset0.connect(owner).transferUnderlyingToken(owner.address, parseEther('40'))
        await asset0.connect(owner).setPool(poolContract.address)
        expect((await asset0.cash()) / (await asset0.liability())).to.equal(0.6) // cov = 0.6

        const beforeBalance = await token0.balanceOf(user1.address)

        const [quotedWithdrawal] = await poolContract.quotePotentialWithdraw(token0.address, parseEther('10'))

        const receipt = await poolContract
          .connect(user1)
          .withdraw(token0.address, parseEther('10'), parseEther('0'), user1.address, fiveSecondsSince)
        const afterBalance = await token0.balanceOf(user1.address)

        // check that quoted withdrawal is the same as amount withdrawn
        expect(afterBalance.sub(beforeBalance)).to.be.equal(quotedWithdrawal)

        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseEther('9.953612344537722900'))
        expect(await asset0.balanceOf(user1.address)).to.be.equal(parseEther('90'))
        expect(await asset0.cash()).to.be.equal(parseEther('50.046387655462277100'))
        expect(await asset0.liability()).to.be.equal(parseEther('90'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('50.046387655462277100'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('90'))

        await expect(receipt)
          .to.emit(poolContract, 'Withdraw')
          .withArgs(user1.address, token0.address, parseEther('9.953612344537722900'), parseEther('10'), user1.address)
      })

      it.skip('works with fee (cov < 0.4)', async function () {
        // Adjust coverage ratio to 0.3
        await asset0.connect(owner).setPool(owner.address)
        await asset0.connect(owner).removeCash(parseEther('70'))
        await asset0.connect(owner).transferUnderlyingToken(owner.address, parseEther('70'))
        await asset0.connect(owner).setPool(poolContract.address)
        // console.log(`Cash : ${await asset0.cash()}, Liabilities ${await asset0.liability()}`)
        expect((await asset0.cash()) / (await asset0.liability())).to.equal(0.3)

        const beforeBalance = await token0.balanceOf(user1.address)
        const [quotedWithdrawal] = await poolContract.quotePotentialWithdraw(token0.address, parseEther('10'))

        // console.log(ethers.utils.parseEther(beforeBalance))
        const receipt = await poolContract
          .connect(user1)
          .withdraw(token0.address, parseEther('10'), parseEther('0'), user1.address, fiveSecondsSince)
        const afterBalance = await token0.balanceOf(user1.address)

        expect(afterBalance.sub(beforeBalance)).to.be.equal(quotedWithdrawal)
        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseEther('3.661163217515241640'))
        expect(await asset0.balanceOf(user1.address)).to.be.equal(parseEther('90'))
        expect(await asset0.cash()).to.be.equal(parseEther('26.338836782484758360'))
        expect(await asset0.liability()).to.be.equal(parseEther('90'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('26.338836782484758360'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('90'))

        await expect(receipt)
          .to.emit(poolContract, 'Withdraw')
          .withArgs(user1.address, token0.address, parseEther('3.661163217515241640'), parseEther('10'), user1.address)
      })

      it('works without fee (cov >= 1)', async function () {
        // Adjust coverage ratio to 1.2
        await asset0.connect(owner).setPool(owner.address)
        await asset0.connect(owner).addCash(parseEther('20'))
        await token0.connect(owner).transfer(asset0.address, parseEther('20'))
        await asset0.connect(owner).setPool(poolContract.address)
        expect((await asset0.cash()) / (await asset0.liability())).to.equal(1.2)

        const [quotedWithdrawal, , enoughCash] = await poolContract.quotePotentialWithdraw(
          token0.address,
          parseEther('10')
        )

        const beforeBalance = await token0.balanceOf(user1.address)
        await poolContract
          .connect(user1)
          .withdraw(token0.address, parseEther('10'), parseEther('0'), user1.address, fiveSecondsSince)
        const afterBalance = await token0.balanceOf(user1.address)

        expect(enoughCash).to.be.true
        expect(afterBalance.sub(beforeBalance)).to.be.equal(quotedWithdrawal)

        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseEther('10.000000000000000200'))
        expect(await asset0.balanceOf(user1.address)).to.be.equal(parseEther('90'))
        expect(await asset0.cash()).to.be.equal(parseEther('109.999999999999999800'))
        expect(await asset0.liability()).to.be.equal(parseEther('90'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('109.999999999999999800'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('90'))
      })

      it('reverts if passed deadline', async function () {
        await expect(
          poolContract
            .connect(user1)
            .withdraw(token0.address, parseEther('100'), parseEther('100'), user1.address, fiveSecondsAgo)
        ).to.be.revertedWith('WOMBAT_EXPIRED')
      })

      it('reverts if liquidity provider does not have enough liquidity token', async function () {
        await expect(
          poolContract
            .connect(user2)
            .withdraw(token0.address, parseEther('1001'), parseEther('1001'), user2.address, fiveSecondsSince)
        ).to.be.revertedWith('ERC20: transfer amount exceeds balance')
      })

      it('reverts if amount to receive is less than expected', async function () {
        await expect(
          poolContract
            .connect(user1)
            .withdraw(token0.address, parseEther('25'), parseEther('100'), user1.address, fiveSecondsSince),
          'WOMBAT_AMOUNT_TOO_LOW'
        ).to.be.reverted
      })

      it('reverts if no liability to burn', async function () {
        await expect(
          poolContract
            .connect(user1)
            .withdraw(token0.address, parseEther('0'), parseEther('0'), user1, fiveSecondsSince),
          'Wombat: INSUFFICIENT_LIQUIDITY_BURNED'
        ).to.be.reverted
      })

      it('reverts if pool paused', async function () {
        await poolContract.connect(owner).pause()
        await expect(
          poolContract
            .connect(user1)
            .withdraw(token0.address, parseEther('100'), parseEther('100'), user1.address, fiveSecondsSince)
        ).to.be.revertedWith('Pausable: paused')
      })

      it('reverts if zero address provided', async function () {
        await expect(
          poolContract
            .connect(user1)
            .withdraw(
              ethers.constants.AddressZero,
              parseEther('100'),
              parseEther('100'),
              user1.address,
              fiveSecondsSince
            )
        ).to.be.revertedWith('WOMBAT_ASSET_NOT_EXISTS')
      })

      it('reverts if asset not exist', async function () {
        // Create a new ERC20 stablecoin
        const mockToken = await TestERC20Factory.deploy('Tether', 'USDT', 18, parseUnits('1000000', 18)) // 1 mil USDT
        // Wait for transaction to be mined
        await mockToken.deployTransaction.wait()

        await expect(
          poolContract
            .connect(user1)
            .withdraw(mockToken.address, parseEther('100'), parseEther('100'), user1.address, fiveSecondsSince)
        ).to.be.revertedWith('WOMBAT_ASSET_NOT_EXISTS')
      })
    })

    describe('withdrawFromOtherAsset', function () {
      it('reverts when cov < 1', async function () {
        await expect(
          poolContract
            .connect(owner)
            .withdrawFromOtherAsset(
              token1.address,
              token0.address,
              parseEther('10'),
              parseEther('0'),
              user1.address,
              fiveSecondsSince
            )
        ).to.be.revertedWith('WOMBAT_COV_RATIO_TOO_LOW')
      })

      it('works with 0 fee (cov >= 1)', async function () {
        await asset0.connect(owner).setPool(owner.address)
        await asset0.connect(owner).addCash(parseEther('10'))
        await asset0.connect(owner).setPool(poolContract.address)

        await token1.connect(owner).approve(poolContract.address, ethers.constants.MaxUint256)
        await asset1.connect(owner).approve(poolContract.address, ethers.constants.MaxUint256)
        await poolContract.connect(owner).deposit(token1.address, parseUnits('10', 8), owner.address, fiveSecondsSince)

        const receipt = await poolContract
          .connect(owner)
          .withdrawFromOtherAsset(
            token1.address,
            token0.address,
            parseEther('10'),
            parseEther('0'),
            owner.address,
            fiveSecondsSince
          )
        await expect(receipt)
          .to.emit(poolContract, 'Withdraw')
          .withArgs(
            owner.address,
            token0.address,
            parseUnits('9.999269495807120300'),
            parseUnits('10', 8),
            owner.address
          )
      })
    })

    describe('quotePotentialWithdraw', () => {
      it.skip('works with fee', async function () {
        // Adjust coverage ratio to around 0.6
        await asset0.connect(owner).setPool(owner.address)
        await asset0.connect(owner).removeCash(parseEther('40'))
        await asset0.connect(owner).transferUnderlyingToken(owner.address, parseEther('40'))
        await asset0.connect(owner).addLiability(parseEther('1.768743776499783944'))
        await asset0.connect(owner).setPool(poolContract.address)

        const [actualAmount, fee] = await poolContract.quotePotentialWithdraw(token0.address, parseEther('10'))

        expect(actualAmount).to.be.equal(parseEther('10000000000000000090'))
        expect(fee).to.be.equal(parseEther('0.056107144352560168'))
      })

      it('works with 0 fee (cov >= 1)', async function () {
        const [actualAmount, fee] = await poolContract.quotePotentialWithdraw(token0.address, parseEther('10'))

        expect(actualAmount).to.be.equal(parseEther('10.000000000000000090'))
        expect(fee).to.be.equal(-90)
      })
    })

    describe('quotePotentialWithdrawFromOtherAsset', () => {
      it('reverts when cov < 1', async function () {
        await expect(
          poolContract
            .connect(owner)
            .quotePotentialWithdrawFromOtherAsset(token1.address, token0.address, parseEther('10'))
        ).to.be.revertedWith('WOMBAT_COV_RATIO_TOO_LOW')
      })

      it('works with 0 fee (cov >= 1)', async function () {
        await asset0.connect(owner).setPool(owner.address)
        await asset0.connect(owner).addCash(parseEther('10'))
        await asset0.connect(owner).setPool(poolContract.address)
        const [actualAmount, fee, enoughCash] = await poolContract
          .connect(owner)
          .quotePotentialWithdrawFromOtherAsset(token1.address, token0.address, parseEther('9'))

        expect(actualAmount).to.be.equal(parseEther('9.000000000000000192'))
        expect(fee).to.be.equal(-192)
        expect(enoughCash).to.be.equal(true)
      })
    })
  })

  describe('Asset vUSDC (8 decimals)', function () {
    beforeEach(async function () {
      // Transfer 100k from vUSDC contract to users
      await token1.connect(owner).transfer(user1.address, parseUnits('100000', 8)) // 100 k
      await token1.connect(owner).transfer(user2.address, parseUnits('600.123', 8))
      // Approve max allowance from users to pool
      await token1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token1.connect(user2).approve(poolContract.address, ethers.constants.MaxUint256)
      // Approve max allowance from users to asset
      await asset1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)

      // user1 deposits 100 vUSDC to pool contract
      await poolContract.connect(user1).deposit(token1.address, parseUnits('100', 8), user1.address, fiveSecondsSince)
    })
    describe('withdraw', function () {
      it('works (first LP)', async function () {
        // Get vUSDC balance of user1
        const beforeBalance = await token1.balanceOf(user1.address)

        // quote withdrawal => 70000000000000000000
        const [quotedWithdrawal] = await poolContract.quotePotentialWithdraw(token1.address, parseUnits('70', 8))

        const receipt = await poolContract
          .connect(user1)
          .withdraw(token1.address, parseUnits('70', 8), parseUnits('70', 8), user1.address, fiveSecondsSince)
        const afterBalance = await token1.balanceOf(user1.address)

        // check that quoted withdrawal is the same as amount withdrawn
        expect(afterBalance.sub(beforeBalance)).to.be.equal(quotedWithdrawal)

        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseUnits('70', 8)) // 70 (withdrawn) - 0 (deposited 100 already)
        expect(await asset1.balanceOf(user1.address)).to.be.equal(parseUnits('30', 8))
        expect(await asset1.cash()).to.be.equal(parseUnits('30', 8))
        expect(await asset1.liability()).to.be.equal(parseUnits('30', 8))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('30', 8))
        expect(await asset1.totalSupply()).to.be.equal(parseUnits('30', 8))

        await expect(receipt)
          .to.emit(poolContract, 'Withdraw')
          .withArgs(user1.address, token1.address, parseUnits('70', 8), parseUnits('70', 8), user1.address)
      })

      it('works without fee (cov >= 1)', async function () {
        // Adjust coverage ratio to 1.2
        await asset1.connect(owner).setPool(owner.address)
        await asset1.connect(owner).addCash(parseUnits('20', 8))
        await token1.connect(owner).transfer(asset1.address, parseUnits('20', 8))
        await asset1.connect(owner).setPool(poolContract.address)
        expect((await asset1.cash()) / (await asset1.liability())).to.equal(1.2) // 120 / 100

        const [quotedWithdrawal, , enoughCash] = await poolContract.quotePotentialWithdraw(
          token1.address,
          parseUnits('10', 8)
        )

        const beforeBalance = await token1.balanceOf(user1.address)
        await poolContract
          .connect(user1)
          .withdraw(token1.address, parseUnits('10', 8), parseUnits('0', 8), user1.address, fiveSecondsSince)
        const afterBalance = await token1.balanceOf(user1.address)

        expect(enoughCash).to.be.true
        expect(afterBalance.sub(beforeBalance)).to.be.equal(quotedWithdrawal) // 130 - 120

        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseUnits('10', 8))
        expect(await asset1.balanceOf(user1.address)).to.be.equal(parseUnits('90', 8))
        expect(await asset1.cash()).to.be.equal(parseUnits('110', 8))
        expect(await asset1.liability()).to.be.equal(parseUnits('90', 8))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('110', 8))
        expect(await asset1.totalSupply()).to.be.equal(parseUnits('90', 8))
      })

      it.skip('works with fee (cov > 0.4)', async function () {
        // Adjust coverage ratio to 0.6
        await asset1.connect(owner).setPool(owner.address)
        await asset1.connect(owner).removeCash(parseUnits('40', 8))
        await asset1.connect(owner).transferUnderlyingToken(owner.address, parseUnits('40', 8))
        await asset1.connect(owner).setPool(poolContract.address)
        expect((await asset1.cash()) / (await asset1.liability())).to.equal(0.6) // cov = 0.6

        const beforeBalance = await token1.balanceOf(user1.address)

        const [quotedWithdrawal] = await poolContract.quotePotentialWithdraw(token1.address, parseUnits('10', 8))

        const receipt = await poolContract
          .connect(user1)
          .withdraw(token1.address, parseUnits('10', 8), parseUnits('0', 8), user1.address, fiveSecondsSince)
        const afterBalance = await token1.balanceOf(user1.address)

        // check that quoted withdrawal is the same as amount withdrawn
        expect(afterBalance.sub(beforeBalance)).to.be.equal(quotedWithdrawal)

        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseUnits('9.953612344537722900', 8))
        expect(await asset1.balanceOf(user1.address)).to.be.equal(parseUnits('90', 8))
        expect(await asset1.cash()).to.be.equal(parseUnits('50.046387655462277100', 8))
        expect(await asset1.liability()).to.be.equal(parseUnits('90', 8))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('50.046387655462277100', 8))
        expect(await asset1.totalSupply()).to.be.equal(parseUnits('90', 8))

        await expect(receipt)
          .to.emit(poolContract, 'Withdraw')
          .withArgs(
            user1.address,
            token1.address,
            parseUnits('9.953612344537722900', 8),
            parseUnits('10', 8),
            user1.address
          )
      })

      it.skip('works with fee (cov < 0.4)', async function () {
        // Adjust coverage ratio to 0.3
        await asset1.connect(owner).setPool(owner.address)
        await asset1.connect(owner).removeCash(parseUnits('70', 8))
        await asset1.connect(owner).transferUnderlyingToken(owner.address, parseUnits('70', 8))
        await asset1.connect(owner).setPool(poolContract.address)
        // console.log(`Cash : ${await asset0.cash()}, Liabilities ${await asset0.liability()}`)
        expect((await asset1.cash()) / (await asset1.liability())).to.equal(0.3)

        const beforeBalance = await token1.balanceOf(user1.address)
        const [quotedWithdrawal] = await poolContract.quotePotentialWithdraw(token1.address, parseUnits('10', 8))

        const receipt = await poolContract
          .connect(user1)
          .withdraw(token1.address, parseUnits('10', 8), parseUnits('0', 8), user1.address, fiveSecondsSince)
        const afterBalance = await token1.balanceOf(user1.address)

        expect(afterBalance.sub(beforeBalance)).to.be.equal(quotedWithdrawal)
        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseUnits('3.661163217515241640', 8))
        expect(await asset1.balanceOf(user1.address)).to.be.equal(parseUnits('90', 8))
        expect(await asset1.cash()).to.be.equal(parseUnits('26.338836782484758360', 8))
        expect(await asset1.liability()).to.be.equal(parseUnits('90', 8))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('26.338836782484758360', 8))
        expect(await asset1.totalSupply()).to.be.equal(parseUnits('90', 8))

        await expect(receipt)
          .to.emit(poolContract, 'Withdraw')
          .withArgs(
            user1.address,
            token1.address,
            parseUnits('3.661163217515241640', 8),
            parseUnits('10', 8),
            user1.address
          )
      })

      it.skip('works on dust level (cov = 0.67)', async function () {
        await asset1.connect(owner).setPool(owner.address)
        await asset1.connect(owner).removeCash(parseUnits('32.768743', 8))
        await asset1.connect(owner).transferUnderlyingToken(owner.address, parseUnits('32.768743', 8))
        await asset1.connect(owner).setPool(poolContract.address)

        expect((await asset1.cash()) / (await asset1.liability())).to.equal(0.67231257) // cov = 0.67231257

        const [quotedWithdrawal, , enoughCash] = await poolContract.quotePotentialWithdraw(
          token1.address,
          parseUnits('10.814713', 8)
        )

        const beforeBalance = await token1.balanceOf(user1.address) // 9990000000000
        await poolContract
          .connect(user1)
          .withdraw(token1.address, parseUnits('10.814713', 8), parseUnits('0', 8), user1.address, fiveSecondsSince)
        const afterBalance = await token1.balanceOf(user1.address) // 9991081471300

        expect(enoughCash).to.be.true
        expect(afterBalance.sub(beforeBalance)).to.be.equal(quotedWithdrawal)

        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseUnits('10.798719', 8))
        expect(await this.asset.balanceOf(user1.address)).to.be.equal(parseUnits('89.185287', 8))
        expect(await this.asset.cash()).to.be.equal(parseUnits('56.432538', 8))
        expect(await this.asset.liability()).to.be.equal(parseUnits('89.185287', 8))
        expect(await this.asset.underlyingTokenBalance()).to.be.equal(parseUnits('56.432538', 8))
        expect(await this.asset.totalSupply()).to.be.equal(parseUnits('89.185287', 8))
      })

      it('cash not enough', async function () {
        await asset1.connect(owner).setPool(owner.address)
        await asset1.connect(owner).removeCash(parseUnits('32.768743', 8))
        await asset1.connect(owner).transferUnderlyingToken(owner.address, parseUnits('32.768743', 8))
        await asset1.connect(owner).setPool(poolContract.address)

        expect((await asset1.cash()) / (await asset1.liability())).to.equal(0.67231257) // cov = 0.67231257

        const [, , enoughCash] = await poolContract.quotePotentialWithdraw(token1.address, parseUnits('100', 8))

        expect(enoughCash).to.equal(false)
      })
    })
  })

  describe('3 assets', function () {
    beforeEach(async function () {
      // Transfer 100k from BUSD contract to users
      await token0.connect(owner).transfer(user1.address, parseEther('100000')) // 100 k
      await token0.connect(owner).transfer(user2.address, parseEther('600.123'))
      // Approve max allowance from users to pool
      await token0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token0.connect(user2).approve(poolContract.address, ethers.constants.MaxUint256)

      // Transfer 100k from vUSDC contract to users
      await token1.connect(owner).transfer(user1.address, parseUnits('100000', 8)) // 100 k
      await token1.connect(owner).transfer(user2.address, parseUnits('600.123', 8))
      // Approve max allowance from users to pool
      await token1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token1.connect(user2).approve(poolContract.address, ethers.constants.MaxUint256)

      // Transfer 100k from vUSDC contract to users
      await token2.connect(owner).transfer(user1.address, parseEther('100000')) // 100 k
      await token2.connect(owner).transfer(user2.address, parseEther('600.123'))
      // Approve max allowance from users to pool
      await token2.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token2.connect(user2).approve(poolContract.address, ethers.constants.MaxUint256)

      await asset1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
    })

    it('r* > 1, r < 1, withdraw fee > 0', async function () {
      // Faucet
      await asset0.connect(owner).setPool(owner.address)
      await asset0.connect(owner).addCash(parseEther('10516.66012'))
      await asset0.connect(owner).addLiability(parseEther('10000'))
      await asset0.connect(owner).setPool(poolContract.address)

      await asset1.connect(owner).setPool(owner.address)
      await asset1.connect(owner).addCash(parseUnits('506.4946', 8))
      await asset1.connect(owner).addLiability(parseUnits('1000', 8))
      await asset1.connect(owner).mint(user1.address, parseUnits('1000', 8))
      await asset1.connect(owner).setPool(poolContract.address)

      await token1.connect(owner).transfer(asset1.address, parseUnits('10000', 8))

      await asset2.connect(owner).setPool(owner.address)
      await asset2.connect(owner).addCash(parseEther('6000'))
      await asset2.connect(owner).addLiability(parseEther('5000'))
      await asset2.connect(owner).setPool(poolContract.address)

      // const surplusBefore = await poolContract.connect(owner).surplus()
      // expect(surplusBefore).to.equal(parseEther('1023.154720000000000000'))
      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('1.062117492331304537'),
        parseEther('16240.667538952096649000'),
      ])

      const receipt = await poolContract
        .connect(user1)
        .withdraw(token1.address, parseUnits('400', 8), 0, user1.address, fiveSecondsSince)

      await expect(receipt)
        .to.emit(poolContract, 'Withdraw')
        .withArgs(user1.address, token1.address, parseUnits('357.76378286', 8), parseUnits('400', 8), user1.address)

      // const surplusAfter = await poolContract.connect(owner).surplus()
      // expect(surplusAfter).to.equal(parseEther('1065.390937140000000000'))
      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('1.063710248544495204'),

        parseEther('15860.597481014408947400'),
      ])
    })

    it('r* > 1, r = 1, withdraw fee < 0', async function () {
      // Faucet
      await asset0.connect(owner).setPool(owner.address)
      await asset0.connect(owner).addCash(parseEther('10516.66012'))
      await asset0.connect(owner).addLiability(parseEther('10000'))
      await asset0.connect(owner).setPool(poolContract.address)

      await asset1.connect(owner).setPool(owner.address)
      await asset1.connect(owner).addCash(parseUnits('1000', 8))
      await asset1.connect(owner).addLiability(parseUnits('1000', 8))
      await asset1.connect(owner).mint(user1.address, parseUnits('1000', 8))
      await asset1.connect(owner).setPool(poolContract.address)

      await token1.connect(owner).transfer(asset1.address, parseUnits('10000', 8))

      await asset2.connect(owner).setPool(owner.address)
      await asset2.connect(owner).addCash(parseEther('6000'))
      await asset2.connect(owner).addLiability(parseEther('5000'))
      await asset2.connect(owner).setPool(poolContract.address)

      // const surplusBefore = await poolContract.connect(owner).surplus()
      // expect(surplusBefore).to.equal(parseEther('1516.660120000000000000'))
      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('1.094609075215282560'),
        parseEther('16782.890674540985455000'),
      ])

      const receipt = await poolContract
        .connect(user1)
        .withdraw(token1.address, parseUnits('800', 8), 0, user1.address, fiveSecondsSince)

      await expect(receipt)
        .to.emit(poolContract, 'Withdraw')
        .withArgs(user1.address, token1.address, parseUnits('800.29818965', 8), parseUnits('800', 8), user1.address)

      // const surplusAfter = await poolContract.connect(owner).surplus()
      // expect(surplusAfter).to.equal(parseEther('1516.361930350000000000'))
      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('1.099588500226792832'),
        parseEther('16022.577553146026439000'),
      ])
    })

    it('r* == 1, r < 1, withdraw fee > 0', async function () {
      // enableExactDeposit
      await poolContract.connect(owner).setShouldDistributeRetention(true)
      await poolContract.connect(owner).setShouldEnableExactDeposit(true)

      // Faucet
      await asset0.connect(owner).setPool(owner.address)
      await asset0.connect(owner).addCash(parseEther('12000'))
      await asset0.connect(owner).addLiability(parseEther('10000'))
      await asset0.connect(owner).setPool(poolContract.address)

      await asset1.connect(owner).setPool(owner.address)
      await asset1.connect(owner).addCash(parseUnits('8038.660816', 8))
      await asset1.connect(owner).addLiability(parseUnits('10000', 8))
      await asset1.connect(owner).mint(user1.address, parseUnits('10000', 8))
      await asset1.connect(owner).setPool(poolContract.address)

      await token1.connect(owner).transfer(asset1.address, parseUnits('10000', 8))

      await asset2.connect(owner).setPool(owner.address)
      await asset2.connect(owner).addCash(parseEther('1000'))
      await asset2.connect(owner).addLiability(parseEther('1000'))
      await asset2.connect(owner).setPool(poolContract.address)

      const receipt = await poolContract
        .connect(user1)
        .withdraw(token1.address, parseUnits('2000', 8), 0, user1.address, fiveSecondsSince)

      await expect(receipt)
        .to.emit(poolContract, 'Withdraw')
        .withArgs(user1.address, token1.address, parseUnits('1992.71394474', 8), parseUnits('2000', 8), user1.address)
    })
  })
})
