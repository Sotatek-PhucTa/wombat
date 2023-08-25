import { runScript } from '.'
import { Network } from '../../types'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import { getBribes, getRewarders } from '../../config/emissions.config'
import { concatAll } from '../../utils'
import { getBribeDeploymentName, getRewarderDeploymentName } from '../../utils/deploy'
import _ from 'lodash'
import assert from 'assert'

runScript('PauseOrResumeRewardRate', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.BSC_MAINNET || network == Network.ARBITRUM_MAINNET || network == Network.ETHEREUM_MAINNET) {
    return concatAll(
      multisig.utils.pauseOrResumeRewardRate(getBribes(), getBribeDeploymentName),
      multisig.utils.pauseOrResumeRewardRate(getRewarders(), getRewarderDeploymentName)
    )
  } else {
    assert(false, `Network ${network} is not supported.`)
  }
})
