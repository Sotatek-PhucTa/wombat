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
      multisig.utils.setBribe('Bribe_Asset_rBNB_Pool_rBNB'),
      multisig.utils.setBribe('Bribe_Asset_rBNB_Pool_WBNB'),
      multisig.utils.setBribe('Bribe_Asset_USDS_Pool_USDS'),
      multisig.utils.setBribe('Bribe_Asset_USDS_Pool_USDT')
    )
  } else if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      multisig.utils.setBribe('Bribe_Asset_mPendle_Pool_PENDLE'),
      multisig.utils.setBribe('Bribe_Asset_mPendle_Pool_mPendle')
    )
  } else {
    return []
  }
})
