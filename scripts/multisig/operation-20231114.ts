import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { Token } from '../../config/token'
import { parseEther } from 'ethers/lib/utils'
import { getRewarders } from '../../config/emissions.config'
import { getRewarderDeploymentName } from '../../utils/deploy'
import _ from 'lodash'

runScript('operation-20231114', async () => {
  const network = getCurrentNetwork()
  if (network == Network.AVALANCHE_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_sAVAX_Pool_WAVAX', 'Asset_sAVAX_Pool_sAVAX']),
        getRewarderDeploymentName,
        2,
        [Token.WOM]
      )
    )
  } else if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_frxETH_Pool_frxETH', 'Asset_frxETH_Pool_ETH', 'Asset_frxETH_Pool_sfrxETH']),
        getRewarderDeploymentName,
        2,
        [Token.WOM]
      )
    )
  } else if (network == Network.ETHEREUM_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), [
          'Asset_frxETH_Pool_WETH',
          'Asset_frxETH_Pool_frxETH',
          'Asset_frxETH_Pool_sfrxETH',
          'Asset_ETHx_Pool_ETHx',
        ]),
        getRewarderDeploymentName,
        3,
        [Token.WOM]
      ),
      multisig.utils.topUpRewarderExactAmount(
        getRewarderDeploymentName('Asset_ETHx_Pool_WETH'),
        Token.WOM,
        parseEther('98754') // 3 * 32918
      )
    )
  } else {
    return []
  }
})
