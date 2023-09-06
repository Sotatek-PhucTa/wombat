import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { getBribes, getRewarders } from '../../config/emissions.config'
import { getBribeDeploymentName, getRewarderDeploymentName } from '../../utils/deploy'
import _ from 'lodash'

runScript('operation-20230906', async () => {
  const network = getCurrentNetwork()
  if (network == Network.ETHEREUM_MAINNET) {
    // change back rate of ETHx rewarders
    // update rate for frxETH
    return concatAll(
      multisig.utils.updateEmissions(
        _.pick(getRewarders(), [
          'Asset_ETHx_Pool_WETH',
          'Asset_ETHx_Pool_ETHx',
          'Asset_frxETH_Pool_WETH',
          'Asset_frxETH_Pool_frxETH',
          'Asset_frxETH_Pool_sfrxETH',
        ]),
        getRewarderDeploymentName
      )
    )
  } else if (network == Network.ARBITRUM_MAINNET) {
    // update rate for mPENDLE rewarders
    return concatAll(
      multisig.utils.updateEmissions(
        _.pick(getRewarders(), ['Asset_mPendle_Pool_PENDLE', 'Asset_mPendle_Pool_mPendle']),
        getRewarderDeploymentName
      )
    )
  } else if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissions(
        _.pick(getBribes(), [
          'Asset_stables_01_USDT',
          'Asset_frxETH_Pool_frxETH',
          'Asset_frxETH_Pool_ETH',
          'Asset_frxETH_Pool_sfrxETH',
        ]),
        getBribeDeploymentName
      )
    )
  } else {
    return []
  }
})
