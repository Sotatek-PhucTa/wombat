import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('RemoveAsset_TUSD_wormholeETH', async () => {
  return concatAll(
    // Pause standalone pool for the first time. So no swap or deposits can be made.
    multisig.utils.pausePool('FactoryPools_StandalonePool_Proxy'),
    // Set pool directly since asset is already removed from pool.
    multisig.utils.setPool('Asset_frxETH_Pool_WETH', 'FactoryPools_StandalonePool_Proxy'),
    // Remove assets from the pool.
    multisig.utils.removeAssets(['Asset_stables_01_TUSD'])
  )
})
