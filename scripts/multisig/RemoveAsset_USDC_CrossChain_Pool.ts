import assert from 'assert'
import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'

runScript('RemoveAsset_USDC_CrossChain_Pool', async () => {
  const network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  assert([Network.OPTIMISM_MAINNET, Network.POLYGON_MAINNET].includes(network), `Unsupported network: ${network}`)
  return concatAll(multisig.utils.removeAssets(['Asset_Stablecoin_Pool_USDC']))
})
