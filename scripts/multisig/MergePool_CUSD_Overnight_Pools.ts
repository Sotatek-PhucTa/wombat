import { runScript } from '.'
import * as multisig from '../../utils/multisig'

runScript('MergePool_CUSD_Overnight_Pools', async () => {
  return multisig.utils.mergePools(['FactoryPools_USDPlus_Pool_Proxy', 'FactoryPools_CUSD_Pool_Proxy'])
})
