import { parseEther } from 'ethers/lib/utils'
import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'
import { Token } from '../../config/token'
import { getBribes, getRewarders } from '../../config/emissions.config'
import { getBribeDeploymentName, getRewarderDeploymentName } from '../../utils/deploy'
import _ from 'lodash'

runScript('epoch-20230726', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      multisig.utils.pauseRewardRateFor('Rewarder', ['Asset_mPendle_Pool_PENDLE', 'Asset_mPendle_Pool_mPendle']),
      multisig.utils.updateEmissions(
        _.pick(getBribes(), ['Asset_frxETH_Pool_frxETH', 'Asset_frxETH_Pool_sfrxETH']),
        getBribeDeploymentName
      ),
      multisig.utils.topUpRewarder(
        'MultiRewarderPerSec_V3_Asset_mPendle_Pool_PENDLE',
        Token.WOM,
        parseEther('32967.033')
      ),
      multisig.utils.topUpRewarder(
        'MultiRewarderPerSec_V3_Asset_mPendle_Pool_mPendle',
        Token.WOM,
        parseEther('16758.2418')
      )
    )
  } else if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.pauseRewardRateFor('Bribe', ['Asset_IUSDPool_iUSD', 'Asset_IUSDPool_BUSD']),
      multisig.utils.updateEmissions(
        _.pick(getRewarders(), ['Asset_BNBy_Pool_WBNB', 'Asset_BNBy_Pool_BNBy']),
        getRewarderDeploymentName
      ),
      multisig.utils.updateEmissions(
        _.pick(getBribes(), ['Asset_frxETH_Pool_frxETH', 'Asset_frxETH_Pool_sfrxETH']),
        getBribeDeploymentName
      ),
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_frxETH_Pool_frxETH', Token.WOM, parseEther('2631')),
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_frxETH_Pool_sfrxETH', Token.WOM, parseEther('2631'))
    )
  } else {
    return []
  }
})
