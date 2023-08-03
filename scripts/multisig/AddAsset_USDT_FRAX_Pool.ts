import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('AddAsset_USDT_FRAX_Pool', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.addAssetToPool('Asset_stables_01_USDT', 'FactoryPools_stables_01')
      // already executed
      // multisig.utils.addAssetToMasterWombatAndVoter('Asset_stables_01_USDT', true)
    )
  } else {
    return []
  }
})
