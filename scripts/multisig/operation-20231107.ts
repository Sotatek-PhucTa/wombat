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

runScript('operation-20231107', async () => {
  const network = getCurrentNetwork()
  if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_fUSDC_Pool_fUSDC', 'Asset_fUSDC_Pool_USDCe']),
        getRewarderDeploymentName,
        2,
        [Token.WOM]
      )
    )
  } else if (network == Network.AVALANCHE_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_sAVAX_Pool_WAVAX', 'Asset_sAVAX_Pool_sAVAX']),
        getRewarderDeploymentName
      )
    )
  } else if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['BNBx', 'BnbxPool_WBNB']),
        getRewarderDeploymentName,
        2,
        [Token.WOM]
      )
    )
  } else if (network == Network.ETHEREUM_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_frxETH_Pool_frxETH', 'Asset_frxETH_Pool_sfrxETH']),
        getRewarderDeploymentName,
        2,
        [Token.WOM]
      )
    )
  } else {
    return []
  }
})
