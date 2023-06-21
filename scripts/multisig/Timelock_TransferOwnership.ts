import assert from 'assert'
import { runScript } from '.'
import { Deployment, Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('Timelock_TransferOwnership', async () => {
  assert(getCurrentNetwork() == Network.BSC_MAINNET, 'Only bsc mainnet is supported.')
  return concatAll(
    multisig.utils.transferAssetsOwnership(
      ['Asset_BnbxPool_BNBx', 'Asset_BnbxPool_WBNB'],
      // TODO: add main pool after verification
      Deployment('TimelockController')
    ),
    multisig.utils.transferProxyAdminOwnership(Deployment('TimelockController'))
  )
})
