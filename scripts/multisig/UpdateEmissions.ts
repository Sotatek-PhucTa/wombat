import { runScript } from '.'
import * as multisig from '../../utils/multisig'
import { getBribes, getRewarders } from '../../config/emissions.config'
import { concatAll } from '../../utils'
import { getBribeDeploymentName, getRewarderDeploymentName } from '../../utils/deploy'
import _ from 'lodash'

runScript('UpdateEmission', async () => {
  return concatAll(
    multisig.utils.updateEmissions(
      _.pick(await getBribes(), ['Asset_WstETH_Pool_WETH', 'Asset_WstETH_Pool_wstETH']),
      getBribeDeploymentName
    ),
    multisig.utils.updateEmissions(
      _.pick(await getRewarders(), [
        'Asset_WstETH_Pool_WETH',
        'Asset_WstETH_Pool_wstETH',
        'Asset_frxETH_Pool_ETH',
        'Asset_frxETH_Pool_frxETH',
        'Asset_frxETH_Pool_sfrxETH',
        'Asset_Mixed_Pool_FRAX',
        'Asset_stables_01_FRAX',
      ]),
      getRewarderDeploymentName
    )
  )
})
