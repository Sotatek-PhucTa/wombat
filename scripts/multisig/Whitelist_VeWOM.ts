import { runScript } from '.'
import { concatAll } from '../../utils'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { ExternalContract } from '../../config/contract'

runScript('Whitelist_for_VeWOM', async function () {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.ETHEREUM_MAINNET) {
    return concatAll(multisig.utils.whitelistForVeWom(ExternalContract.MagpieVeWomProxy))
  } else {
    return []
  }
})
