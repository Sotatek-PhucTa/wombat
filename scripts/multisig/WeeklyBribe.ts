import { parseEther } from 'ethers/lib/utils'
import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'
import { Token } from '../../config/token'

runScript('WeeklyBribe', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      // Lido wstETH pool
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_WstETH_Pool_wstETH', Token.WOM, parseEther('40000')),
      multisig.utils.topUpRewarder('Bribe_Asset_WstETH_Pool_wstETH', Token.ARB, parseEther('5000'))
    )
  } else if (network == Network.BSC_MAINNET) {
    return concatAll(
      // frxETH pool
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_frxETH_Pool_frxETH', Token.WOM, parseEther('3000'))
    )
  } else {
    return []
  }
})
