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

runScript('UpdateEmission', async () => {
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
        _.pick(getRewarders(), ['Asset_fUSDC_Pool_fUSDC', 'Asset_fUSDC_Pool_USDCe']),
        getRewarderDeploymentName
      )
    )
  } else if (network == Network.ETHEREUM_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_ETHx_Pool_WETH', 'Asset_ETHx_Pool_ETHx']),
        getRewarderDeploymentName
      )
    )
  } else {
    assert(false, `Network ${network} is not supported.`)
  }
})
