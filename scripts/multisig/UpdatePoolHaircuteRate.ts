import { runScript } from '.'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import { IPoolConfig, Network, NetworkPoolInfo } from '../../types'
import { FACTORYPOOL_TOKENS_MAP } from '../../config/pools.config'

runScript('UpdatePoolHaircuteRate', async () => {
  const network = getCurrentNetwork()

  if (network == Network.BSC_MAINNET || network == Network.ARBITRUM_MAINNET) {
    return multisig.utils.updatePoolsHaircutRate(
      ['HAY_Pool'],
      FACTORYPOOL_TOKENS_MAP[network] as NetworkPoolInfo<IPoolConfig>
    )
  } else {
    return []
  }
})
