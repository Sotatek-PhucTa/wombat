import { ethers } from 'hardhat'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ContractFactory, Contract } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const { expect } = chai

chai.use(solidity)

describe('PausableAssets', function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let token0: SignerWithAddress // BUSD address
  let token1: SignerWithAddress // USDC address
  let PausableAssetsFactory: ContractFactory
  let PausableAssets: Contract

  beforeEach(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    user1 = rest[0]
    token0 = rest[1]
    token1 = rest[2]

    PausableAssetsFactory = await ethers.getContractFactory('TestPausableAssets')
    PausableAssets = await PausableAssetsFactory.connect(owner).deploy()

    // Wait for transaction to be mined
    await PausableAssets.deployTransaction.wait()
  })

  describe('[requireAssetNotPaused] - makes a function callable only when the asset is not paused', async function () {
    it('Should not revert when asset does not exist', async function () {
      await PausableAssets.connect(user1).testRequireAssetNotPaused(token0.address)
      await PausableAssets.connect(user1).testRequireAssetNotPaused(token1.address)
    })

    it('Should revert when asset is paused', async function () {
      await PausableAssets.test_pauseAsset(token0.address)
      await expect(PausableAssets.connect(user1).testRequireAssetNotPaused(token0.address)).to.be.revertedWith(
        'WOMBAT_ASSET_PAUSED'
      )

      // does not revert for other assets
      await PausableAssets.connect(user1).testRequireAssetNotPaused(token1.address)
    })
  })

  describe('[requireAssetPaused] - makes a function callable only when the asset is paused', async function () {
    it('Should not revert when asset is paused', async function () {
      await PausableAssets.test_pauseAsset(token0.address)
      await PausableAssets.connect(user1).testRequireAssetPaused(token0.address)
    })

    it('Would revert when asset does not exist', async function () {
      await expect(PausableAssets.connect(user1).testRequireAssetPaused(token0.address)).to.be.revertedWith(
        'WOMBAT_ASSET_NOT_PAUSED'
      )
    })

    it('Should revert when asset is not paused', async function () {
      await PausableAssets.test_pauseAsset(token0.address)
      await PausableAssets.test_pauseAsset(token1.address)
      await PausableAssets.test_unpauseAsset(token0.address)
      await expect(PausableAssets.connect(user1).testRequireAssetPaused(token0.address)).to.be.revertedWith(
        'WOMBAT_ASSET_NOT_PAUSED'
      )

      // does not revert for other assets
      await PausableAssets.connect(user1).testRequireAssetPaused(token1.address)
    })
  })

  describe('[_pauseAsset] - triggers pause state', async function () {
    it('Should pause an asset and emit a pause asset event', async function () {
      const receipt = await PausableAssets.connect(user1).test_pauseAsset(token0.address)
      expect(receipt).to.emit(PausableAssets, 'PausedAsset').withArgs(token0.address, user1.address)
    })
  })

  describe('[_unpauseAsset] - returns to normal state', async function () {
    it('Should unpause an asset and emit an unpause asset event', async function () {
      await PausableAssets.connect(user1).test_pauseAsset(token0.address)
      const receipt = await PausableAssets.connect(user1).test_unpauseAsset(token0.address)
      expect(receipt).to.emit(PausableAssets, 'UnpausedAsset').withArgs(token0.address, user1.address)
    })
  })
})
