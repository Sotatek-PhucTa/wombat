import { parseUnits } from 'ethers/lib/utils'
import { runScript } from '.'
import * as multisig from '../../utils/multisig'
import { setMaxSupply } from '../../utils/multisig/utils'

async function batchTransactions() {
  return [
    await setMaxSupply('Asset_Main_Pool_USDC', parseUnits('100000', 6)),
    await setMaxSupply('Asset_Main_Pool_USDT', parseUnits('100000', 6)),
  ]
}

runScript('Timelock_Schedule_SetMaxSupply', async () => {
  return [await multisig.utils.scheduleTimelock(await batchTransactions())]
})

runScript('Timelock_Execute_SetMaxSupply', async () => {
  return [await multisig.utils.executeTimelock(await batchTransactions())]
})
