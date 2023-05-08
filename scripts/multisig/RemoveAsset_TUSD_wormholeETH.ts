import { runMultisigScript } from '.'
import * as multisig from '../../utils/multisig'

runMultisigScript('RemoveAsset_TUSD_wormholeETH', async () => {
  const txns = await Promise.all([
    // Pause standalone pool for the first time. So no swap or deposits can be made.
    multisig.utils.pausePool('FactoryPools_StandalonePool_Proxy'),
    // Set pool directly since asset is already removed from pool.
    multisig.utils.setPool('Asset_frxETH_Pool_WETH', 'FactoryPools_StandalonePool_Proxy'),
    // Remove assets from the pool.
    multisig.utils.removeAssets(['Asset_stables_01_TUSD']),
  ])
  return txns.flat()
})
