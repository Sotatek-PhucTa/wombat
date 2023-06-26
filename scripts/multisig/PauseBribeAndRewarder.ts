import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'

runScript('PauseBribeAndRewarder', async () => {
  const network = getCurrentNetwork()
  if (network === Network.ARBITRUM_MAINNET) {
    return multisig.utils.pauseBribeFor([
      'Asset_MIM_Pool_MIM',
      'Asset_MIM_Pool_USDT',
      'Asset_mWOM_Pool_mWOM',
      'Asset_mWOM_Pool_WOM',
      'Asset_wmxWOM_Pool_wmxWOM',
      'Asset_wmxWOM_Pool_WOM',
      'Asset_qWOM_Pool_qWOM',
      'Asset_qWOM_Pool_WOM',
      'Asset_mPendle_Pool_PENDLE',
      'Asset_mPendle_Pool_mPendle',
    ])
  } else if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.pauseBribeFor(['Asset_wBETH_Pool_wBETH', 'Asset_wBETH_Pool_ETH']),
      multisig.utils.pauseRewarderFor([
        'Asset_wBETH_Pool_wBETH',
        'Asset_wBETH_Pool_ETH',
        'Asset_frxETH_Pool_sfrxETH',
        'Asset_frxETH_Pool_ETH',
      ])
    )
  } else {
    throw new Error('Wrong network')
  }
})
