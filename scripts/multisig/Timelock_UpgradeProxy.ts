import { runScript } from '.'
import * as multisig from '../../utils/multisig'
import { upgradeProxy } from '../../utils/multisig/utils'

async function batchTransactions() {
  return [await upgradeProxy('Main_Pool_Proxy', 'HighCovRatioFeePoolV2_Implementation')]
}

runScript('Timelock_Schedule_UpgradeProxy', async () => {
  return [await multisig.utils.scheduleTimelock(await batchTransactions())]
})

runScript('Timelock_Execute_UpgradeProxy', async () => {
  return [await multisig.utils.executeTimelock(await batchTransactions())]
})
