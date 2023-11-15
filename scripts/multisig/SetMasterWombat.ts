import { runScript } from '.'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'

runScript('SetMasterWombat', async () => {
  const network = getCurrentNetwork()
  if ([Network.POLYGON_MAINNET, Network.OPTIMISM_MAINNET].includes(network)) {
    return multisig.utils.setMasterWombatToDependencies()
  } else {
    throw new Error('Wrong network')
  }
})
