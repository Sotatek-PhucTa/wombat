import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import { Network } from '../../types'

runScript('SetBribe', async function () {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.setBribe('Bribe_Asset_SnBNB_Pool_SnBNB'),
      multisig.utils.setBribe('Bribe_Asset_SnBNB_Pool_WBNB')
    )
  } else {
    return []
  }
})
