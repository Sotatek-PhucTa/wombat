import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { getBribes } from '../../config/emissions.config'
import { getBribeDeploymentName } from '../../utils/deploy'
import _ from 'lodash'

runScript('operation-20231031', async () => {
  const network = getCurrentNetwork()
  if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getBribes(), ['Asset_frxETH_Pool_WETH', 'Asset_frxETH_Pool_sfrxETH']),
        getBribeDeploymentName
      )
    )
  } else {
    return []
  }
})
