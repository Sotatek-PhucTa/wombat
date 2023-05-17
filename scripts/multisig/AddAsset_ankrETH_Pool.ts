import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('AddAssets_ankrETH_Pool', async () => {
  return concatAll(
    ...['Asset_ankrETH_Pool_ankrETH', 'Asset_ankrETH_Pool_WETH'].map((assetDeployment) =>
      multisig.utils.addAssetToMasterWombatAndVoter(assetDeployment)
    )
  )
})
