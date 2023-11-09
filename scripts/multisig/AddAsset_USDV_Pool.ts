import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

const ASSETS = ['Asset_USDV_Pool_USDT', 'Asset_USDV_Pool_USDV']

runScript('AddAsset_USDV_Pool', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)

  if ([Network.BSC_MAINNET, Network.ARBITRUM_MAINNET, Network.ETHEREUM_MAINNET].includes(network)) {
    return concatAll(...ASSETS.map((asset) => multisig.utils.addAssetToMasterWombatAndVoter(asset, false)))
  } else if (network === Network.AVALANCHE_MAINNET) {
    return concatAll(...ASSETS.map((asset) => multisig.utils.addAssetToMasterWombat(asset)))
  } else {
    return []
  }
})
