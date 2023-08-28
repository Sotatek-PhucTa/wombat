import { runScript } from '.'
import { multisig } from '../../utils'
import { getCurrentNetwork } from '../../types/network'
import { Network } from '../../types'

runScript('SetBribeRewarderFactory', async function () {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)

  return multisig.utils.setBribeRewarderFactory()
})
