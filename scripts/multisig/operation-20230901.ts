import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { Token } from '../../config/token'
import { parseEther } from 'ethers/lib/utils'
import _ from 'lodash'
import { convertTokenPerEpochToTokenPerSec } from '../../config/emission'

runScript('operation-20230901', async () => {
  const network = getCurrentNetwork()
  if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_mPendle_Pool_PENDLE', Token.WOM, parseEther('6832')),
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_mPendle_Pool_mPendle', Token.WOM, parseEther('3416'))
    )
  } else if (network == Network.ETHEREUM_MAINNET) {
    return concatAll(
      // Stader ETHx
      // top up 4 weeks worth of WOM emission
      ...multisig.utils.topUpMultipleEpochs('MultiRewarderPerSec_V3_Asset_ETHx_Pool_WETH', Token.WOM, 4),
      ...multisig.utils.topUpMultipleEpochs('MultiRewarderPerSec_V3_Asset_ETHx_Pool_ETHx', Token.WOM, 4),
      // Lido wstETH
      multisig.utils.pauseRewardRateFor('Rewarder', ['Asset_wstETH_Pool_wstETH', 'Asset_wstETH_Pool_WETH']),
      // agEUR
      multisig.utils.pauseRewardRateFor('Rewarder', ['Asset_agEUR_Pool_agEUR', 'Asset_agEUR_Pool_EURe']),
      // frxETH, top up for 4 weeks, same rate
      ...multisig.utils.topUpMultipleEpochs(
        'MultiRewarderPerSec_V3_Asset_frxETH_Pool_WETH',
        Token.WOM,
        4,
        convertTokenPerEpochToTokenPerSec(parseEther('4505'))
      ),
      ...multisig.utils.topUpMultipleEpochs(
        'MultiRewarderPerSec_V3_Asset_frxETH_Pool_frxETH',
        Token.WOM,
        4,
        convertTokenPerEpochToTokenPerSec(parseEther('5631'))
      ),
      ...multisig.utils.topUpMultipleEpochs(
        'MultiRewarderPerSec_V3_Asset_frxETH_Pool_sfrxETH',
        Token.WOM,
        4,
        convertTokenPerEpochToTokenPerSec(parseEther('1126'))
      )
    )
  } else {
    return []
  }
})
