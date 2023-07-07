import { parseEther } from 'ethers/lib/utils'
import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'
import { Token } from '../../config/token'

runScript('epoch-20230705', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      // top up lido pool's rewarder
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_WstETH_Pool_wstETH', Token.ARB, parseEther('2000')),
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_WstETH_Pool_wstETH', Token.WOM, parseEther('40000')),
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_WstETH_Pool_WETH', Token.ARB, parseEther('500'))
    )
  } else if (network == Network.BSC_MAINNET) {
    return concatAll(
      // pause rewarder for frxETH pool's frxETH LP
      multisig.utils.pauseRewardRateFor('Rewarder', ['Asset_frxETH_Pool_frxETH']),
      // top up frax pool's frax rewarder
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_stables_01_FRAX', Token.WOM, parseEther('2355')),
      // top up stable guild pool's frax rewarder
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_Mixed_Pool_FRAX', Token.WOM, parseEther('11215')),
      // top up Stable guild's CUSD bribe
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_Mixed_Pool_CUSD', Token.CUSD, parseEther('1000'))
    )
  } else {
    return []
  }
})
