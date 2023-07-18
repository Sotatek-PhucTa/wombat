import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'

runScript('PauseBribeAndRewarder', async () => {
  const network = getCurrentNetwork()
  if (network === Network.ARBITRUM_MAINNET) {
    return concatAll(
      multisig.utils.pauseRewardRateFor('Bribe', [
        'Asset_ankrETH_Pool_ankrETH',
        'Asset_ankrETH_Pool_WETH',
        'Asset_frxETH_Pool_frxETH',
        'Asset_frxETH_Pool_WETH',
        'Asset_frxETH_Pool_sfrxETH',
      ])
    )
  } else if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.pauseRewardRateFor('Bribe', [
        'Asset_stables_01_FRAX',
        'Asset_Mixed_Pool_USDC',
        'Asset_ankrETH_Pool_ETH',
        'Asset_ankrETH_Pool_ankrETH',
        'Asset_AnkrBNBPool_WBNB',
        'Asset_AnkrBNBPool_ankrBNB',
      ]),
      multisig.utils.pauseRewardRateFor('Rewarder', ['Asset_stables_01_FRAX'])
    )
  } else {
    throw new Error('Wrong network')
  }
})
