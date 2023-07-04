import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('AddAssets_ePendle_Pool', async () => {
  return concatAll(
    ...['Asset_ePendle_Pool_ePendle', 'Asset_ePendle_Pool_PENDLE'].map((assetDeployment) =>
      multisig.utils.addAssetToMasterWombatAndVoter(assetDeployment)
    )
  )
})
