import assert from 'assert'
import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'

runScript('UnpauseVoteEmission', async () => {
  const network = getCurrentNetwork()
  assert(network == Network.BSC_MAINNET, 'Wrong network')
  return multisig.utils.unpauseVoteEmissionFor(['Asset_SnBNB_Pool_SnBNB', 'Asset_SnBNB_Pool_WBNB'])
})
