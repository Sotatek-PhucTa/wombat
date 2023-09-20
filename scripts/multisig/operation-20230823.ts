import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import _ from 'lodash'
import { getBribes } from '../../config/emissions.config'
import { getBribeDeploymentName } from '../../utils/deploy'

runScript('operation-20230823', async () => {
  const network = getCurrentNetwork()
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getBribes(), [
          'Asset_SnBNB_Pool_SnBNB',
          'Asset_SnBNB_Pool_WBNB',
          'Asset_SidePool_01_HAY',
          'Asset_HAY_Pool_USDC',
          'Asset_HAY_Pool_USDT',
        ]),
        getBribeDeploymentName
      )
    )
  } else {
    return []
  }
})
