import { deployments } from 'hardhat'
import { getAllAssetsDeployments } from '../../utils/deploy'
import { expect } from 'chai'

describe('utils/deploy.ts', function () {
  beforeEach(async function () {
    await deployments.fixture(['HighCovRatioFeePoolAssets'])
  })

  describe('getAllAssetsDeployments', function () {
    it('returns all deployed assets', async function () {
      expect(await getAllAssetsDeployments()).to.eql([
        'Asset_MainPool_BUSD',
        'Asset_MainPool_USDT',
        'Asset_MainPool_USDC',
        'Asset_MainPool_DAI',
        'Asset_MainPool_TUSD',
        'Asset_MainPool_vUSDC',
      ])
    })
  })
})
