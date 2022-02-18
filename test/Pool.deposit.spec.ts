import { parseEther, parseUnits } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { Contract, ContractFactory } from 'ethers'
import { ethers } from 'hardhat'

const { expect } = chai
chai.use(solidity)

describe('Pool - Deposit', function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let AssetFactory: ContractFactory
  let TestERC20Factory: ContractFactory
  let PoolFactory: ContractFactory
  let poolContract: Contract
  let token0: Contract // BUSD
  let token1: Contract // USDC
  let token2: Contract // CAKE
  let asset0: Contract // BUSD LP
  let asset1: Contract // USDC LP
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
    await asset2.setPool(poolContract.address)

    // initialize pool contract
    poolContract.connect(owner).initialize(parseEther('0.05'), parseEther('0.0004'))

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
    })

    describe('quotePotentialDeposit', function () {
      it('works', async function () {
        const [liquidity, fee] = await poolContract.quotePotentialDeposit(token0.address, parseEther('100'))
        expect(liquidity).to.be.equal(parseEther('100'))
        expect(fee).to.be.equal(0)
      })
    })

    describe('deposit', function () {
      it('works (first LP)', async function () {
        // Get BUSD balance of user1
        const beforeBalance = await token0.balanceOf(user1.address)
        // user1 deposits 100 BUSD to pool contract
        const receipt = await poolContract
          .connect(user1)
          .deposit(token0.address, parseEther('100'), user1.address, fiveSecondsSince)
        const afterBalance = await token0.balanceOf(user1.address)

        expect(await asset0.cash()).to.be.equal(parseEther('100'))
        expect(await asset0.liability()).to.be.equal(parseEther('100'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('100'))
        expect(await asset0.balanceOf(user1.address)).to.be.equal(parseEther('100'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('100'))
        expect(afterBalance).to.be.equal(parseEther('99900')) // 100k - 100
        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseEther('-100')) // 100k - 99.9k

        await expect(receipt)
          .to.emit(poolContract, 'Deposit')
          .withArgs(user1.address, token0.address, parseEther('100'), parseEther('100'), user1.address)
      })

      it('works (second LP)', async function () {
        // user1 deposits 100 BUSD to pool contract
        const beforeBalance1 = await token0.balanceOf(user1.address)
        await poolContract.connect(user1).deposit(token0.address, parseEther('100'), user1.address, fiveSecondsSince)
        // user2 deposits 100.123 BUSD to pool contract
        const beforeBalance2 = await token0.balanceOf(user2.address)
        await poolContract
          .connect(user2)
          .deposit(token0.address, parseEther('100.123'), user2.address, fiveSecondsSince)
        const afterBalance1 = await token0.balanceOf(user1.address)
        const afterBalance2 = await token0.balanceOf(user2.address)

        expect(await asset0.cash()).to.be.equal(parseEther('200.123'))
        expect(await asset0.liability()).to.be.equal(parseEther('200.123'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('200.123'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('100.123'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('200.123'))

        expect(afterBalance1).to.be.equal(parseEther('99900')) // 100k - 100
        expect(afterBalance1.sub(beforeBalance1)).to.be.equal(parseEther('-100')) // 99.9 - 100k
        expect(afterBalance2).to.be.equal(parseEther('500')) // 600.123 - 100.123
        expect(afterBalance2.sub(beforeBalance2)).to.be.equal(parseEther('-100.123')) // 500 - 600.123
      })

      it('maintains the LP token supply and liability ratio', async function () {
        // user1 deposits 100 BUSD to pool contract
        await poolContract.connect(user1).deposit(token0.address, parseEther('100'), user1.address, fiveSecondsSince)
        // Add liability (from owner account)
        await asset0.connect(owner).setPool(owner.address)
        await asset0.connect(owner).addLiability(parseEther('1.768743776499783944'))
        // Reset pool to real pool address
        await asset0.connect(owner).setPool(poolContract.address)

        const receipt = await poolContract
          .connect(user1)
          .deposit(token0.address, parseEther('100'), user2.address, fiveSecondsSince)

        expect(await asset0.liability()).to.be.equal(parseEther('201.769488019652669444'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('98.262728350828713840'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('198.262728350828713840'))
        expect((await asset0.liability()) / (await asset0.totalSupply())).to.equal(1.0176874377649978)

        await expect(receipt)
          .to.emit(poolContract, 'Deposit')
          .withArgs(
            user1.address,
            token0.address,
            parseEther('100'),
            parseEther('98.262728350828713840'),
            user2.address
          )
      })

      it.skip('applies deposit fee when cov > 1 to prevent deposit arbitrage', async function () {
        // First deposit 100 BUSD
        // Get BUSD balance of user1
        const beforeBalance = await token0.balanceOf(user1.address)
        // Deposit from user1 to pool 100 BUSD
        const receipt = await poolContract
          .connect(user1)
          .deposit(token0.address, parseEther('100'), user1.address, fiveSecondsSince)
        const afterBalance = await token0.balanceOf(user1.address)

        expect(await asset0.cash()).to.be.equal(parseEther('100'))
        expect(await asset0.liability()).to.be.equal(parseEther('100'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('100'))
        expect(await asset0.balanceOf(user1.address)).to.be.equal(parseEther('100'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('100'))
        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseEther('-100'))

        await expect(receipt)
          .to.emit(poolContract, 'Deposit')
          .withArgs(user1.address, token0.address, parseEther('100'), parseEther('100'), user1.address)

        // Next, adjust coverage ratio to = 2 > 1
        await asset0.connect(owner).setPool(owner.address)
        await token0.connect(owner).transfer(asset0.address, parseEther('100')) // transfer BUSD to Asset to back
        await asset0.connect(owner).addCash(parseEther('100'))
        // await asset0.connect(owner).transferToken(owner.address, parseEther('40'))
        await asset0.connect(owner).setPool(poolContract.address)
        expect((await asset0.cash()) / (await asset0.liability())).to.equal(2) // cov = 2

        // Now that cov = 2 > 1
        // A = 200 , L = 100
        // try to deposit again
        // Deposit from user1 to pool 100 BUSD
        await poolContract.connect(user1).deposit(token0.address, parseEther('100'), user1.address, fiveSecondsSince)
        const afterBalance2 = await token0.balanceOf(user1.address)

        expect(await asset0.cash()).to.be.equal(parseEther('300')) // Assets = 200 + 100
        expect(await asset0.liability()).to.be.equal(parseEther('199.999200210048011000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('300'))
        expect(await asset0.balanceOf(user1.address)).to.be.equal(parseEther('199.999200210048011000'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('199.999200210048011000'))
        expect(afterBalance2.sub(beforeBalance)).to.be.equal(parseEther('-200'))

        await expect(receipt)
          .to.emit(poolContract, 'Deposit')
          .withArgs(user1.address, token0.address, parseEther('100'), parseEther('100'), user1.address)

        // Now, try to withdraw 100 and see if we can perform arbitrage : if amount withdrawn is > 100
        const beforeBalance3 = await token0.balanceOf(user1.address)

        const [quotedWithdrawal] = await poolContract.quotePotentialWithdraw(token0.address, parseEther('100'))

        // approve asset spending by pool
        await asset0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)

        const receipt3 = await poolContract
          .connect(user1)
          .withdraw(token0.address, parseEther('100'), parseEther('0'), user1.address, fiveSecondsSince)
        const afterBalance3 = await token0.balanceOf(user1.address)

        // check that quoted withdrawal is the same as amount withdrawn
        expect(afterBalance3.sub(beforeBalance3)).to.be.equal(quotedWithdrawal)

        // expect(afterBalance3.sub(beforeBalance3)).to.be.below(parseEther('100'))
        expect(afterBalance3.sub(beforeBalance3)).to.be.equal(parseEther('100'))
        expect(await asset0.balanceOf(user1.address)).to.be.equal(parseEther('99.999200210048011000'))
        expect(await asset0.cash()).to.be.equal(parseEther('200'))
        expect(await asset0.liability()).to.be.equal(parseEther('99.999200210048011000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('200'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('99.999200210048011000'))

        await expect(receipt3)
          .to.emit(poolContract, 'Withdraw')
          .withArgs(user1.address, token0.address, parseEther('100'), parseEther('100'), user1.address)
      })

      it('reverts if passed deadline', async function () {
        await expect(
          poolContract.connect(user1).deposit(token0.address, parseEther('100'), user1.address, fiveSecondsAgo)
        ).to.be.revertedWith('WOMBAT_EXPIRED')
      })

      it('reverts if liquidity to mint is too small', async function () {
        await expect(
          poolContract.connect(user1).deposit(token0.address, parseEther('0'), user1.address, fiveSecondsSince)
        ).to.be.revertedWith('WOMBAT_ZERO_AMOUNT')
      })

      it('reverts if liquidity provider does not have enough balance', async function () {
        await expect(
          poolContract.connect(user2).deposit(token0.address, parseEther('1000.123'), user2.address, fiveSecondsSince)
        ).to.be.revertedWith('ERC20: transfer amount exceeds balance')
      })

      it('reverts if pool paused', async function () {
        await poolContract.connect(owner).pause()
        await expect(
          poolContract.connect(user1).deposit(token0.address, parseEther('100'), user1.address, fiveSecondsSince)
        ).to.be.revertedWith('Pausable: paused')
      })

      it('reverts if asset paused', async function () {
        await poolContract.connect(owner).pauseAsset(token0.address)
        await expect(
          poolContract.connect(user1).deposit(token0.address, parseEther('100'), user1.address, fiveSecondsSince)
        ).to.be.revertedWith('WOMBAT_ASSET_ALREADY_PAUSED')
      })

      it('reverts if pause asset is invoked by non-owner', async function () {
        await expect(poolContract.connect(user1).pauseAsset(token0.address)).to.be.revertedWith('WOMBAT_FORBIDDEN')
      })

      it('allows deposit if asset paused and unpaused after', async function () {
        await poolContract.connect(owner).pauseAsset(token0.address)
        await expect(
          poolContract.connect(user1).deposit(token0.address, parseEther('100'), user1.address, fiveSecondsSince)
        ).to.be.revertedWith('WOMBAT_ASSET_ALREADY_PAUSED')

        await poolContract.connect(owner).unpauseAsset(token0.address)
        const receipt = await poolContract
          .connect(user1)
          .deposit(token0.address, parseEther('100'), user1.address, fiveSecondsSince)

        await expect(receipt)
          .to.emit(poolContract, 'Deposit')
          .withArgs(user1.address, token0.address, parseEther('100'), parseEther('100'), user1.address)
      })

      it('reverts if zero address provided', async function () {
        await expect(
          poolContract
            .connect(user1)
            .deposit(ethers.constants.AddressZero, parseEther('100'), user1.address, fiveSecondsSince)
        ).to.be.revertedWith('WOMBAT_ASSET_NOT_EXISTS')
      })

      it('reverts if asset not exist', async function () {
        // Create a new ERC20 stablecoin
        const mockToken = await TestERC20Factory.deploy('Tether', 'USDT', 18, parseUnits('1000000', 18)) // 1 mil USDT
        // Wait for transaction to be mined
        await mockToken.deployTransaction.wait()

        await expect(
          poolContract.connect(user1).deposit(mockToken.address, parseEther('100'), user1.address, fiveSecondsSince)
        ).to.be.revertedWith('WOMBAT_ASSET_NOT_EXISTS')
      })
    })
  })

  describe('Asset vUSDC (8 decimals)', function () {
    describe('deposit', function () {
      beforeEach(async function () {
        // Transfer 100k from vUSDC contract to users
        await token1.connect(owner).transfer(user1.address, parseUnits('100000', 8)) // 100 k
        await token1.connect(owner).transfer(user2.address, parseUnits('600.123', 8))
        // Approve max allowance from users to pool
        await token1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
        await token1.connect(user2).approve(poolContract.address, ethers.constants.MaxUint256)
      })

      it('works (first LP)', async function () {
        const beforeBalance = await token1.balanceOf(user1.address)
        await poolContract.connect(user1).deposit(token1.address, parseUnits('100', 8), user1.address, fiveSecondsSince)
        const afterBalance = await token1.balanceOf(user1.address)

        expect(await asset1.cash()).to.be.equal(parseEther('100'))
        expect(await asset1.liability()).to.be.equal(parseEther('100'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('100', 8))
        expect(await asset1.balanceOf(user1.address)).to.be.equal(parseEther('100'))
        expect(await asset1.totalSupply()).to.be.equal(parseEther('100'))
        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseUnits('-100', 8))
      })

      it('works (second LP)', async function () {
        const beforeBalance1 = await token1.balanceOf(user1.address)
        const beforeBalance2 = await token1.balanceOf(user2.address)
        await poolContract.connect(user1).deposit(token1.address, parseUnits('100', 8), user1.address, fiveSecondsSince)
        await poolContract
          .connect(user2)
          .deposit(token1.address, parseUnits('100.123', 8), user2.address, fiveSecondsSince)
        const afterBalance1 = await token1.balanceOf(user1.address)
        const afterBalance2 = await token1.balanceOf(user2.address)

        expect(await asset1.cash()).to.be.equal(parseEther('200.123'))
        expect(await asset1.liability()).to.be.equal(parseEther('200.123'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('200.123', 8))
        expect(await asset1.balanceOf(user1.address)).to.be.equal(parseEther('100'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseEther('100.123'))
        expect(await asset1.totalSupply()).to.be.equal(parseEther('200.123'))

        expect(afterBalance1).to.be.equal(parseUnits('99900', 8)) // 100k - 100
        expect(afterBalance1.sub(beforeBalance1)).to.be.equal(parseUnits('-100', 8)) // 99.9 - 100k
        expect(afterBalance2).to.be.equal(parseUnits('500', 8)) // 600.123 - 100.123
        expect(afterBalance2.sub(beforeBalance2)).to.be.equal(parseUnits('-100.123', 8)) // 500 - 600.123
      })

      it('maintains the LP token supply and liability ratio', async function () {
        await poolContract.connect(user1).deposit(token1.address, parseUnits('100', 8), user1.address, fiveSecondsSince)
        // Add dividend
        await asset1.connect(owner).setPool(owner.address)
        await asset1.connect(owner).addLiability(parseEther('1.768743'))
        await asset1.connect(owner).setPool(poolContract.address)

        const receipt = await poolContract
          .connect(user2)
          .deposit(token1.address, parseUnits('100', 8), user2.address, fiveSecondsSince)
        expect(await asset1.liability()).to.be.equal(parseEther('201.769487242499697330'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseEther('98.262729099935622993'))
        expect(await asset1.totalSupply()).to.be.equal(parseEther('198.262729099935622993'))

        await expect(receipt)
          .to.emit(poolContract, 'Deposit')
          .withArgs(
            user2.address,
            token1.address,
            parseUnits('100', 8),
            parseEther('98.262729099935622993'),
            user2.address
          )
      })
    })
  })

  describe('3 assets, r* > 1, A = 0.05', function () {
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

      await poolContract.connect(owner).setShouldMaintainGlobalEquil(false)
    })

    it('deposit reward > 0 (floored)', async function () {
      // Faucet
      await asset0.connect(owner).setPool(owner.address)
      await asset0.connect(owner).addCash(parseEther('10516.66012'))
      await asset0.connect(owner).addLiability(parseEther('10000'))
      await asset0.connect(owner).setPool(poolContract.address)

      await asset1.connect(owner).setPool(owner.address)
      await asset1.connect(owner).addCash(parseEther('506.4946'))
      await asset1.connect(owner).addLiability(parseEther('1000'))
      await asset1.connect(owner).mint(user1.address, parseEther('1000'))
      await asset1.connect(owner).setPool(poolContract.address)

      await asset2.connect(owner).setPool(owner.address)
      await asset2.connect(owner).addCash(parseEther('6000'))
      await asset2.connect(owner).addLiability(parseEther('5000'))
      await asset2.connect(owner).setPool(poolContract.address)

      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('1.062117492331304537'),
        parseEther('16240.667538952096649000'),
      ])

      const receipt = await poolContract
        .connect(user1)
        .deposit(token1.address, parseUnits('800', 8), user1.address, fiveSecondsSince)

      await expect(receipt)
        .to.emit(poolContract, 'Deposit')
        .withArgs(user1.address, token1.address, parseUnits('800', 8), parseEther('800'), user1.address)

      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('1.059991006444461435'),
        parseEther('17015.389354466000070200'),
      ])
    })

    it('deposit reward < 0', async function () {
      // Faucet
      await asset0.connect(owner).setPool(owner.address)
      await asset0.connect(owner).addCash(parseEther('10516.66012'))
      await asset0.connect(owner).addLiability(parseEther('10000'))
      await asset0.connect(owner).setPool(poolContract.address)

      await asset1.connect(owner).setPool(owner.address)
      await asset1.connect(owner).addCash(parseEther('1000'))
      await asset1.connect(owner).addLiability(parseEther('1000'))
      await asset1.connect(owner).mint(user1.address, parseEther('1000'))
      await asset1.connect(owner).setPool(poolContract.address)

      await asset2.connect(owner).setPool(owner.address)
      await asset2.connect(owner).addCash(parseEther('6000'))
      await asset2.connect(owner).addLiability(parseEther('5000'))
      await asset2.connect(owner).setPool(poolContract.address)

      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('1.094609075215282560'),
        parseEther('16782.890674540985455000'),
      ])

      const amount = parseUnits('2000', 8)
      const [liquidity, fee] = await poolContract.quotePotentialDeposit(token1.address, amount)
      expect(liquidity).to.equal(parseEther('1999.361441037415280000'))
      expect(fee).to.equal(parseEther('0.638558962584720000'))
      expect(liquidity.add(fee)).to.equal(parseEther('2000'))

      const receipt = await poolContract.connect(user1).deposit(token1.address, amount, user1.address, fiveSecondsSince)

      await expect(receipt)
        .to.emit(poolContract, 'Deposit')
        .withArgs(user1.address, token1.address, amount, liquidity, user1.address)

      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('1.084099949473078425'),
        parseEther('18682.954523641284781493'),
      ])
    })
  })

  describe('3 assets, r* = 1, A = 0.001', function () {
    beforeEach(async function () {
      await poolContract.connect(owner).setAmpFactor(parseEther('0.001'))

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

      // setShouldMaintainGlobalEquil
      await poolContract.connect(owner).setShouldMaintainGlobalEquil(true)
    })

    it('rx = 0.80', async function () {
      // Faucet
      await asset0.connect(owner).setPool(owner.address)
      await asset0.connect(owner).addCash(parseEther('12000'))
      await asset0.connect(owner).addLiability(parseEther('10000'))
      await asset0.connect(owner).setPool(poolContract.address)

      await asset1.connect(owner).setPool(owner.address)
      await asset1.connect(owner).addCash(parseEther('8000.83203342'))
      await asset1.connect(owner).addLiability(parseEther('10000'))
      await asset1.connect(owner).mint(user1.address, parseEther('5000'))
      await asset1.connect(owner).setPool(poolContract.address)

      await asset2.connect(owner).setPool(owner.address)
      await asset2.connect(owner).addCash(parseEther('1000'))
      await asset2.connect(owner).addLiability(parseEther('1000'))
      await asset2.connect(owner).setPool(poolContract.address)

      const receipt = await poolContract
        .connect(user1)
        .deposit(token1.address, parseUnits('4999.80813996', 8), user1.address, fiveSecondsSince)

      await expect(receipt)
        .to.emit(poolContract, 'Deposit')
        .withArgs(
          user1.address,
          token1.address,
          parseUnits('4999.80813996', 8),
          parseEther('2499.99999999758028675'),
          user1.address
        )

      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('1.000000000000141728'),
        parseEther('25973.999999998854027507'),
      ])
    })

    it('rx = 1.53', async function () {
      // Faucet
      await asset0.connect(owner).setPool(owner.address)
      await asset0.connect(owner).addCash(parseEther('5000'))
      await asset0.connect(owner).addLiability(parseEther('10000'))
      await asset0.connect(owner).setPool(poolContract.address)

      await asset1.connect(owner).setPool(owner.address)
      await asset1.connect(owner).addCash(parseEther('15006.66370633'))
      await asset1.connect(owner).addLiability(parseEther('10000'))
      await asset1.connect(owner).mint(user1.address, parseEther('10000'))
      await asset1.connect(owner).setPool(poolContract.address)

      await asset2.connect(owner).setPool(owner.address)
      await asset2.connect(owner).addCash(parseEther('1000'))
      await asset2.connect(owner).addLiability(parseEther('1000'))
      await asset2.connect(owner).setPool(poolContract.address)

      const receipt = await poolContract
        .connect(user1)
        .deposit(token1.address, parseUnits('4999.58278111', 8), user1.address, fiveSecondsSince)

      await expect(receipt)
        .to.emit(poolContract, 'Deposit')
        .withArgs(
          user1.address,
          token1.address,
          parseUnits('4999.58278111', 8),
          parseEther('4999.999999996658854000'),
          user1.address
        )

      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('0.999999999999826026'),
        parseEther('25973.999999992134367382'),
      ])
    })
  })
})
