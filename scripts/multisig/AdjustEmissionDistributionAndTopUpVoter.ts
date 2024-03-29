import assert from 'assert'
import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { concatAll } from '../../utils'

/**
 * This script adjust the emission distribution for the pools by changing:
 * - allocation point for each pool
 * - emission rate (womPerSec) in Voter
 * - base / vote split (baseAllocation) in Voter
 */
runScript('AdjustEmissionDistributionAndTopUpVoter', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  let WOM_MONTHLY_EMISSION_RATE
  let BRIBE_ALLOC_PERCENT
  let GAUGE_ALLOC_PERCENTS

  if (network == Network.ARBITRUM_MAINNET) {
    WOM_MONTHLY_EMISSION_RATE = 330_000
    BRIBE_ALLOC_PERCENT = 54.7
    GAUGE_ALLOC_PERCENTS = {
      // Cross chain pool
      Asset_Stablecoin_Pool_USDT: 2.4,
      Asset_Stablecoin_Pool_USDC: 2.4,
      // Main Pool
      Asset_MainPool_USDCe: 15,
      Asset_MainPool_USDT: 13,
      Asset_MainPool_DAI: 5,
      Asset_MainPool_USDC: 6,
      // wmxWOM Pool
      Asset_wmxWOM_Pool_wmxWOM: 0.34,
      Asset_wmxWOM_Pool_WOM: 0.34,
      // mWOM Pool
      Asset_mWOM_Pool_mWOM: 0.31,
      Asset_mWOM_Pool_WOM: 0.31,
      // qWOM Pool
      Asset_qWOM_Pool_qWOM: 0.1,
      Asset_qWOM_Pool_WOM: 0.1,
    }
  } else if (network == Network.BSC_MAINNET) {
    WOM_MONTHLY_EMISSION_RATE = 2_005_000
    BRIBE_ALLOC_PERCENT = 90.41
    GAUGE_ALLOC_PERCENTS = {
      // Cross chain pool
      Asset_Stablecoin_Pool_USDT: 1.25,
      Asset_Stablecoin_Pool_USDC: 1.25,
      // Main Pool
      Asset_MainPool_USDC: 3.19,
      Asset_MainPool_USDT: 3.21,
      Asset_MainPool_BUSD: 0,
      Asset_MainPool_DAI: 0.2,
      // wmxWOM Pool
      Asset_wmxWOMPool_wmxWOM: 0.1,
      Asset_wmxWOMPool_WOM: 0.1,
      // mWOM Pool
      Asset_mWOMPool_mWOM: 0.12,
      Asset_mWOMPool_WOM: 0.12,
      // qWOM Pool
      Asset_qWOMPool_qWOM: 0.025,
      Asset_qWOMPool_WOM: 0.025,
      // wBETH Pool
      Asset_wBETH_Pool_wBETH: 0,
      Asset_wBETH_Pool_ETH: 0,
    }
  } else if (network == Network.ETHEREUM_MAINNET) {
    WOM_MONTHLY_EMISSION_RATE = 620_000
    BRIBE_ALLOC_PERCENT = 91.94
    GAUGE_ALLOC_PERCENTS = {
      // Cross chain pool
      Asset_Stablecoin_Pool_USDT: 4.03,
      Asset_Stablecoin_Pool_USDC: 4.03,
    }
  }

  if (WOM_MONTHLY_EMISSION_RATE && BRIBE_ALLOC_PERCENT && GAUGE_ALLOC_PERCENTS) {
    const sumOfGaugeAllocPercents = Object.values(GAUGE_ALLOC_PERCENTS).reduce((a, b) => a + b, 0)
    const sumOfPercents = sumOfGaugeAllocPercents + BRIBE_ALLOC_PERCENT
    assert(
      Math.abs(sumOfPercents - 100) < 0.01,
      `Sum of gauge allocation percents and bribe must be 100, but got ${sumOfPercents} instead.`
    )

    // TODO: in voter, find all the pools that are not in the list above but currently have non-0 allocPoint, and set their allocPoint to 0.

    // TODO: check that after tx, the totalAllocPoint == baseAllocation.

    return concatAll(
      // emission rate (womPerSec)
      multisig.utils.setWomMonthlyEmissionRate(WOM_MONTHLY_EMISSION_RATE),
      // base / vote split (baseAllocation)
      multisig.utils.setBribeAllocPercent(BRIBE_ALLOC_PERCENT),
      // allocation point
      ...Object.entries(GAUGE_ALLOC_PERCENTS).map(([gauge, allocPercent]) =>
        multisig.utils.setAllocPercent(gauge, allocPercent)
      ),
      // top up Voter
      multisig.utils.topUpVoterForNEpoch(WOM_MONTHLY_EMISSION_RATE)
    )
  } else {
    return []
  }
})
