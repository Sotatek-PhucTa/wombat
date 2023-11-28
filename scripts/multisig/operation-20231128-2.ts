import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { getBribeDeploymentName } from '../../utils/deploy'
import { Token } from '../../config/token'

runScript('operation-20231128-2', async () => {
  const network = getCurrentNetwork()
  if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      ...['Asset_frxETH_Pool_frxETH', 'Asset_frxETH_Pool_sfrxETH', 'Asset_frxETH_Pool_WETH'].map((asset) =>
        multisig.utils.addRewardToken(getBribeDeploymentName(asset), Token.ARB, 0)
      )
    )
  } else {
    return []
  }
})
