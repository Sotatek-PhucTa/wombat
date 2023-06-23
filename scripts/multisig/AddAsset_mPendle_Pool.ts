import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('AddAssets_mPendle_Pool', async () => {
  return concatAll(
    ...['Asset_mPendle_Pool_mPendle', 'Asset_mPendle_Pool_PENDLE'].map((assetDeployment) =>
      multisig.utils.addAssetToMasterWombatAndVoter(assetDeployment)
    )
  )
})
