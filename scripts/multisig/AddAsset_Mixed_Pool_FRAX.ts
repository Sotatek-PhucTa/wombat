import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('AddAsset_Mixed_Pool_FRAX', async () => {
  return concatAll(
    multisig.utils.addAssetToPool('Asset_Mixed_Pool_FRAX', 'FactoryPools_MixedPool_Proxy'),
    multisig.utils.addAssetToMasterWombatAndVoter('Asset_Mixed_Pool_FRAX')
  )
})
