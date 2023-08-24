import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { Token } from '../../config/token'
import { parseEther } from 'ethers/lib/utils'

function topUpMultipleEpochs(contractName: string, token: Token, epochs: number) {
  return Array.from({ length: epochs }).map(() => multisig.utils.topUpRewarder(contractName, token))
}

runScript('operation-20230816', async () => {
  const network = getCurrentNetwork()
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.pauseRewardRateFor('Bribe', ['Asset_Mixed_Pool_HAY']),
      multisig.utils.pauseVoteEmissionFor(['Asset_Mixed_Pool_HAY'])
    )
  } else if (network == Network.ARBITRUM_MAINNET) {
    return []
  } else if (network == Network.ETHEREUM_MAINNET) {
    return concatAll(
      // Stader ETHx
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_ETHx_Pool_WETH', Token.SD, parseEther('1300')),
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_ETHx_Pool_ETHx', Token.SD, parseEther('1300')),
      // top up 3 weeks worth of emission
      ...topUpMultipleEpochs('MultiRewarderPerSec_V3_Asset_ETHx_Pool_WETH', Token.WOM, 3),
      ...topUpMultipleEpochs('MultiRewarderPerSec_V3_Asset_ETHx_Pool_ETHx', Token.WOM, 3),
      // Lido wstETH
      // top up 3 weeks worth of emission
      ...topUpMultipleEpochs('MultiRewarderPerSec_V3_Asset_wstETH_Pool_WETH', Token.WOM, 3),
      ...topUpMultipleEpochs('MultiRewarderPerSec_V3_Asset_wstETH_Pool_wstETH', Token.WOM, 3),
      // agEUR
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_agEUR_Pool_EURe', Token.ANGLE, parseEther('56962')),
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_agEUR_Pool_agEUR', Token.ANGLE, parseEther('56962')),
      // top up 3 weeks worth of emission
      ...topUpMultipleEpochs('MultiRewarderPerSec_V3_Asset_agEUR_Pool_EURe', Token.WOM, 3),
      ...topUpMultipleEpochs('MultiRewarderPerSec_V3_Asset_agEUR_Pool_agEUR', Token.WOM, 3),
      // frxETH
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_frxETH_Pool_WETH', Token.FXS, parseEther('79')),
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_frxETH_Pool_frxETH', Token.FXS, parseEther('99')),
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_frxETH_Pool_sfrxETH', Token.FXS, parseEther('19')),
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_frxETH_Pool_WETH', Token.WOM, parseEther('4505')),
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_frxETH_Pool_frxETH', Token.WOM, parseEther('5631')),
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_frxETH_Pool_sfrxETH', Token.WOM, parseEther('1125.99'))
    )
  } else {
    return []
  }
})
