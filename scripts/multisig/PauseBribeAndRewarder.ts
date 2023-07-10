import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'

runScript('PauseBribeAndRewarder', async () => {
  const network = getCurrentNetwork()
  if (network === Network.ARBITRUM_MAINNET) {
    return concatAll(
      multisig.utils.pauseRewardRateFor('Bribe', ['Asset_WstETH_Pool_wstETH']),
      multisig.utils.pauseRewardRateFor('Rewarder', ['Asset_WstETH_Pool_WETH', 'Asset_WstETH_Pool_wstETH']),
      multisig.utils.pauseVoteEmissionFor(['Asset_WstETH_Pool_WETH', 'Asset_WstETH_Pool_wstETH'])
    )
  } else if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.pauseRewardRateFor('Bribe', [
        'Asset_frxETH_Pool_frxETH',
        'Asset_frxETH_Pool_ETH',
        'Asset_frxETH_Pool_sfrxETH',
        'Asset_Mixed_Pool_FRAX',
        'Asset_Mixed_Pool_HAY',
      ]),
      multisig.utils.pauseRewardRateFor('Rewarder', ['Asset_Mixed_Pool_FRAX'])
    )
  } else {
    throw new Error('Wrong network')
  }
})
