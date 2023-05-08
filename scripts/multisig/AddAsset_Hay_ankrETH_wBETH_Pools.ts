import { runMultisigScript } from '.'
import * as multisig from '../../utils/multisig'

runMultisigScript('AddAssets_Hay_ankrETH_wBETH_Pools', async () => {
  return multisig.utils.addAssetsToMasterWombatAndVoter([
    'Asset_HAY_Pool_USDT',
    'Asset_HAY_Pool_USDC',
    'Asset_HAY_Pool_HAY',
    'Asset_wBETH_Pool_wBETH',
    'Asset_wBETH_Pool_ETH',
    'Asset_ankrETH_Pool_ankrETH',
    'Asset_ankrETH_Pool_ETH',
  ])
})
