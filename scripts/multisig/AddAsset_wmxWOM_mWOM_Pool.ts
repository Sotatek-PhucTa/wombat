import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'

runScript('AddAsset_wmxWOM_mWOM_Pool', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.ETHEREUM_MAINNET) {
    return concatAll(
      ...['Asset_mWOMPool_mWOM', 'Asset_mWOMPool_WOM', 'Asset_wmxWOMPool_wmxWOM', 'Asset_wmxWOMPool_WOM'].map(
        (assetDeployment) => multisig.utils.addAssetToMasterWombatAndVoter(assetDeployment)
      )
    )
  } else {
    return []
  }
})
