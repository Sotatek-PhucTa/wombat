import { ethers } from 'hardhat'
import { parseUnits } from '@ethersproject/units'
import chai from 'chai'

import { Contract, ContractFactory } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { parseEther } from 'ethers/lib/utils'
import { latest } from '../helpers'
import { CrossChainPool__factory } from '../../build/typechain'

const { expect } = chai

describe('Pool - Utils', function () {
  let owner: SignerWithAddress
  let user: SignerWithAddress
  let AssetFactory: ContractFactory
  let TestERC20Factory: ContractFactory
  let PoolFactory: ContractFactory
  let poolContract: Contract
  let token0: Contract // BUSD
  let token1: Contract // USDC
  let asset0: Contract // BUSD LP
  let asset1: Contract // USDC LP

  beforeEach(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    user = rest[1]

    // Get Factories
    AssetFactory = await ethers.getContractFactory('Asset')
    TestERC20Factory = await ethers.getContractFactory('TestERC20')
    const CoreV3Factory = await ethers.getContractFactory('CoreV3')
    const coreV3 = await CoreV3Factory.deploy()
    PoolFactory = (await ethers.getContractFactory('PoolV3', {
      libraries: { CoreV3: coreV3.address },
    })) as CrossChainPool__factory

    // Deploy with factories
    token0 = await TestERC20Factory.deploy('Binance USD', 'BUSD', 18, parseUnits('1000000', 18)) // 1 mil BUSD
    token1 = await TestERC20Factory.deploy('Venus USDC', 'vUSDC', 8, parseUnits('10000000', 8)) // 1 mil USDC
    asset0 = await AssetFactory.deploy(token0.address, 'Binance USD LP', 'BUSD-LP')
    asset1 = await AssetFactory.deploy(token1.address, 'Venus USDC LP', 'vUSDD-LP')
    poolContract = await PoolFactory.connect(owner).deploy()

    // set pool address
    await asset0.setPool(poolContract.address)
    await asset1.setPool(poolContract.address)

    // initialize pool contract
    poolContract.connect(owner).initialize(parseEther('0.05'), parseEther('0.0004'))

    // Add BUSD & USDC assets to pool
    await poolContract.connect(owner).addAsset(token0.address, asset0.address)
    await poolContract.connect(owner).addAsset(token1.address, asset1.address)
  })

  describe('Get and set params, haircut and retention ratio', function () {
    it('Should get and set correct params', async function () {
      await poolContract.connect(owner).setAmpFactor(parseUnits('0.05', 18))
      await poolContract.connect(owner).setHaircutRate(parseUnits('0.004', 18))
      await poolContract.connect(owner).setFee(parseEther('1'), 0)

      expect(await poolContract.connect(owner).ampFactor()).to.be.equal(parseUnits('0.05', 18))
      expect(await poolContract.connect(owner).haircutRate()).to.be.equal(parseUnits('0.004', 18))
      expect(await poolContract.connect(owner).retentionRatio()).to.be.equal(0)
      expect(await poolContract.connect(owner).lpDividendRatio()).to.be.equal(parseUnits('1', 18))
    })

    it('Should revert if notOwner sets contract private parameters', async function () {
      await expect(poolContract.connect(user).setAmpFactor(parseUnits('0.05', 18))).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
      await expect(poolContract.connect(user).setHaircutRate(parseUnits('0.004', 18))).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
      await expect(poolContract.connect(user).setFee(0, 0)).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('Should revert if retention + lp dividend > 1', async function () {
      await expect(
        poolContract.connect(owner).setFee(parseEther('0.5'), parseEther('0.51'))
      ).to.be.revertedWithCustomError(poolContract, 'WOMBAT_INVALID_VALUE')
    })

    it('Should revert if params are set outside out of their boundaries', async function () {
      // should not be bigger than 1
      await expect(poolContract.connect(owner).setAmpFactor(parseUnits('1.1', 18))).to.be.revertedWithCustomError(
        poolContract,
        'WOMBAT_INVALID_VALUE'
      )
      await expect(poolContract.connect(owner).setHaircutRate(parseUnits('12.1', 18))).to.be.revertedWithCustomError(
        poolContract,
        'WOMBAT_INVALID_VALUE'
      )
      await expect(poolContract.connect(owner).setFee(parseUnits('1.0001', 18), 0)).to.be.revertedWithCustomError(
        poolContract,
        'WOMBAT_INVALID_VALUE'
      )
    })
  })

  describe('Add and configure Assets BUSD, USDC, and USDT', function () {
    let mockToken: Contract
    let mockAsset: Contract

    beforeEach(async function () {
      // Create a new ERC20 stablecoin
      mockToken = await TestERC20Factory.deploy('Tether', 'USDT', 18, parseUnits('1000000', 18)) // 1 mil USDT

      // Create new asset contract
      mockAsset = await AssetFactory.deploy(mockToken.address, 'Tether', 'USDT-LP')
    })

    describe('Add ERC20 Asset', function () {
      it('works', async function () {
        // Add mock token and asset to pool
        const receipt = await poolContract.connect(owner).addAsset(mockToken.address, mockAsset.address)

        // check if added and if event has been emitted
        expect(await poolContract.addressOfAsset(mockToken.address)).to.equal(mockAsset.address)
        await expect(receipt).to.emit(poolContract, 'AssetAdded').withArgs(mockToken.address, mockAsset.address)
      })

      it('reverts for invalid params', async function () {
        // Add ERC20 token with zero address
        await expect(
          poolContract.connect(owner).addAsset(ethers.constants.AddressZero, mockAsset.address),
          'WOMBAT_ZERO_ADDRESS'
        ).to.be.reverted

        // Add Asset with zero address
        await expect(
          poolContract.connect(owner).addAsset(mockToken.address, ethers.constants.AddressZero)
        ).to.be.revertedWithCustomError(poolContract, 'WOMBAT_ZERO_ADDRESS')

        // Add existing asset
        await expect(
          poolContract.connect(owner).addAsset(token0.address, asset0.address)
        ).to.be.revertedWithCustomError(poolContract, 'WOMBAT_ASSET_ALREADY_EXIST')
      })

      it('restricts to only owner', async function () {
        await expect(poolContract.connect(user).addAsset(mockToken.address, mockAsset.address)).to.be.revertedWith(
          'Ownable: caller is not the owner'
        )
      })
    })

    describe('Remove ERC20 Asset', function () {
      it('works', async function () {
        // Add mock token and asset to pool
        await poolContract.connect(owner).addAsset(mockToken.address, mockAsset.address)

        // Remove mock token and asset from pool
        const receipt = await poolContract.connect(owner).removeAsset(mockToken.address)

        // check if removed and if event has been emitted
        await expect(receipt).to.emit(poolContract, 'AssetRemoved').withArgs(mockToken.address, mockAsset.address)

        // expect to revert if remove mock token and asset again
        await expect(poolContract.connect(owner).removeAsset(mockToken.address)).to.be.revertedWithCustomError(
          poolContract,
          'WOMBAT_ASSET_NOT_EXISTS'
        )
      })

      it('reverts for invalid params', async function () {
        // Remove ERC20 token with zero address
        await expect(
          poolContract.connect(owner).removeAsset(ethers.constants.AddressZero)
        ).to.be.revertedWithCustomError(poolContract, 'WOMBAT_ASSET_NOT_EXISTS')
      })

      it('restricts to only owner', async function () {
        await expect(poolContract.connect(user).removeAsset(mockToken.address)).to.be.revertedWith(
          'Ownable: caller is not the owner'
        )
      })
    })

    describe('addressOfAsset', function () {
      it('returns the address of asset', async function () {
        expect(await poolContract.addressOfAsset(token0.address)).to.equal(asset0.address)
        expect(await poolContract.addressOfAsset(token1.address)).to.equal(asset1.address)
      })
    })
  })

  describe('getters', function () {
    it('works', async function () {
      expect(await poolContract.dev()).to.equal(owner.address)
    })

    it('can change pool dev', async function () {
      // Change pool's dev
      await poolContract.connect(owner).setDev(user.address)
      expect(await poolContract.dev()).to.equal(user.address)
    })

    it('get tokens', async function () {
      expect(await poolContract.getTokens()).to.deep.equal([token0.address, token1.address])
    })
  })

  describe('pausable', function () {
    it('works', async function () {
      // Pause pool : expect to emit event and for state pause event to change
      const receipt1 = await poolContract.connect(owner).pause()
      expect(await poolContract.paused()).to.equal(true)
      await expect(receipt1).to.emit(poolContract, 'Paused').withArgs(owner.address)

      // Unpause pool : expect emit event and state change
      const receipt2 = await poolContract.connect(owner).unpause()
      expect(await poolContract.paused()).to.equal(false)

      await expect(receipt2).to.emit(poolContract, 'Unpaused').withArgs(owner.address)
    })

    it('restricts to only dev (deployer)', async function () {
      await expect(poolContract.connect(user).pause(), 'WOMBAT_FORBIDDEN').to.be.reverted
      await expect(poolContract.connect(user).unpause(), 'WOMBAT_FORBIDDEN').to.be.reverted
    })

    it('pauseAsset: check if asset exists', async function () {
      await poolContract.pauseAsset(token0.address)
      // cannot pause a non-token address
      await expect(poolContract.pauseAsset(owner.address)).to.be.revertedWithCustomError(
        poolContract,
        'WOMBAT_ASSET_NOT_EXISTS'
      )

      await poolContract.unpauseAsset(token0.address)
      // cannot unpause a non-token address
      await expect(poolContract.unpauseAsset(owner.address)).to.be.revertedWithCustomError(
        poolContract,
        'WOMBAT_ASSET_NOT_PAUSED'
      )
    })
  })

  describe('fillPool', function () {
    beforeEach(async function () {
      await poolContract.connect(owner).setFee(0, parseEther('1'))
      await poolContract.connect(owner).setHaircutRate(parseEther('0.0001'))

      await token0.connect(owner).transfer(user.address, parseEther('100000'))
      await token1.connect(owner).transfer(user.address, parseUnits('100000', 8))
      await token0.connect(user).approve(poolContract.address, ethers.constants.MaxUint256)
      await token1.connect(user).approve(poolContract.address, ethers.constants.MaxUint256)
    })

    it('should revert if not enough value in tip bucket', async function () {
      const fiveSecondsSince = (await latest()).add(5)

      await poolContract
        .connect(user)
        .deposit(token0.address, parseEther('100'), 0, user.address, fiveSecondsSince, false)
      await poolContract
        .connect(user)
        .deposit(token1.address, parseUnits('100', 8), 0, user.address, fiveSecondsSince, false)

      await poolContract
        .connect(user)
        .swap(token0.address, token1.address, parseEther('50'), parseUnits('45', 8), user.address, fiveSecondsSince)

      await poolContract.mintFee(token1.address)

      await expect(poolContract.connect(owner).fillPool(token1.address, 5e15)).to.be.revertedWithCustomError(
        poolContract,
        'WOMBAT_INVALID_VALUE'
      )
    })

    it('should work', async function () {
      const fiveSecondsSince = (await latest()).add(5)

      await poolContract
        .connect(user)
        .deposit(token0.address, parseEther('100'), 0, user.address, fiveSecondsSince, false)
      await poolContract
        .connect(user)
        .deposit(token1.address, parseUnits('100', 8), 0, user.address, fiveSecondsSince, false)

      await poolContract
        .connect(user)
        .swap(token0.address, token1.address, parseEther('50'), parseUnits('45', 8), user.address, fiveSecondsSince)
      await poolContract.mintFee(token1.address)

      const cashBeforeChange = await asset1.cash()
      await poolContract.connect(owner).fillPool(token1.address, 4e15)
      const cashAfterChange = await asset1.cash()
      expect(cashAfterChange.sub(cashBeforeChange)).to.equal(4e15)
    })

    it('mint fee return value', async function () {
      const fiveSecondsSince = (await latest()).add(5)

      await poolContract
        .connect(user)
        .deposit(token0.address, parseEther('100'), 0, user.address, fiveSecondsSince, false)
      await poolContract
        .connect(user)
        .deposit(token1.address, parseUnits('100', 8), 0, user.address, fiveSecondsSince, false)

      await poolContract
        .connect(user)
        .swap(token0.address, token1.address, parseEther('50'), parseUnits('45', 8), user.address, fiveSecondsSince)

      const feeToMint = await poolContract.callStatic.mintFee(token1.address)
      expect(feeToMint).to.eq(parseEther('0.004719743051288433'))
    })
  })
})
