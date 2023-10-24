import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll, multisig } from '../../utils'

runScript('EnableCrossChainSwap_Stablecoin_Pool', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.AVALANCHE_MAINNET) {
    return concatAll(
      multisig.utils.setCrossChainSwapEnabled('CrossChainPool_Stablecoin_Pool', true)
    )
  } else {
    return []
  }
})
