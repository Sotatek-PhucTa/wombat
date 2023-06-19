import { runScript } from '.'
import * as multisig from '../../utils/multisig'
import { getBribes, getRewarders } from '../../config/emissions.config'
import { concatAll } from '../../utils'
import { getBribeDeploymentName, getRewarderDeploymentName } from '../../utils/deploy'

runScript('UpdateEmission', async () => {
  return concatAll(
    multisig.utils.updateEmissions(await getBribes(), getBribeDeploymentName),
    multisig.utils.updateEmissions(await getRewarders(), getRewarderDeploymentName)
  )
})
