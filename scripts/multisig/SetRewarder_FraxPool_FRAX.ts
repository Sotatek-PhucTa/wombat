import { runScript } from '.'
import { concatAll } from '../../utils'
import { getRewarderDeploymentName } from '../../utils/deploy'
import * as multisig from '../../utils/multisig'

runScript('SetRewarder_FraxPool_FRAX', async function () {
  return concatAll(multisig.utils.setRewarder(getRewarderDeploymentName('Asset_stables_01_FRAX')))
})
