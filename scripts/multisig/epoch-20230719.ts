import { parseEther } from 'ethers/lib/utils'
import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'
import { Token } from '../../config/token'
import _ from 'lodash'
import { getBribes } from '../../config/emissions.config'
import { getBribeDeploymentName } from '../../utils/deploy'

runScript('epoch-20230719', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      // add ankrETH as bribe reward token
      multisig.utils.addRewardToken('Bribe_Asset_ankrETH_Pool_WETH', Token.ankrETH, parseEther('0')),
      multisig.utils.addRewardToken('Bribe_Asset_ankrETH_Pool_ankrETH', Token.ankrETH, parseEther('0'))
    )
    // TODO: uncomment if ankr confirms the rates
    // } else if (network == Network.BSC_MAINNET) {
    //   return concatAll(
    //     multisig.utils.updateEmissions(
    //       _.pick(await getBribes(), [
    //         'Asset_ankrETH_Pool_ETH',
    //         'Asset_ankrETH_Pool_ankrETH',
    //         'Asset_AnkrBNBPool_WBNB',
    //         'Asset_AnkrBNBPool_ankrBNB',
    //       ]),
    //       getBribeDeploymentName
    //     )
    //   )
    // }
  } else {
    return []
  }
})
