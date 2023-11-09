import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

const assets = [
  'Asset_frxETH_Pool_frxETH',
  'Asset_frxETH_Pool_WETH',
  'Asset_frxETH_Pool_sfrxETH',
  'Asset_Frax_Pool_FRAX',
  'Asset_Frax_Pool_USDT',
  'Asset_USDV_Pool_USDV',
  'Asset_USDV_Pool_USDT',
  'Asset_Dola_Pool_DOLA',
  'Asset_Dola_Pool_USDC',
]

runScript('AddAsset_Frax_Usdv_Dola_frxETH_Pools', async () => {
  return concatAll(...assets.map((assetDeployment) => multisig.utils.addAssetToMasterWombat(assetDeployment)))
})
