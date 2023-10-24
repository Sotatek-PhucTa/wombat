import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('AddAssets_sAVAX_Pool', async () => {
  return concatAll(
    ...['Asset_sAVAX_Pool_WAVAX', 'Asset_sAVAX_Pool_sAVAX'].map((assetDeployment) =>
      multisig.utils.addAssetToMasterWombat(assetDeployment)
    )
  )
})
