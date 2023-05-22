import { expect } from 'chai'
import { Contract } from 'ethers'
import { getNamedAccounts } from 'hardhat'
import { CrossChainPool, DynamicPoolV3, HighCovRatioFeePoolV3 } from '../../build/typechain'
import { CROSS_CHAIN_POOL_TOKENS_MAP, DYNAMICPOOL_TOKENS_MAP, FACTORYPOOL_TOKENS_MAP } from '../../config/tokens.config'
import { IPoolConfig, Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { getDeployedContract } from '../../utils'
import { getPoolDeploymentName } from '../../utils/deploy'

// Run with `FORK_NETWORK=bsc_mainnet yarn test test/deploy/PoolConfig.spec.ts`
describe('Verify Pool Config', async function () {
  if ([Network.HARDHAT, Network.LOCALHOST].includes(await getCurrentNetwork())) {
    return
  }

  let multisig: string

  beforeEach(async function () {
    ;({ multisig } = await getNamedAccounts())
  })

  describe('HighCovRatioFeePool', async function () {
    const POOL_TOKENS = FACTORYPOOL_TOKENS_MAP[await getCurrentNetwork()] || {}

    Object.entries(POOL_TOKENS).forEach(([poolName, poolInfo]) => {
      const setting = poolInfo.setting
      const poolDeploymentName = getPoolDeploymentName(setting.deploymentNamePrefix, poolName)

      it(`verify config for ${poolDeploymentName}`, async function () {
        const pool = (await getDeployedContract('HighCovRatioFeePoolV3', poolDeploymentName)) as HighCovRatioFeePoolV3
        await verifyPool(pool, setting, multisig)
      })
    })
  })

  describe('DynamicPool', async function () {
    const POOL_TOKENS = DYNAMICPOOL_TOKENS_MAP[await getCurrentNetwork()] || {}

    Object.entries(POOL_TOKENS).forEach(([poolName, poolInfo]) => {
      const setting = poolInfo.setting
      const poolDeploymentName = getPoolDeploymentName(setting.deploymentNamePrefix, poolName)

      it(`verify config for ${poolDeploymentName}`, async function () {
        const pool = (await getDeployedContract('DynamicPoolV3', poolDeploymentName)) as DynamicPoolV3
        await verifyPool(pool, setting, multisig)
      })
    })
  })

  describe('CrossChainPool', async function () {
    const POOL_TOKENS = CROSS_CHAIN_POOL_TOKENS_MAP[await getCurrentNetwork()] || {}

    Object.entries(POOL_TOKENS).forEach(([poolName, poolInfo]) => {
      const setting = poolInfo.setting
      const poolDeploymentName = getPoolDeploymentName(setting.deploymentNamePrefix, poolName)

      it(`verify config for ${poolDeploymentName}`, async function () {
        const pool = (await getDeployedContract('CrossChainPool', poolDeploymentName)) as CrossChainPool
        await verifyPool(pool, setting, multisig)
      })
    })
  })
})

async function verifyPool(pool: Contract, setting: IPoolConfig, multisig: string) {
  expect(await pool.ampFactor()).to.eq(setting.ampFactor, 'amp factor not equal')
  expect(await pool.haircutRate()).to.eq(setting.haircut, 'haircut not equal')
  expect(await pool.lpDividendRatio()).to.eq(setting.lpDividendRatio, 'lp dividend ratio not equal')
  expect(await pool.retentionRatio()).to.eq(setting.retentionRatio, 'retention ratio not equal')
  expect(await pool.mintFeeThreshold()).to.eq(setting.mintFeeThreshold, 'mint fee threshold not equal')
  // TODO: fixme
  // expect(await pool.owner()).to.equal(multisig, 'owner not equal')
  // expect(await pool.dev()).to.equal(multisig, 'dev not equal')
  if ('startCovRatio' in setting && 'endCovRatio' in setting) {
    expect(await pool.startCovRatio()).to.eq(setting.startCovRatio, 'startCovRatio not equal')
    expect(await pool.endCovRatio()).to.eq(setting.endCovRatio, 'endCovRatio not equal')
  }
}
