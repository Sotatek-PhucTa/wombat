import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('AddAsset_USDS_Pool', async () => {
  return concatAll(
    ...['Asset_USDS_Pool_USDS', 'Asset_USDS_Pool_USDT'].map((assetDeployment) =>
      multisig.utils.addAssetToMasterWombatAndVoter(assetDeployment)
    )
  )
})
