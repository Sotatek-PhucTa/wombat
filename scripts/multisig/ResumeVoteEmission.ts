import assert from 'assert'
import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'

runScript('ResumeVoteEmission', async () => {
  const network = await getCurrentNetwork()
  assert(network == Network.BSC_MAINNET, 'Wrong network')
  return multisig.utils.resumeVoteEmission(['Asset_iUSD_Pool_BUSD', 'Asset_iUSD_Pool_iUSD'])
})
