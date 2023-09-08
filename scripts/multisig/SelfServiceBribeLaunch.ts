import { runScript } from '.'
import { concatAll, multisig } from '../../utils'
import { getCurrentNetwork } from '../../types/network'
import { Network } from '../../types'

runScript('SelfServiceBribeLaunch', async function () {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.ETHEREUM_MAINNET) {
    return concatAll(multisig.utils.initializeVoterToDependencies(), multisig.utils.setBribeRewarderFactory())
  }
  return multisig.utils.setBribeRewarderFactory()
})
