import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { getRewarders } from '../../config/emissions.config'
import { getRewarderDeploymentName } from '../../utils/deploy'
import _ from 'lodash'
import { Token } from '../../config/token'

runScript('operation-20231121', async () => {
  const network = getCurrentNetwork()
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['BNBx', 'BnbxPool_WBNB', 'Asset_frxETH_Pool_ETH', 'Asset_frxETH_Pool_sfrxETH']),
        getRewarderDeploymentName,
        2,
        [Token.WOM]
      ),
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_stables_01_FRAX']),
        getRewarderDeploymentName,
        1,
        [Token.WOM]
      )
    )
  } else if (network == Network.AVALANCHE_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_sAVAX_Pool_WAVAX', 'Asset_sAVAX_Pool_sAVAX']),
        getRewarderDeploymentName,
        1,
        [Token.WOM]
      )
    )
  } else {
    return []
  }
})
