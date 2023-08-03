import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'

runScript('operation-20230802', async () => {
  const network = getCurrentNetwork()
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.pauseRewardRateFor('Bribe', ['Asset_ankrETH_Pool_ETH', 'Asset_ankrETH_Pool_ankrETH']),
      multisig.utils.pauseVoteEmissionFor(['Asset_ankrETH_Pool_ETH', 'Asset_ankrETH_Pool_ankrETH'])
    )
  } else if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      multisig.utils.pauseRewardRateFor('Bribe', [
        'Asset_jUSDC_Pool_jUSDC',
        'Asset_jUSDC_Pool_USDCe',
        'Asset_ankrETH_Pool_ankrETH',
        'Asset_ankrETH_Pool_WETH',
      ]),
      multisig.utils.pauseVoteEmissionFor(['Asset_ankrETH_Pool_WETH', 'Asset_ankrETH_Pool_ankrETH'])
    )
  } else {
    return []
  }
})
