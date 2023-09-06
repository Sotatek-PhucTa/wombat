import { runScript } from '.'
import { concatAll } from '../../utils'
import { getRewarderDeploymentName } from '../../utils/deploy'
import * as multisig from '../../utils/multisig'

runScript('SetRewarder_CrossChainPool', async function () {
  return concatAll(
    multisig.utils.setRewarder(getRewarderDeploymentName('Asset_Stablecoin_Pool_USDC')),
    multisig.utils.setRewarder(getRewarderDeploymentName('Asset_Stablecoin_Pool_USDT'))
  )
})
