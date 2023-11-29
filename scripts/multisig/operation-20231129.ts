import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { getRewarders } from '../../config/emissions.config'
import { getRewarderDeploymentName } from '../../utils/deploy'
import _ from 'lodash'

runScript('operation-20231129', async () => {
  const network = getCurrentNetwork()
  if (network == Network.OPTIMISM_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_Dola_Pool_DOLA', 'Asset_Dola_Pool_USDCe']),
        getRewarderDeploymentName
      )
    )
  } else {
    return []
  }
})
