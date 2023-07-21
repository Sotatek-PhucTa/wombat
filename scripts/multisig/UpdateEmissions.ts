import { runScript } from '.'
import { Network } from '../../types'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import { getBribes, getRewarders } from '../../config/emissions.config'
import { concatAll } from '../../utils'
import { getBribeDeploymentName, getRewarderDeploymentName } from '../../utils/deploy'
import _ from 'lodash'
import assert from 'assert'

runScript('UpdateEmission', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissions(
        _.pick(getBribes(), [
          'Asset_ankrETH_Pool_ETH',
          'Asset_ankrETH_Pool_ankrETH',
          'Asset_AnkrBNBPool_WBNB',
          'Asset_AnkrBNBPool_ankrBNB',
        ]),
        getBribeDeploymentName
      )
      // multisig.utils.updateEmissions(_.pick(getRewarders(), ['Asset_stables_01_FRAX']), getRewarderDeploymentName)
    )
  } else if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissions(
        _.pick(getBribes(), ['Asset_ankrETH_Pool_WETH', 'Asset_ankrETH_Pool_ankrETH']),
        getBribeDeploymentName
      )
    )
  } else {
    assert(false, `Network ${network} is not supported.`)
  }
})
