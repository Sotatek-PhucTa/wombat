import { ethers } from 'hardhat'
import { parseEther, parseUnits } from '@ethersproject/units'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { Contract, ContractFactory } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const { expect } = chai
chai.use(solidity)

describe('Pool - Swap', function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let AssetFactory: ContractFactory
  let TestERC20Factory: ContractFactory
  let PoolFactory: ContractFactory
  let poolContract: Contract
  let token0: Contract // BUSD
  let token1: Contract // USDC
  let token2: Contract // CAKE
  let token3: Contract // USDT
  let asset0: Contract // BUSD LP
  let asset1: Contract // USDC LP
  let asset2: Contract // CAKE LP
  let asset3: Contract // USDT LP
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

    // Deploy with factories
    token0 = await TestERC20Factory.deploy('Binance USD', 'BUSD', 18, parseUnits('1000000', 18)) // 1 mil BUSD
    token1 = await TestERC20Factory.deploy('Venus USDC', 'vUSDC', 8, parseUnits('10000000', 8)) // 10 mil vUSDC
    token2 = await TestERC20Factory.deploy('PancakeSwap Token', 'CAKE', 18, parseUnits('1000000', 18)) // 1 mil CAKE
    token3 = await TestERC20Factory.deploy('USD Tether', 'USDT', 18, parseUnits('1000000', 18)) // 1 mil USDT
    asset0 = await AssetFactory.deploy(token0.address, 'Binance USD LP', 'BUSD-LP')
    asset1 = await AssetFactory.deploy(token1.address, 'Venus USDC LP', 'vUSDC-LP')
    asset2 = await AssetFactory.deploy(token2.address, 'PancakeSwap Token LP', 'CAKE-LP')
    asset3 = await AssetFactory.deploy(token3.address, 'USD Tether Token LP', 'USDT-LP')
    poolContract = await PoolFactory.connect(owner).deploy()

    // wait for transactions to be mined
    await token0.deployTransaction.wait()
    await token1.deployTransaction.wait()
    await token2.deployTransaction.wait()
    await token3.deployTransaction.wait()
    await asset0.deployTransaction.wait()
    await asset1.deployTransaction.wait()
    await asset2.deployTransaction.wait()
    await asset3.deployTransaction.wait()
    await poolContract.deployTransaction.wait()

    // set pool address
    await asset0.setPool(poolContract.address)
    await asset1.setPool(poolContract.address)
    await asset2.setPool(poolContract.address)
    await asset3.setPool(poolContract.address)

    // initialize pool contract
    poolContract.connect(owner).initialize(parseEther('0.05'), parseEther('0.0004'))

    // Add BUSD & USDC & USDT assets to pool
    await poolContract.connect(owner).addAsset(token0.address, asset0.address)
    await poolContract.connect(owner).addAsset(token1.address, asset1.address)
    await poolContract.connect(owner).addAsset(token2.address, asset2.address)
    await poolContract.connect(owner).addAsset(token3.address, asset3.address)
    await poolContract.connect(owner).setShouldMaintainGlobalEquil(false)
  })

  describe('Asset BUSD (18 decimals) and vUSDC (6 decimals)', function () {
    beforeEach(async function () {
      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000')) // 100k BUSD
      await token1.connect(owner).transfer(user1.address, parseUnits('100000', 8)) // 100k vUSDC
      await token3.connect(owner).transfer(user1.address, parseEther('100000')) // 100k USDT
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token3.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)

      // deposit 10k BUSD and 1k vUSDC and 1k USDT to pool
      await poolContract.connect(user1).deposit(token0.address, parseEther('10000'), user1.address, fiveSecondsSince)
      await poolContract.connect(user1).deposit(token1.address, parseUnits('1000', 8), user1.address, fiveSecondsSince)
      await poolContract.connect(user1).deposit(token3.address, parseEther('1000'), user1.address, fiveSecondsSince)
    })

    describe('swap', function () {
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
      })

      it('works (BUSD -> vUSDC) with haircut fees', async function () {
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
      })

      it('works (vUSDC -> BUSD) without haircut fees', async function () {
        // set haircut rate to 0
        poolContract.connect(owner).setHaircutRate(0)
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
        expect(tokenGot).to.be.equal(parseEther('99.519462997587760000'))

        //check if token got is equal to token quoted
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('9900.480537002412240000'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('9900.480537002412240000')) // should always equal cash

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
            parseEther('99.519462997587760000'),
            user1.address
          )

        expect(tokenSent.add(await asset1.cash())).to.be.equal(parseUnits('1000', 8))
        expect(tokenGot.add(await asset0.cash())).to.be.equal(parseEther('10000'))
      })

      it('works (vUSDC -> BUSD) with haircut fees', async function () {
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
      })

      it('works (BUSD -> exact vUSDC output) 18 and 8 decimals without haircut fees', async function () {
        // set haircut rate to 0
        poolContract.connect(owner).setHaircutRate(0)
        const beforeFromBalance = await token0.balanceOf(user1.address)
        const beforeToBalance = await token1.balanceOf(user1.address)

        // output of -100 amount
        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token1.address, token0.address, parseUnits('-100', 8))

        // console.log(324, quotedAmount)
        // check if input token amount is correct
        expect(quotedAmount).to.be.equal(parseEther('100.576790831788430000'))

        await poolContract.connect(user1).swap(
          token0.address, // input 1st token
          token1.address,
          parseEther('100.576790831788430000'), // input to get exact 100 output
          parseUnits('90', 8), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token0.balanceOf(user1.address)
        const afterToBalance = await token1.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)
        expect(tokenSent).to.be.equal(parseEther('-100.576790831788430000'))
        expect(tokenGot).to.be.equal(parseUnits('99.99999999', 8)) // rounding error
      })

      it('works (BUSD -> exact vUSDC output) 18 and 8 decimals with haircut fees', async function () {
        // poolContract.connect(owner).setHaircutRate(parseEther('0.0001'))
        const beforeFromBalance = await token0.balanceOf(user1.address)
        const beforeToBalance = await token1.balanceOf(user1.address)

        // output of -100 amount
        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token1.address, token0.address, parseUnits('-100', 8))

        // check if input token amount is correct
        expect(quotedAmount).to.be.equal(parseEther('100.617275942224310000'))

        await poolContract.connect(user1).swap(
          token0.address, // input 1st token
          token1.address,
          parseEther('100.617275942224310000'), // input to get exact 100 output
          parseUnits('90', 8), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token0.balanceOf(user1.address)
        const afterToBalance = await token1.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)
        expect(tokenSent).to.be.equal(parseEther('-100.617275942224310000'))
        expect(tokenGot).to.be.equal(parseUnits('99.99998399', 8)) // rounding error
      })

      it('works (BUSD -> exact USDT output) both 18 decimals with haircut fees', async function () {
        // poolContract.connect(owner).setHaircutRate(parseEther('0.0001'))
        const beforeFromBalance = await token0.balanceOf(user1.address)
        const beforeToBalance = await token3.balanceOf(user1.address)

        // output of -100 amount
        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token3.address, token0.address, parseUnits('-100', 18))

        // check if input token amount is correct
        expect(quotedAmount).to.be.equal(parseEther('100.617275942224310000'))

        await poolContract.connect(user1).swap(
          token0.address, // input 1st token
          token3.address,
          parseEther('100.617275942224310000'), // input to get exact 100 output
          parseEther('90'), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token0.balanceOf(user1.address)
        const afterToBalance = await token3.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)
        expect(tokenSent).to.be.equal(parseEther('-100.617275942224310000'))
        expect(tokenGot).to.be.equal(parseUnits('99.999983999999990004', 18)) // rounding error
      })

      it.skip('Rewards actions that move BUSD coverage ratio (Rx) closer', async function () {
        // TODO
      })

      it.skip('Penalize actions that move BUSD coverage ratio (Rx) further away', async function () {
        // TODO
      })

      it('reverts if asset paused', async function () {
        await poolContract.connect(owner).pauseAsset(token1.address)
        await expect(
          poolContract.connect(user1).swap(
            token1.address,
            token2.address,
            parseUnits('100', 8),
            parseEther('90'), //expect at least 90% of ideal quoted amount
            user1.address,
            fiveSecondsSince
          )
        ).to.be.revertedWith('WOMBAT_ASSET_ALREADY_PAUSED')
      })

      it('allows swap if asset paused and unpaused after', async function () {
        await poolContract.connect(owner).pauseAsset(token1.address)
        await expect(
          poolContract.connect(user1).swap(
            token1.address,
            token2.address,
            parseUnits('100', 8),
            parseEther('90'), //expect at least 90% of ideal quoted amount
            user1.address,
            fiveSecondsSince
          )
        ).to.be.revertedWith('WOMBAT_ASSET_ALREADY_PAUSED')

        await poolContract.connect(owner).unpauseAsset(token1.address)
        const receipt = await poolContract.connect(user1).swap(
          token1.address,
          token0.address,
          parseUnits('100', 8),
          parseEther('90'), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
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
      })

      it.skip('allows swapping then withdrawing', async function () {
        // Approve spending by pool
        await asset0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
        await asset1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)

        // Swap 100 DAI to USDC
        const swapReceipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), //expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        expect(swapReceipt)
          .to.emit(poolContract, 'Swap')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('100'),
            parseUnits('99.597907', 8),
            user1.address
          )

        // Then try to withdraw 1000 USDC
        const withdrawalReceipt = await poolContract
          .connect(user1)
          .withdraw(token1.address, parseUnits('1000', 8), parseUnits('999', 8), user1.address, fiveSecondsSince)

        expect(withdrawalReceipt)
          .to.emit(poolContract, 'Withdraw')
          .withArgs(user1.address, token1.address, parseUnits('999.999877', 8), parseUnits('1000', 8), user1.address)
      })

      it('reverts if passed deadline', async function () {
        await expect(
          poolContract.connect(user1).swap(
            token1.address,
            token0.address,
            parseUnits('100', 8),
            parseEther('90'), //expect at least 90% of ideal quoted amount
            user1.address,
            fiveSecondsAgo
          )
        ).to.be.revertedWith('WOMBAT_EXPIRED')
      })

      it('reverts if amount to receive is less than expected', async function () {
        await expect(
          poolContract.connect(user1).swap(
            token1.address,
            token0.address,
            parseUnits('100', 8),
            parseEther('100'), //expect at least 100% of ideal quoted amount
            user1.address,
            fiveSecondsSince
          )
        ).to.be.revertedWith('WOMBAT_AMOUNT_TOO_LOW')
      })

      it('reverts if pool paused', async function () {
        await poolContract.connect(owner).pause()
        await expect(
          poolContract.connect(user1).swap(
            token1.address,
            token0.address,
            parseUnits('100', 8),
            parseEther('90'), //expect at least 90% of ideal quoted amount
            user1.address,
            fiveSecondsSince
          )
        ).to.be.revertedWith('Pausable: paused')
      })

      it('reverts if zero address provided', async function () {
        await expect(
          poolContract.connect(user1).swap(
            ethers.constants.AddressZero,
            token0.address,
            parseUnits('100', 8),
            parseEther('90'), //expect at least 90% of ideal quoted amount
            user1.address,
            fiveSecondsSince
          )
        ).to.be.revertedWith('WOMBAT_ASSET_NOT_EXISTS')

        await expect(
          poolContract.connect(user1).swap(
            token1.address,
            ethers.constants.AddressZero,
            parseUnits('100', 8),
            parseEther('90'), //expect at least 90% of ideal quoted amount
            user1.address,
            fiveSecondsSince
          )
        ).to.be.revertedWith('WOMBAT_ASSET_NOT_EXISTS')
      })

      it('reverts if asset not exist', async function () {
        const pax = await TestERC20Factory.connect(owner).deploy('PAX', 'PAX', 18, '0')
        await pax.deployTransaction.wait()
        await expect(
          poolContract
            .connect(user1)
            .swap(pax.address, token1.address, parseEther('100'), parseUnits('90', 18), user1.address, fiveSecondsSince)
        ).to.be.revertedWith('WOMBAT_ASSET_NOT_EXISTS')
      })

      it('reverts if not have enough from tokens', async function () {
        await expect(
          poolContract.connect(user1).swap(
            token1.address,
            token0.address,
            parseUnits('300000000', 8),
            parseEther('1200'), //expect at least 90% of ideal quoted amount
            user1.address,
            fiveSecondsSince
          )
        ).to.be.revertedWith('ERC20: transfer amount exceeds balance')
      })
    })
  })
})
