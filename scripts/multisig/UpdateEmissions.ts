import { runScript } from '.'
import { Network } from '../../types'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import { getBribes } from '../../config/emissions.config'
import { concatAll } from '../../utils'
import { getBribeDeploymentName } from '../../utils/deploy'
import _ from 'lodash'

runScript('UpdateEmission', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissions(
        _.pick(await getBribes(), ['Asset_Mixed_Pool_USDC', 'Asset_Mixed_Pool_HAY']),
        getBribeDeploymentName
      )
      // multisig.utils.updateEmissions(_.pick(await getRewarders(), ['Asset_stables_01_FRAX']), getRewarderDeploymentName)
    )
  } else {
    return []
  }
})
