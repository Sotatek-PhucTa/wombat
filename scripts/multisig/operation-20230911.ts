import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { getRewarders } from '../../config/emissions.config'
import { getRewarderDeploymentName } from '../../utils/deploy'
import _ from 'lodash'
import { Token } from '../../config/token'

runScript('operation-20230911', async () => {
  const network = getCurrentNetwork()
  if (network == Network.ETHEREUM_MAINNET) {
    return concatAll(
      // update rate for frxETH rewarders. and top up 2 epochs worth of WOM
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_frxETH_Pool_WETH', 'Asset_frxETH_Pool_frxETH', 'Asset_frxETH_Pool_sfrxETH']),
        getRewarderDeploymentName,
        2,
        [Token.WOM]
      )
      // top up 1 epoch worth of FXS for wETH-LP rewarder. TBD: gnosis safe doesn't have enough FXS.
      // multisig.utils.updateEmissionsAndTopUp(
      //   _.pick(getRewarders(), ['Asset_frxETH_Pool_WETH']),
      //   getRewarderDeploymentName,
      //   1,
      //   [Token.FXS]
      // )
    )
  } else if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      // top up 4 weeks worth of WOM for mPENDLE rewarders
      ...multisig.utils.topUpMultipleEpochs('MultiRewarderPerSec_V3_Asset_mPendle_Pool_PENDLE', Token.WOM, 4),
      ...multisig.utils.topUpMultipleEpochs('MultiRewarderPerSec_V3_Asset_mPendle_Pool_mPendle', Token.WOM, 4)
    )
  } else {
    return []
  }
})
