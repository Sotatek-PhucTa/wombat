import { runScript } from '.'
import { CrossChainPoolType } from '../../config/wormhole.config'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll, multisig } from '../../utils'

runScript('Sync_Stablecoin_CrossChainPool', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  return concatAll(multisig.utils.syncCrossChainPool(CrossChainPoolType.stablecoin, network))
})
