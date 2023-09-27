import { runScript } from '.'
import * as multisig from '../../utils/multisig'
import { IPoolConfig, NetworkPoolInfo } from '../../types'
import { CROSS_CHAIN_POOL_TOKENS_MAP } from '../../config/pools.config'
import { getCurrentNetwork } from '../../types/network'

runScript('UpdatePoolHaircuteRate', async () => {
  const network = getCurrentNetwork()
  return multisig.utils.updatePoolsHaircutRate(
    ['Stablecoin_Pool'],
    CROSS_CHAIN_POOL_TOKENS_MAP[network] as NetworkPoolInfo<IPoolConfig>
  )
})
