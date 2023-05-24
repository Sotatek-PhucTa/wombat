import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('AddAssets_wstETH_Pool', async () => {
  return concatAll(
    ...['Asset_WstETH_Pool_wstETH', 'Asset_WstETH_Pool_WETH'].map((assetDeployment) =>
      multisig.utils.addAssetToMasterWombatAndVoter(assetDeployment)
    )
  )
})
