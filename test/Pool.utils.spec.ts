import { ethers } from 'hardhat'
import { parseUnits } from '@ethersproject/units'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { Contract, ContractFactory } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { parseEther } from 'ethers/lib/utils'

const { expect } = chai
chai.use(solidity)

describe('Pool - Utils', function () {
  let owner: SignerWithAddress
  let user: SignerWithAddress
  let AssetFactory: ContractFactory
  let TestERC20Factory: ContractFactory
  let AggregateAccountFactory: ContractFactory
  let PoolFactory: ContractFactory
  let poolContract: Contract
  let token0: Contract // BUSD
  let token1: Contract // USDC
  let asset0: Contract // BUSD LP
  let asset1: Contract // USDC LP
  let aggregateAccount: Contract

  beforeEach(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    user = rest[1]

    // Get Factories
    AssetFactory = await ethers.getContractFactory('Asset')
    TestERC20Factory = await ethers.getContractFactory('TestERC20')
    AggregateAccountFactory = await ethers.getContractFactory('AggregateAccount')
    PoolFactory = await ethers.getContractFactory('Pool')

    // Deploy with factories
    token0 = await TestERC20Factory.deploy('Binance USD', 'BUSD', 18, parseUnits('1000000', 18)) // 1 mil BUSD
    token1 = await TestERC20Factory.deploy('USD Coin', 'USDC', 18, parseUnits('1000000', 18)) // 1 mil USDC
    aggregateAccount = await AggregateAccountFactory.connect(owner).deploy('stables', true)
    asset0 = await AssetFactory.deploy(token0.address, 'Binance USD LP', 'BUSD-LP', aggregateAccount.address)
    asset1 = await AssetFactory.deploy(token1.address, 'USD Coin LP', 'USDC-LP', aggregateAccount.address)
    poolContract = await PoolFactory.connect(owner).deploy()

    // wait for transactions to be mined
    await token0.deployTransaction.wait()
    await token1.deployTransaction.wait()
    await aggregateAccount.deployTransaction.wait()
    await asset0.deployTransaction.wait()
    await asset1.deployTransaction.wait()
    await poolContract.deployTransaction.wait()

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
      await poolContract.connect(owner).setShouldMaintainGlobalEquil(false)
      await poolContract.connect(owner).setShouldDistributeRetention(true)
      await poolContract.connect(owner).setRetentionRatio(parseUnits('1', 18))

      expect(await poolContract.connect(owner).ampFactor()).to.be.equal(parseUnits('0.05', 18))
      expect(await poolContract.connect(owner).haircutRate()).to.be.equal(parseUnits('0.004', 18))
      expect(await poolContract.connect(owner).retentionRatio()).to.be.equal(parseUnits('1', 18))
    })

    it('Should revert if notOwner sets contract private parameters', async function () {
      await expect(poolContract.connect(user).setAmpFactor(parseUnits('0.05', 18))).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
      await expect(poolContract.connect(user).setHaircutRate(parseUnits('0.004', 18))).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
      await expect(poolContract.connect(user).setShouldMaintainGlobalEquil(false)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
      await expect(poolContract.connect(user).setShouldDistributeRetention(false)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
      await expect(poolContract.connect(user).setRetentionRatio(parseUnits('1', 18))).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('Should revert if params are set outside out of their boundaries', async function () {
      // should not be bigger than 1
      await expect(poolContract.connect(owner).setAmpFactor(parseUnits('1.1', 18))).to.be.revertedWith(
        'WOMBAT_INVALID_VALUE'
      )
      await expect(poolContract.connect(owner).setHaircutRate(parseUnits('12.1', 18))).to.be.revertedWith(
        'WOMBAT_INVALID_VALUE'
      )
      await expect(poolContract.connect(owner).setRetentionRatio(parseUnits('1.0001', 18))).to.be.revertedWith(
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
      mockAsset = await AssetFactory.deploy(mockToken.address, 'Tether', 'USDT-LP', aggregateAccount.address)
    })

    describe('Add ERC20 Asset', function () {
      it('works', async function () {
        // Add mock token and asset to pool
        const receipt = await poolContract.connect(owner).addAsset(mockToken.address, mockAsset.address)

        // check if added and if event has been emitted
        expect(await poolContract.assetOf(mockToken.address)).to.equal(mockAsset.address)
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
        ).to.be.revertedWith('WOMBAT_ZERO_ADDRESS')

        // Add existing asset
        await expect(poolContract.connect(owner).addAsset(token0.address, asset0.address)).to.be.revertedWith(
          'WOMBAT_ASSET_ALREADY_EXIST'
        )
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
        await expect(poolContract.connect(owner).removeAsset(mockToken.address)).to.be.revertedWith(
          'WOMBAT_ASSET_NOT_EXISTS()'
        )
      })

      it('reverts for invalid params', async function () {
        // Remove ERC20 token with zero address
        await expect(poolContract.connect(owner).removeAsset(ethers.constants.AddressZero)).to.be.revertedWith(
          'WOMBAT_ASSET_NOT_EXISTS()'
        )
      })

      it('restricts to only owner', async function () {
        await expect(poolContract.connect(user).removeAsset(mockToken.address)).to.be.revertedWith(
          'Ownable: caller is not the owner'
        )
      })
    })

    describe('assetOf', function () {
      it('returns the address of asset', async function () {
        expect(await poolContract.assetOf(token0.address)).to.equal(asset0.address)
        expect(await poolContract.assetOf(token1.address)).to.equal(asset1.address)
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
  })
})
