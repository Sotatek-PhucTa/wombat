import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { multisig } from '../../utils'

runScript('Unpause_veWom', async () => {
  const network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if ([Network.AVALANCHE_MAINNET, Network.BASE_MAINNET].includes(network)) {
    return multisig.utils.unpauseVeWom()
  } else {
    return []
  }
})
