import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

// Follow up on RemoveAsset_TUSD_wormholeETH
// After assets are moved to the pool, we can unpause the pool and pause the assets instead.
runScript('Unpause_Standalone_Pool', async () => {
  return concatAll(
    multisig.utils.unpausePool('FactoryPools_StandalonePool_Proxy'),
    multisig.utils.pauseAsset('Asset_frxETH_Pool_WETH'),
    multisig.utils.pauseAsset('Asset_stables_01_TUSD')
  )
})
