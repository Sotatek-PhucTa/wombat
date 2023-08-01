import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'

runScript('operation-20230731', async () => {
  const network = getCurrentNetwork()
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.pauseVoteEmissionFor([
        'Asset_iUSD_Pool_iUSD',
        'Asset_iUSD_Pool_BUSD',
        'Asset_Mixed_Pool_FRAX',
        'Asset_BOB_Pool_BOB',
        'Asset_BOB_Pool_USDC',
      ]),
      multisig.utils.unpauseVoteEmissionFor(['Asset_wBETH_Pool_wBETH', 'Asset_wBETH_Pool_ETH'])
    )
  } else if (network == Network.ARBITRUM_MAINNET) {
    return multisig.utils.pauseVoteEmissionFor(['Asset_FRAX_Pool_USD+', 'Asset_BOB_Pool_BOB', 'Asset_BOB_Pool_USDCe'])
  } else {
    return []
  }
})
