import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { parseEther } from 'ethers/lib/utils'
import { Token } from '../../config/token'

runScript('operation-20230801', async () => {
  const network = getCurrentNetwork()
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.pauseRewardRateFor('Rewarder', ['Asset_frxETH_Pool_frxETH', 'Asset_frxETH_Pool_sfrxETH'])
    )
  } else if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      multisig.utils.addRewardToken('Bribe_Asset_ankrETH_Pool_WETH', Token.ANKR, parseEther('0')),
      multisig.utils.addRewardToken('Bribe_Asset_ankrETH_Pool_ankrETH', Token.ANKR, parseEther('0'))
    )
  } else {
    return []
  }
})
