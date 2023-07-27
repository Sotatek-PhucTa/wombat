import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('AddAsset_rBNB_Pool', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      ...['Asset_rBNB_Pool_rBNB', 'Asset_rBNB_Pool_WBNB'].map((assetDeployment) =>
        multisig.utils.addAssetToMasterWombatAndVoter(assetDeployment)
      )
    )
  } else {
    return []
  }
})
