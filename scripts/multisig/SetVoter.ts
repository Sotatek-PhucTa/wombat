import { runScript } from '.'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import { Network } from '../../types'

runScript('SetVoter', async function () {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  return multisig.utils.setVoter()
})
