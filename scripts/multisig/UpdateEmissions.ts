import { runScript } from '.'
import * as multisig from '../../utils/multisig'
import { getBribes, getRewarders } from '../../config/emissions.config'
import { concatAll } from '../../utils'
import { getBribeDeploymentName, getRewarderDeploymentName } from '../../utils/deploy'
import _ from 'lodash'

runScript('UpdateEmission', async () => {
  // Assets whose rewarders and bribes managed by us
  const assets = ['Asset_WstETH_Pool_WETH', 'Asset_WstETH_Pool_wstETH']
  return concatAll(
    multisig.utils.updateEmissions(_.pick(await getBribes(), assets), getBribeDeploymentName),
    multisig.utils.updateEmissions(_.pick(await getRewarders(), assets), getRewarderDeploymentName)
  )
})
