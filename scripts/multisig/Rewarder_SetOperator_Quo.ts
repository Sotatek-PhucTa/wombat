import { runScript } from '.'
import { ExternalContract } from '../../config/contract'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('Rewarder_SetOperator_Quo', async () => {
  return concatAll(
    multisig.utils.setOperator('MultiRewarderPerSec_V3_Asset_qWOMPool_WOM', ExternalContract.QuollBribeOperator),
    multisig.utils.setOperator('MultiRewarderPerSec_V3_Asset_qWOMPool_qWOM', ExternalContract.QuollBribeOperator)
  )
})
