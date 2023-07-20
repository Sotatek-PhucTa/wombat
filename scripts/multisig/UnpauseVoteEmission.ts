import assert from 'assert'
import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'

runScript('UnpauseVoteEmission', async () => {
  const network = getCurrentNetwork()
  if (network == Network.BSC_MAINNET) {
    return multisig.utils.unpauseVoteEmissionFor(['Asset_SnBNB_Pool_SnBNB', 'Asset_SnBNB_Pool_WBNB'])
  } else if (network == Network.ARBITRUM_MAINNET) {
    return multisig.utils.unpauseVoteEmissionFor(['Asset_mPendle_Pool_PENDLE', 'Asset_mPendle_Pool_mPendle'])
  } else {
    return []
  }
})
