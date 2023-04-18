import { deployments, ethers } from 'hardhat'
import { Contract } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'

describe('PausableAssets', function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let token0: SignerWithAddress // BUSD address
  let token1: SignerWithAddress // USDC address
  let pausableAssets: Contract

  beforeEach(async function () {
    await deployments.fixture([])
    ;[owner, user1, token0, token1] = await ethers.getSigners()
    pausableAssets = await ethers.deployContract('TestPausableAssets')
  })

  describe('[isPaused]', function () {
    it('return false for non-existent asset', async function () {
      expect(await pausableAssets.isPaused(ethers.constants.AddressZero)).to.be.false
    })

    it('return false for non-paused asset', async function () {
      await pausableAssets.test_pauseAsset(token0.address)
      await pausableAssets.test_unpauseAsset(token0.address)
      expect(await pausableAssets.isPaused(token0.address)).to.be.false
    })

    it('return true for paused asset', async function () {
      await pausableAssets.test_pauseAsset(token0.address)
      expect(await pausableAssets.isPaused(token0.address)).to.be.true
    })
  })

  describe('[requireAssetNotPaused] - makes a function callable only when the asset is not paused', function () {
    it('Should not revert when asset does not exist', async function () {
      await pausableAssets.connect(user1).testRequireAssetNotPaused(token0.address)
      await pausableAssets.connect(user1).testRequireAssetNotPaused(token1.address)
    })

    it('Should revert when asset is paused', async function () {
      await pausableAssets.test_pauseAsset(token0.address)
      await expect(
        pausableAssets.connect(user1).testRequireAssetNotPaused(token0.address)
      ).to.be.revertedWithCustomError(pausableAssets, 'WOMBAT_ASSET_ALREADY_PAUSED')

      // does not revert for other assets
      await pausableAssets.connect(user1).testRequireAssetNotPaused(token1.address)
    })
  })

  describe('[requireAssetPaused] - makes a function callable only when the asset is paused', function () {
    it('Should not revert when asset is paused', async function () {
      await pausableAssets.test_pauseAsset(token0.address)
      await pausableAssets.connect(user1).testRequireAssetPaused(token0.address)
    })

    it('Would revert when asset does not exist', async function () {
      await expect(pausableAssets.connect(user1).testRequireAssetPaused(token0.address)).to.be.revertedWithCustomError(
        pausableAssets,
        'WOMBAT_ASSET_NOT_PAUSED'
      )
    })

    it('Should revert when asset is not paused', async function () {
      await pausableAssets.test_pauseAsset(token0.address)
      await pausableAssets.test_pauseAsset(token1.address)
      await pausableAssets.test_unpauseAsset(token0.address)
      await expect(pausableAssets.connect(user1).testRequireAssetPaused(token0.address)).to.be.revertedWithCustomError(
        pausableAssets,
        'WOMBAT_ASSET_NOT_PAUSED'
      )

      // does not revert for other assets
      await pausableAssets.connect(user1).testRequireAssetPaused(token1.address)
    })
  })

  describe('[_pauseAsset] - triggers pause state', function () {
    it('Should pause an asset and emit a pause asset event', async function () {
      const receipt = await pausableAssets.connect(user1).test_pauseAsset(token0.address)
      await expect(receipt).to.emit(pausableAssets, 'PausedAsset').withArgs(token0.address, user1.address)
    })
  })

  describe('[_unpauseAsset] - returns to normal state', function () {
    it('Should unpause an asset and emit an unpause asset event', async function () {
      await pausableAssets.connect(user1).test_pauseAsset(token0.address)
      const receipt = await pausableAssets.connect(user1).test_unpauseAsset(token0.address)
      await expect(receipt).to.emit(pausableAssets, 'UnpausedAsset').withArgs(token0.address, user1.address)
    })
  })
})
