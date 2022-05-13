import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
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
  let PoolFactory: ContractFactory
  let poolContract: Contract
  let token0: Contract // BUSD
  let token1: Contract // vUSDC
  let token2: Contract // CAKE
  let asset0: Contract // BUSD LP
  let asset1: Contract // vUSDC LP
  let asset2: Contract // CAKE LP
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
    PoolFactory = await ethers.getContractFactory('Pool')

    // Deploy with factories
    token0 = await TestERC20Factory.deploy('Binance USD', 'BUSD', 18, parseUnits('1000000', 18)) // 1 mil BUSD
    token1 = await TestERC20Factory.deploy('Venus USDC', 'vUSDC', 8, parseUnits('10000000', 8)) // 10 mil vUSDC
    token2 = await TestERC20Factory.deploy('PancakeSwap Token', 'CAKE', 18, parseUnits('1000000', 18)) // 1 mil CAKE
    asset0 = await AssetFactory.deploy(token0.address, 'Binance USD LP', 'BUSD-LP')
    asset1 = await AssetFactory.deploy(token1.address, 'Venus USDC LP', 'vUSDC-LP')
    asset2 = await AssetFactory.deploy(token2.address, 'PancakeSwap Token LP', 'CAKE-LP')
    poolContract = await PoolFactory.connect(owner).deploy()

    // wait for transactions to be mined
    await token0.deployTransaction.wait()
    await token1.deployTransaction.wait()
    await token2.deployTransaction.wait()
    await asset0.deployTransaction.wait()
    await asset1.deployTransaction.wait()
    await asset2.deployTransaction.wait()
    await poolContract.deployTransaction.wait()

    // set pool address
    await asset0.setPool(poolContract.address)
    await asset1.setPool(poolContract.address)

    // initialize pool contract
    await poolContract.connect(owner).initialize(parseEther('0.001'), parseEther('0.0001'))

    // Add BUSD & USDC assets to pool
    await poolContract.connect(owner).addAsset(token0.address, asset0.address)
    await poolContract.connect(owner).addAsset(token1.address, asset1.address)
    await poolContract.connect(owner).addAsset(token2.address, asset2.address)
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
      await poolContract
        .connect(user1)
        .deposit(token0.address, parseEther('100'), 0, user1.address, fiveSecondsSince, false)
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

        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseEther('70')) // 70 (withdrawn) - 0 (deposited 100 already)
        expect(await asset0.balanceOf(user1.address)).to.be.equal(parseEther('30'))
        expect(await asset0.cash()).to.be.equal(parseEther('30'))
        expect(await asset0.liability()).to.be.equal(parseEther('30'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('30'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('30'))

        await expect(receipt)
          .to.emit(poolContract, 'Withdraw')
          .withArgs(user1.address, token0.address, parseEther('70'), parseEther('70'), user1.address)
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
      beforeEach(async function () {
        await poolContract.connect(owner).setFeeTo(ethers.Wallet.createRandom().address)

        await token0.connect(owner).approve(poolContract.address, ethers.constants.MaxUint256)
        await token1.connect(owner).approve(poolContract.address, ethers.constants.MaxUint256)
        await asset1.connect(owner).approve(poolContract.address, ethers.constants.MaxUint256)

        // Pool already has 100 token0 from user1.
        // Now owner deposits 10.1 token1 to withdraw token0 later.
        await poolContract
          .connect(owner)
          .deposit(token1.address, parseUnits('10.1', 8), 0, owner.address, fiveSecondsSince, false)
      })

      async function withdrawFromOtherAsset(
        who: SignerWithAddress,
        amount: BigNumber,
        fromToken: Contract,
        toToken: Contract,
        minAmount = BigNumber.from(0),
        deadline = fiveSecondsSince
      ) {
        return poolContract
          .connect(who)
          .withdrawFromOtherAsset(fromToken.address, toToken.address, amount, minAmount, who.address, deadline)
      }

      async function expectBalanceChange(
        change: BigNumber,
        who: SignerWithAddress,
        token: Contract,
        action: () => Promise<void>
      ) {
        const balanceBefore = await token.balanceOf(who.address)
        await action()
        const balanceAfter = await token.balanceOf(who.address)
        expect(balanceAfter.sub(balanceBefore)).to.equal(change)
      }

      it('reverts when withdraw all liquidity', async function () {
        await expect(withdrawFromOtherAsset(owner, parseEther('10.1'), token1, token0)).to.be.revertedWith(
          'CORE_UNDERFLOW'
        )
      })

      it('reverts when deadline passes', async function () {
        await expect(
          withdrawFromOtherAsset(owner, parseEther('1'), token1, token0, undefined, fiveSecondsAgo)
        ).to.be.revertedWith('WOMBAT_EXPIRED()')
      })

      it('reverts when amount is too low', async function () {
        await expect(
          withdrawFromOtherAsset(owner, parseEther('1'), token1, token0, parseEther('1'))
        ).to.be.revertedWith('WOMBAT_AMOUNT_TOO_LOW()')
      })

      it('reverts when pool is paused', async function () {
        await poolContract.connect(owner).pause()
        await expect(withdrawFromOtherAsset(owner, parseEther('10'), token1, token0)).to.be.revertedWith(
          'Pausable: paused'
        )
      })

      it('reverts when toToken is paused', async function () {
        await poolContract.connect(owner).pauseAsset(token1.address)
        await expect(withdrawFromOtherAsset(owner, parseEther('10'), token1, token0)).to.be.revertedWith(
          'WOMBAT_ASSET_ALREADY_PAUSED()'
        )
      })

      it('works when fromToken is paused', async function () {
        await poolContract.connect(owner).pauseAsset(token0.address)
        await expect(withdrawFromOtherAsset(owner, parseEther('10'), token1, token0)).to.not.be.reverted
      })

      it('withdraw token0 from token1 works', async function () {
        const expectedAmount = parseEther('9.988002575408403004')
        {
          // callStatic has no side-effect on-chain
          const quoteAmount = await poolContract.callStatic.withdrawFromOtherAsset(
            token1.address,
            token0.address,
            parseEther('10'),
            0,
            owner.address,
            fiveSecondsSince
          )
          expect(quoteAmount).to.equal(expectedAmount)
        }

        await expectBalanceChange(expectedAmount, owner, token0, async () => {
          const receipt = await withdrawFromOtherAsset(owner, parseEther('10'), token1, token0)
          await expect(receipt)
            .to.emit(poolContract, 'Withdraw')
            .withArgs(owner.address, token0.address, expectedAmount, parseEther('10'), owner.address)
        })
      })

      // skipped as cov ratio < 1% is reverted
      it.skip('withdraw more token0 than available', async function () {
        // User1 swaps 10 token0, leaving about ~0.1 token1 in the pool
        // Now owner wants to withdraw 10 token1 as token0.
        await poolContract
          .connect(user1)
          .swap(token0.address, token1.address, parseEther('10'), 0, user1.address, fiveSecondsSince)
        // verify there is not enough token1
        expect(await token1.balanceOf(asset1.address)).to.equal(parseUnits('0.36331391', 8))

        const expectedAmount = parseEther('10.262080051991132960')
        // verify withdrawFromOtherAsset is better than withdraw.
        const [withdrawAmount] = await poolContract.quotePotentialWithdraw(token1.address, parseEther('10'))
        expect(withdrawAmount).to.lt(expectedAmount)

        await expectBalanceChange(expectedAmount, owner, token0, async () => {
          const receipt = await withdrawFromOtherAsset(owner, parseEther('10'), token1, token0)
          await expect(receipt)
            .to.emit(poolContract, 'Withdraw')
            .withArgs(owner.address, token0.address, expectedAmount, parseEther('10'), owner.address)
        })
      })

      // skipped as cov ratio < 1% is reverted
      describe.skip('withdraw more token0 than available multiple times', function () {
        ;[
          {
            // Expect the payout to be about the same in different cases.
            withdrawAmounts: ['10'],
            expectedAmounts: ['10.262080051991132960'],
          },
          {
            withdrawAmounts: ['5', '5'],
            expectedAmounts: ['5.200032572565087213', '5.062047479420219930'],
          },
          {
            withdrawAmounts: ['1', '9'],
            expectedAmounts: ['1.051043899125498910', '9.211036152865893025'],
          },
          {
            withdrawAmounts: ['0.1', '9.9'],
            expectedAmounts: ['0.105352714556066884', '10.156727337434959287'],
          },
          {
            withdrawAmounts: ['9', '1'],
            expectedAmounts: ['9.260710849771705295', '1.001369202213093599'],
          },
          {
            withdrawAmounts: ['9.9', '0.1'],
            expectedAmounts: ['10.162191557581230993', '0.099888494403612296'],
          },
          {
            withdrawAmounts: ['3', '3', '3', '1'],
            expectedAmounts: [
              '3.136576076793980144',
              '3.086905773681927556',
              '3.037228999295756999',
              '1.001369202213093699',
            ],
          },
        ].forEach(({ withdrawAmounts, expectedAmounts }) => {
          it(`(${withdrawAmounts.join(', ')})`, async function () {
            // User1 swaps out 10 token1
            // Owner will withdraw 10 token0 in two txns
            await poolContract
              .connect(user1)
              .swap(token0.address, token1.address, parseEther('10'), parseEther('0'), user1.address, fiveSecondsSince)
            // not enough token1 for owner to withdraw
            expect(await token1.balanceOf(asset1.address)).to.lt(parseUnits('10', 8))

            expect(withdrawAmounts.length).to.equal(expectedAmounts.length)
            for (let i = 0; i < withdrawAmounts.length; i++) {
              const withdrawAmount = parseEther(withdrawAmounts[i])
              const expectedAmount = parseEther(expectedAmounts[i])
              await expectBalanceChange(expectedAmount, owner, token0, async () => {
                const receipt = await withdrawFromOtherAsset(owner, withdrawAmount, token1, token0)
                await expect(receipt)
                  .to.emit(poolContract, 'Withdraw')
                  .withArgs(owner.address, token0.address, expectedAmount, withdrawAmount, owner.address)
              })
            }
          })
        })
      })
    })

    describe('quotePotentialWithdraw', () => {
      it('works with fee', async function () {
        // Adjust coverage ratio to around 0.6
        await asset0.connect(owner).setPool(owner.address)
        await asset0.connect(owner).removeCash(parseEther('40'))
        await asset0.connect(owner).transferUnderlyingToken(owner.address, parseEther('40'))
        await asset0.connect(owner).addLiability(parseEther('1.768743776499783944'))
        await asset0.connect(owner).setPool(poolContract.address)

        const [actualAmount, fee] = await poolContract.quotePotentialWithdraw(token0.address, parseEther('10'))

        expect(actualAmount).to.be.equal(parseEther('10.170955082800484398'))
        expect(fee).to.be.equal(parseEther('0.005919294849493996'))
      })

      it('works with 0 fee (cov >= 1)', async function () {
        const [actualAmount, fee] = await poolContract.quotePotentialWithdraw(token0.address, parseEther('10'))

        expect(actualAmount).to.be.equal(parseEther('10'))
        expect(fee).to.be.equal(0)
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
      await poolContract
        .connect(user1)
        .deposit(token1.address, parseUnits('100', 8), 0, user1.address, fiveSecondsSince, false)
    })
    describe('withdraw', function () {
      it('works (first LP)', async function () {
        // Get vUSDC balance of user1
        const beforeBalance = await token1.balanceOf(user1.address)

        // quote withdrawal => 70000000000000000000
        const [quotedWithdrawal] = await poolContract.quotePotentialWithdraw(token1.address, parseEther('70'))

        const receipt = await poolContract
          .connect(user1)
          .withdraw(token1.address, parseEther('70'), parseUnits('70', 8), user1.address, fiveSecondsSince)
        const afterBalance = await token1.balanceOf(user1.address)

        // check that quoted withdrawal is the same as amount withdrawn
        expect(afterBalance.sub(beforeBalance)).to.be.equal(quotedWithdrawal)
        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseUnits('70', 8)) // 70 (withdrawn) - 0 (deposited 100 already)
        expect(await asset1.balanceOf(user1.address)).to.be.equal(parseEther('30'))
        // not exactly 30 due to deposit reward > 0, as targeted coverage ratio = 1.2 (we are 1).
        expect(await asset1.cash()).to.be.equal(parseEther('30'))
        expect(await asset1.liability()).to.be.equal(parseEther('30'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('30', 8))
        expect(await asset1.totalSupply()).to.be.equal(parseEther('30'))

        await expect(receipt)
          .to.emit(poolContract, 'Withdraw')
          .withArgs(user1.address, token1.address, parseUnits('70', 8), parseEther('70'), user1.address)
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

      // user1 deposits 100 vUSDC to pool contract
      await poolContract
        .connect(user1)
        .deposit(token0.address, parseUnits('100', 8), 0, user1.address, fiveSecondsSince, false)

      // Transfer 100k from vUSDC contract to users
      await token1.connect(owner).transfer(user1.address, parseUnits('100000', 8)) // 100 k
      await token1.connect(owner).transfer(user2.address, parseUnits('600.123', 8))
      // Approve max allowance from users to pool
      await token1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token1.connect(user2).approve(poolContract.address, ethers.constants.MaxUint256)

      // user1 deposits 100 vUSDC to pool contract
      await poolContract
        .connect(user1)
        .deposit(token1.address, parseUnits('100', 8), 0, user1.address, fiveSecondsSince, false)

      // Transfer 100k from vUSDC contract to users
      await token2.connect(owner).transfer(user1.address, parseEther('100000')) // 100 k
      await token2.connect(owner).transfer(user2.address, parseEther('600.123'))
      // Approve max allowance from users to pool
      await token2.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token2.connect(user2).approve(poolContract.address, ethers.constants.MaxUint256)

      await asset1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)

      // user1 deposits 100 vUSDC to pool contract
      await poolContract
        .connect(user1)
        .deposit(token2.address, parseUnits('100', 8), 0, user1.address, fiveSecondsSince, false)
    })

    describe('quotePotentialWithdrawFromOtherAsset', () => {
      it('works with assets with different decimals (18->8)', async function () {
        // asset 0 (BUSD, 18 decimals), asset 1 (vUSDC, 8 decimals)
        // Adjust coverage ratio to around 0.6
        await asset0.connect(owner).setPool(owner.address)
        await asset0.connect(owner).removeCash(parseEther('40'))
        await asset0.connect(owner).transferUnderlyingToken(owner.address, parseEther('40'))
        await asset0.connect(owner).addLiability(parseEther('1.768743776499783944'))
        await asset0.connect(owner).setPool(poolContract.address)

        await asset1.connect(owner).setPool(owner.address)
        await asset1.connect(owner).removeCash(parseEther('40'))
        await asset1.connect(owner).transferUnderlyingToken(owner.address, parseEther('40'))
        await asset1.connect(owner).addLiability(parseEther('1.768743776499783944'))
        await asset1.connect(owner).setPool(poolContract.address)

        const [actualAmount, fee] = await poolContract.quotePotentialWithdrawFromOtherAsset(
          token0.address,
          token1.address,
          parseEther('10')
        )
        console.log(actualAmount, fee)
      })

      it('works with assets with different decimals (8->18)', async function () {
        // asset 0 (BUSD, 18 decimals), asset 1 (vUSDC, 8 decimals)
        // Adjust coverage ratio to around 0.6
        await asset1.connect(owner).setPool(owner.address)
        await asset1.connect(owner).removeCash(parseEther('40'))
        await asset1.connect(owner).transferUnderlyingToken(owner.address, parseEther('40'))
        await asset1.connect(owner).addLiability(parseEther('1.768743776499783944'))
        await asset1.connect(owner).setPool(poolContract.address)

        await asset0.connect(owner).setPool(owner.address)
        await asset0.connect(owner).removeCash(parseEther('40'))
        await asset0.connect(owner).transferUnderlyingToken(owner.address, parseEther('40'))
        await asset0.connect(owner).addLiability(parseEther('1.768743776499783944'))
        await asset0.connect(owner).setPool(poolContract.address)

        const [actualAmount, fee] = await poolContract.quotePotentialWithdrawFromOtherAsset(
          token1.address,
          token0.address,
          parseEther('10')
        )
        console.log(actualAmount, fee)
      })

      it('works with assets with same decimals', async function () {
        // asset 0 (BUSD, 18 decimals), asset 2 (CAKE, 18 decimals)
        // Adjust coverage ratio to around 0.6
        await asset0.connect(owner).setPool(owner.address)
        await asset0.connect(owner).removeCash(parseEther('40'))
        await asset0.connect(owner).transferUnderlyingToken(owner.address, parseEther('40'))
        await asset0.connect(owner).addLiability(parseEther('1.768743776499783944'))
        await asset0.connect(owner).setPool(poolContract.address)

        await asset2.connect(owner).setPool(owner.address)
        await asset2.connect(owner).removeCash(parseEther('40'))
        await asset2.connect(owner).transferUnderlyingToken(owner.address, parseEther('40'))
        await asset2.connect(owner).addLiability(parseEther('1.768743776499783944'))
        await asset2.connect(owner).setPool(poolContract.address)

        const [actualAmount, fee] = await poolContract.quotePotentialWithdrawFromOtherAsset(
          token0.address,
          token1.address,
          parseEther('10')
        )
        console.log(actualAmount, fee)
      })
    })

    it('r* = 1, r = 0.8, withdraw fee > 0', async function () {
      // Faucet
      await asset0.connect(owner).setPool(owner.address)
      await asset0.connect(owner).addCash(parseEther('12000'))
      await asset0.connect(owner).addLiability(parseEther('10000'))
      await asset0.connect(owner).setPool(poolContract.address)

      await asset1.connect(owner).setPool(owner.address)
      await asset1.connect(owner).addCash(parseEther('8000.83203342'))
      await asset1.connect(owner).addLiability(parseEther('10000'))
      await asset1.connect(owner).mint(user1.address, parseEther('10000'))
      await asset1.connect(owner).setPool(poolContract.address)

      await token1.connect(owner).transfer(asset1.address, parseUnits('10000', 8))

      await asset2.connect(owner).setPool(owner.address)
      await asset2.connect(owner).addCash(parseEther('1000'))
      await asset2.connect(owner).addLiability(parseEther('1000'))
      await asset2.connect(owner).setPool(poolContract.address)

      const receipt = await poolContract
        .connect(user1)
        .withdraw(token1.address, parseEther('2000'), 0, user1.address, fiveSecondsSince)

      await expect(receipt)
        .to.emit(poolContract, 'Withdraw')
        .withArgs(user1.address, token1.address, parseUnits('1999.83380774', 8), parseEther('2000'), user1.address)

      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('1.000000000000193944'),
        parseEther('18981.000000003688622000'),
      ])
    })

    it('r* = 1, r = 1.7, A = 0.001, withdraw fee > 0', async function () {
      await poolContract.connect(owner).setAmpFactor(parseEther('0.001'))

      // Faucet
      await asset0.connect(owner).setPool(owner.address)
      await asset0.connect(owner).addCash(parseEther('3000'))
      await asset0.connect(owner).addLiability(parseEther('10000'))
      await asset0.connect(owner).setPool(poolContract.address)

      await asset1.connect(owner).setPool(owner.address)
      await asset1.connect(owner).addCash(parseEther('17019.20904705'))
      await asset1.connect(owner).addLiability(parseEther('10000'))
      await asset1.connect(owner).mint(user1.address, parseEther('10000'))
      await asset1.connect(owner).setPool(poolContract.address)

      await token1.connect(owner).transfer(asset1.address, parseUnits('10000', 8))

      await asset2.connect(owner).setPool(owner.address)
      await asset2.connect(owner).addCash(parseEther('1000'))
      await asset2.connect(owner).addLiability(parseEther('1000'))
      await asset2.connect(owner).setPool(poolContract.address)

      const receipt = await poolContract
        .connect(user1)
        .withdraw(token1.address, parseEther('4000'), 0, user1.address, fiveSecondsSince)

      await expect(receipt)
        .to.emit(poolContract, 'Withdraw')
        .withArgs(user1.address, token1.address, parseUnits('3999.11075762', 8), parseEther('4000'), user1.address)

      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('1.000000000000153891'),
        parseEther('16983.000000002618760000'),
      ])
    })
  })
})
