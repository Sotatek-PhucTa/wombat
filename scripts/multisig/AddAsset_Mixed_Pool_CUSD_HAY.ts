import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('AddAsset_Mixed_Pool_CUSD_HAY', async () => {
  return concatAll(
    multisig.utils.addAssetToPool('Asset_Mixed_Pool_CUSD', 'FactoryPools_Mixed_Pool_Proxy'),
    multisig.utils.addAssetToPool('Asset_Mixed_Pool_HAY', 'FactoryPools_Mixed_Pool_Proxy')
  )
})
