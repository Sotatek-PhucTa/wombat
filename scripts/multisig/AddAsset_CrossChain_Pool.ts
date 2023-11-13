import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('AddAssets_CrossChain_Pool', async () => {
  const network = getCurrentNetwork()

  if ([Network.BSC_MAINNET, Network.ARBITRUM_MAINNET].includes(network)) {
    return concatAll(
      ...['Asset_Stablecoin_Pool_USDT', 'Asset_Stablecoin_Pool_USDC'].map((assetDeployment) =>
        multisig.utils.addAssetToMasterWombatAndVoter(assetDeployment, true)
      )
    )
  } else if ([Network.ETHEREUM_MAINNET].includes(network)) {
    return concatAll(
      ...['Asset_Stablecoin_Pool_USDT', 'Asset_Stablecoin_Pool_USDC'].map((assetDeployment) =>
        multisig.utils.addAssetToMasterWombat(assetDeployment)
      )
    )
  } else if ([Network.OPTIMISM_MAINNET].includes(network)) {
    return multisig.utils.addAssetToMasterWombat('Asset_Stablecoin_Pool_USDCe')
  } else {
    throw new Error(`Unsupported network: ${network}`)
  }
})
