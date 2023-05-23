import { runScript } from '.'
import { Deployment } from '../../types'
import { concatAll } from '../../utils'
import { getAllAssetsDeployments } from '../../utils/deploy'
import * as multisig from '../../utils/multisig'

runScript('Timelock_TransferOwnership', async () => {
  return concatAll(
    multisig.utils.transferAssetsOwnership(await getAllAssetsDeployments(), Deployment('TimelockController')),
    multisig.utils.transferProxyAdminOwnership(Deployment('TimelockController'))
  )
})
