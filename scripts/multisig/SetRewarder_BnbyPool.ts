import { runScript } from '.'
import { concatAll } from '../../utils'
import { getRewarderDeploymentName } from '../../utils/deploy'
import * as multisig from '../../utils/multisig'

runScript('SetRewarder_BnbyPool', async function () {
  return concatAll(
    multisig.utils.setRewarder(getRewarderDeploymentName('Asset_BNBy_Pool_WBNB')),
    multisig.utils.setRewarder(getRewarderDeploymentName('Asset_BNBy_Pool_BNBy'))
  )
})
