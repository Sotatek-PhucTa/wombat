import { expect } from 'chai'
import { deployments, getNamedAccounts } from 'hardhat'
import { HighCovRatioFeePoolV3 } from '../../build/typechain'
import { CROSS_CHAIN_POOL_TOKENS_MAP, DYNAMICPOOL_TOKENS_MAP, FACTORYPOOL_TOKENS_MAP } from '../../config/tokens.config'
import { getCurrentNetwork } from '../../types/network'
import { getDeployedContract } from '../../utils'
import { getPoolDeploymentName } from '../../utils/deploy'

describe('Verify Pool Config', function () {
  let deployer: string
  let multisig: string

  beforeEach(async function () {
    await deployments.fixture([])
  })

  describe('HighCovRatioFeePool', async function () {
    const POOL_TOKENS = FACTORYPOOL_TOKENS_MAP[await getCurrentNetwork()] || {}

    Object.entries(POOL_TOKENS).forEach(([poolName, poolInfo]) => {
      it(`verify config for ${poolName}`, async function () {
        ;({ deployer, multisig } = await getNamedAccounts()) // for some reason it doesn't work unelss I put it here

        const setting = poolInfo.setting
        const poolDeploymentName = getPoolDeploymentName(setting.deploymentNamePrefix, poolName)
        const pool = (await getDeployedContract('HighCovRatioFeePoolV3', poolDeploymentName)) as HighCovRatioFeePoolV3

        expect(await pool.ampFactor()).to.eq(setting.ampFactor, 'amp factor not equal')
        expect(await pool.haircutRate()).to.eq(setting.haircut, 'haircut not equal')
        expect(await pool.lpDividendRatio()).to.eq(setting.lpDividendRatio, 'lp dividend ratio not equal')
        expect(await pool.retentionRatio()).to.eq(setting.retentionRatio, 'retention ratio not equal')
        expect(await pool.mintFeeThreshold()).to.eq(setting.mintFeeThreshold, 'mint fee threshold not equal')
        expect(await pool.owner()).to.equal(multisig, 'owner not equal')
        expect(await pool.dev()).to.equal(multisig, 'dev not equal')
      })
    })
  })

  describe('DynamicPoolPool', async function () {
    const POOL_TOKENS = DYNAMICPOOL_TOKENS_MAP[await getCurrentNetwork()] || {}

    Object.entries(POOL_TOKENS).forEach(([poolName, poolInfo]) => {
      it(`verify config for ${poolName}`, async function () {
        const setting = poolInfo.setting
        const poolDeploymentName = getPoolDeploymentName(setting.deploymentNamePrefix, poolName)
        const pool = (await getDeployedContract('HighCovRatioFeePoolV3', poolDeploymentName)) as HighCovRatioFeePoolV3

        expect(await pool.ampFactor()).to.eq(setting.ampFactor, 'amp factor not equal')
        expect(await pool.haircutRate()).to.eq(setting.haircut, 'haircut not equal')
        expect(await pool.lpDividendRatio()).to.eq(setting.lpDividendRatio, 'lp dividend ratio not equal')
        expect(await pool.retentionRatio()).to.eq(setting.retentionRatio, 'retention ratio not equal')
        expect(await pool.mintFeeThreshold()).to.eq(setting.mintFeeThreshold, 'mint fee threshold not equal')
        expect(await pool.owner()).to.equal(multisig, 'owner not equal')
        expect(await pool.dev()).to.equal(multisig, 'dev not equal')
      })
    })
    // }
  })

  describe('CrossChainPool', async function () {
    const POOL_TOKENS = CROSS_CHAIN_POOL_TOKENS_MAP[await getCurrentNetwork()] || {}

    Object.entries(POOL_TOKENS).forEach(([poolName, poolInfo]) => {
      it(`verify config for ${poolName}`, async function () {
        const setting = poolInfo.setting
        const poolDeploymentName = getPoolDeploymentName(setting.deploymentNamePrefix, poolName)
        const pool = (await getDeployedContract('HighCovRatioFeePoolV3', poolDeploymentName)) as HighCovRatioFeePoolV3

        expect(await pool.ampFactor()).to.eq(setting.ampFactor, 'amp factor not equal')
        expect(await pool.haircutRate()).to.eq(setting.haircut, 'haircut not equal')
        expect(await pool.lpDividendRatio()).to.eq(setting.lpDividendRatio, 'lp dividend ratio not equal')
        expect(await pool.retentionRatio()).to.eq(setting.retentionRatio, 'retention ratio not equal')
        expect(await pool.mintFeeThreshold()).to.eq(setting.mintFeeThreshold, 'mint fee threshold not equal')
        expect(await pool.owner()).to.equal(multisig, 'owner not equal')
        expect(await pool.dev()).to.equal(multisig, 'dev not equal')
      })
    })
    // }
  })
})
