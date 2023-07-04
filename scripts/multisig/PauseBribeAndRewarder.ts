import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'

runScript('PauseBribeAndRewarder', async () => {
  const network = getCurrentNetwork()
  if (network === Network.ARBITRUM_MAINNET) {
    return multisig.utils.pauseBribeFor(['Asset_fUSDC_Pool_fUSDC', 'Asset_fUSDC_Pool_USDCe'])
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
