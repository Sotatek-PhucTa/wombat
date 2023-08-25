import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'

runScript('operation-20230825', async () => {
  const network = getCurrentNetwork()
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.pauseRewardRateFor('Bribe', [
        'Asset_ankrETH_Pool_ETH',
        'Asset_ankrETH_Pool_ankrETH',
        'Asset_AnkrBNBPool_WBNB',
        'Asset_AnkrBNBPool_ankrBNB',
      ]),
      multisig.utils.pauseVoteEmissionFor([
        'Asset_ankrETH_Pool_ETH',
        'Asset_ankrETH_Pool_ankrETH',
        'Asset_AnkrBNBPool_WBNB',
        'Asset_AnkrBNBPool_ankrBNB',
      ])
    )
  } else {
    return []
  }
})
