import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('AddAssets_SnBNB_Pool', async () => {
  return concatAll(
    ...['Asset_SnBNB_Pool_SnBNB', 'Asset_SnBNB_Pool_WBNB'].map((assetDeployment) =>
      multisig.utils.addAssetToMasterWombatAndVoter(assetDeployment)
    )
  )
})
