import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { getRewarders, getBribes } from '../../config/emissions.config'
import { getRewarderDeploymentName, getBribeDeploymentName } from '../../utils/deploy'
import _ from 'lodash'
import { Token } from '../../config/token'

runScript('operation-20230921', async () => {
  const network = getCurrentNetwork()
  if (network == Network.ETHEREUM_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_Stablecoin_Pool_USDC', 'Asset_Stablecoin_Pool_USDT']),
        getRewarderDeploymentName,
        4,
        [Token.WOM]
      ),
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), [
          'Asset_ETHx_Pool_ETHx',
          'Asset_ETHx_Pool_WETH',
          'Asset_frxETH_Pool_frxETH',
          'Asset_frxETH_Pool_WETH',
          'Asset_frxETH_Pool_sfrxETH',
        ]),
        getRewarderDeploymentName
      )
    )
  } else if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      // top up 2 weeks worth of WOM for mPENDLE rewarders
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_mPendle_Pool_PENDLE', 'Asset_mPendle_Pool_mPendle']),
        getRewarderDeploymentName,
        2,
        [Token.WOM]
      )
    )
  } else if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getBribes(), ['Asset_frxETH_Pool_frxETH', 'Asset_frxETH_Pool_ETH', 'Asset_frxETH_Pool_sfrxETH']),
        getBribeDeploymentName
      ),
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_qWOMPool_WOM', 'Asset_qWOMPool_qWOM']),
        getRewarderDeploymentName
      )
    )
  } else {
    return []
  }
})
