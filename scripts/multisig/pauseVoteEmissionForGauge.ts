import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'

runScript('pauseVoteEmissionForGauge', async () => {
  const network = getCurrentNetwork()
  if (network == Network.BSC_MAINNET) {
    return concatAll(multisig.utils.pauseVoteEmissionFor(['Asset_stables_01_BUSD']))
  } else {
    return []
  }
})
