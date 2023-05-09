import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

// Step 1: remove assets to standalone pool.
// Step 2: pause assets in standalone pool. See Unpause_Standalone_Pool.ts
runScript('RemoveAsset_TUSD_wormholeETH', async () => {
  return concatAll(
    // Pause standalone pool for the first time. So no swap or deposits can be made.
    multisig.utils.pausePool('FactoryPools_StandalonePool_Proxy'),
    // Set pool directly since asset is already removed from pool.
    multisig.utils.setPool('Asset_frxETH_Pool_WETH', 'FactoryPools_StandalonePool_Proxy'),
    multisig.utils.addAssetToPool('Asset_frxETH_Pool_WETH', 'FactoryPools_StandalonePool_Proxy'),
    // Remove assets from the pool.
    multisig.utils.removeAssets(['Asset_stables_01_TUSD'])
  )
})
