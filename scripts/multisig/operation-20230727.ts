import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('operation-20230727', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(multisig.utils.pauseRewardRateFor('Bribe', ['Asset_BOB_Pool_BOB', 'Asset_BOB_Pool_USDCe']))
  } else if (network == Network.BSC_MAINNET) {
    return concatAll(multisig.utils.pauseRewardRateFor('Bribe', ['Asset_BOB_Pool_BOB', 'Asset_BOB_Pool_USDC']))
  } else {
    return []
  }
})
