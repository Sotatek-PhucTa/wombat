import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { multisig } from '../../utils'

runScript('Unpause_veWom', async () => {
  const network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network === Network.AVALANCHE_MAINNET) {
    return multisig.utils.unpauseVeWom()
  } else {
    return []
  }
})
