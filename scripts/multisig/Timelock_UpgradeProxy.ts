import assert from 'assert'
import { runScript } from '.'
import { defaultDynamicPoolConfig, defaultFactoryPoolConfig, defaultMainPoolConfig } from '../../config/pools.config'
import { getDeployedContract } from '../../utils'
import * as multisig from '../../utils/multisig'
import { IHighCovRatioFeePoolConfig } from '../../types'
import { BatchTransaction } from '../../utils/multisig/tx-builder'
import { formatEther, parseEther } from 'ethers/lib/utils'
import { scheduler } from 'timers/promises'
import { BigNumber } from 'ethers'
import { expect } from 'chai'

interface Upgrade {
  proxy: string
  implementation: string
  config: IHighCovRatioFeePoolConfig
}

const upgrades: Upgrade[] = [
  { proxy: 'MainPool_Proxy', implementation: 'HighCovRatioFeePoolV2_Implementation', config: defaultMainPoolConfig() },
  {
    proxy: 'SidePool_01_Proxy',
    implementation: 'HighCovRatioFeePoolV2_Implementation',
    config: defaultFactoryPoolConfig(),
  },
  {
    proxy: 'WomSidePools_wmxWOMPool_Proxy',
    implementation: 'HighCovRatioFeePoolV2_Implementation',
    // Note: even though the wom pool config says 200~250%, the actual cov ratio is 500%~1000% on bsc and arb.
    // Keep things consistent for now.
    config: defaultMainPoolConfig(),
  },
  { proxy: 'DynamicPool_01_Proxy', implementation: 'DynamicPoolV2_Implementation', config: defaultDynamicPoolConfig() },
]

async function upgradeProxyTxns(): Promise<BatchTransaction[]> {
  return Promise.all(upgrades.map((upgrade) => multisig.utils.upgradeProxy(upgrade.proxy, upgrade.implementation)))
}

async function setCovRatioFeeParamTxns(): Promise<BatchTransaction[]> {
  return Promise.all(upgrades.map((upgrade) => multisig.utils.setCovRatioFeeParam(upgrade.proxy, upgrade.config)))
}

;(async function () {
  await runScript('Timelock_Schedule_UpgradeProxy', async function () {
    // check pool does not have startCovRatio() and endCovRatio() yet
    for await (const upgrade of upgrades) {
      const pool = await getDeployedContract('HighCovRatioFeePoolV2', upgrade.proxy)
      await expect(pool.startCovRatio()).to.be.reverted
      await expect(pool.endCovRatio()).to.be.reverted
    }

    return [await multisig.utils.scheduleTimelock(await upgradeProxyTxns())]
  })
  await scheduler.wait(100)
  await runScript(
    'Timelock_Execute_UpgradeProxy',
    async function () {
      return [await multisig.utils.executeTimelock(await upgradeProxyTxns())].concat(await setCovRatioFeeParamTxns())
    },
    async function () {
      for await (const upgrade of upgrades) {
        const pool = await getDeployedContract('HighCovRatioFeePoolV2', upgrade.proxy)

        // check cov ratio are overwritten correctly
        const [startCovRatio, endCovRatio] = await Promise.all([pool.startCovRatio(), pool.endCovRatio()])
        console.log(`${upgrade.proxy} cov ratio: ${formatCovRatio(startCovRatio)} to ${formatCovRatio(endCovRatio)}`)
        assert(startCovRatio.eq(upgrade.config.startCovRatio))
        assert(endCovRatio.eq(upgrade.config.endCovRatio))

        // check quote swap still works
        const tokens = await pool.getTokens()
        assert(tokens.length >= 2, 'Pool must have at least 2 tokens')
        const { potentialOutcome } = await pool.quotePotentialSwap(tokens[0], tokens[1], parseEther('1'))
        assert(potentialOutcome.gt(parseEther('0.99')))
      }
    }
  )
})()

// 1e18 => 100.0%
function formatCovRatio(covRatio: BigNumber) {
  return `${formatEther(covRatio.mul(100))}%`
}
