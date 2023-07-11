import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('Add_CUSD_Rewarder', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      // set Stable guild's CUSD rewarder
      multisig.utils.setRewarder('MultiRewarderPerSec_V3_Asset_Mixed_Pool_CUSD')
    )
  } else {
    return []
  }
})
