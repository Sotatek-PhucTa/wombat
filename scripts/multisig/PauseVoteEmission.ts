import assert from 'assert'
import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'

runScript('PauseVoteEmission', async () => {
  const network = await getCurrentNetwork()
  assert(network == Network.ARBITRUM_MAINNET, 'Wrong network')
  return multisig.utils.pauseVoteEmission([
    'Asset_MIM_Pool_MIM',
    'Asset_MIM_Pool_USDT',
    'Asset_mWOM_Pool_mWOM',
    'Asset_mWOM_Pool_WOM',
    'Asset_wmxWOM_Pool_wmxWOM',
    'Asset_wmxWOM_Pool_WOM',
    'Asset_qWOM_Pool_qWOM',
    'Asset_qWOM_Pool_WOM',
  ])
})
