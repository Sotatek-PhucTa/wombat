import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { getRewarders } from '../../config/emissions.config'
import { getRewarderDeploymentName } from '../../utils/deploy'
import _ from 'lodash'

runScript('operation-20230905', async () => {
  const network = getCurrentNetwork()
  if (network == Network.BSC_MAINNET) {
    return concatAll(multisig.utils.pauseVoteEmissionFor(['Asset_StkBnbPool_stkBNB', 'Asset_StkBnbPool_WBNB']))
  } else if (network == Network.ETHEREUM_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_ETHx_Pool_WETH', 'Asset_ETHx_Pool_ETHx']),
        getRewarderDeploymentName
      )
    )
  } else {
    return []
  }
})
