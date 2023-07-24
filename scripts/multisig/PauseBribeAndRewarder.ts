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
    return concatAll(multisig.utils.pauseRewardRateFor('Rewarder', ['Asset_BNBy_Pool_WBNB', 'Asset_BNBy_Pool_BNBy']))
  } else {
    throw new Error('Wrong network')
  }
})
