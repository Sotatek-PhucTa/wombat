import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('AddAssets_Hay_ankrETH_wBETH_Pools', async () => {
  return concatAll(
    ...[
      'Asset_HAY_Pool_USDT',
      'Asset_HAY_Pool_USDC',
      'Asset_HAY_Pool_HAY',
      'Asset_wBETH_Pool_wBETH',
      'Asset_wBETH_Pool_ETH',
      'Asset_ankrETH_Pool_ankrETH',
      'Asset_ankrETH_Pool_ETH',
    ].map((assetDeployment) => multisig.utils.addAssetToMasterWombatAndVoter(assetDeployment))
  )
})
