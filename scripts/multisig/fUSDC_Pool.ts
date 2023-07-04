import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('AddAssets_fUSDC_Pool', async () => {
  return concatAll(
    ...['Asset_fUSDC_Pool_fUSDC', 'Asset_fUSDC_Pool_USDCe'].map((assetDeployment) =>
      multisig.utils.addAssetToMasterWombatAndVoter(assetDeployment)
    )
  )
})
