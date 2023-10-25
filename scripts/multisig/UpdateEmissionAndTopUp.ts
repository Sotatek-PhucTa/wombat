import { runScript } from '.'
import { Network } from '../../types'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import { getBribes, getRewarders } from '../../config/emissions.config'
import { concatAll } from '../../utils'
import { getBribeDeploymentName, getRewarderDeploymentName } from '../../utils/deploy'
import _ from 'lodash'
import assert from 'assert'
import { Token } from '../../config/token'

runScript('UpdateEmissionAndTopUp', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_BNBy_Pool_WBNB', 'Asset_BNBy_Pool_BNBy']),
        getRewarderDeploymentName
      )
    )
  } else if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_mPendle_Pool_PENDLE', 'Asset_mPendle_Pool_mPendle']),
        getRewarderDeploymentName
      )
    )
  } else if (network == Network.ETHEREUM_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_ETHx_Pool_WETH']),
        getRewarderDeploymentName
      ),
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_ETHx_Pool_ETHx']),
        getRewarderDeploymentName,
        2,
        [Token.WOM]
      )
    )
  } else {
    assert(false, `Network ${network} is not supported.`)
  }
})
