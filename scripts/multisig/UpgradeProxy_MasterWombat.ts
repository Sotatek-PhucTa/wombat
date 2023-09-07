import { runScript } from '.'
import { multisig } from '../../utils'

import { getCurrentNetwork } from '../../types/network'
import { Network } from '../../types'
import { scheduler } from 'timers/promises'
;(async function () {
  const network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)

  const txns = [await multisig.utils.upgradeProxy('MasterWombatV3_Proxy', 'BoostedMasterWombat_Implementation')]

  if (network === Network.BSC_MAINNET) {
    // Upgrade Proxy with timelock
    await runScript('Timelock_Schedule_UpgradeProxy_MasterWombat', async function () {
      return [await multisig.utils.scheduleTimelock(txns)]
    })
    await scheduler.wait(100)
    await runScript('Timelock_Execute_UpgradeProxy_MasterWombat', async function () {
      return [await multisig.utils.executeTimelock(txns)]
    })
  } else {
    // Upgrade Proxy with Multisig
    runScript('UpgradeProxy_MasterWombat', async function () {
      return txns
    })
  }
})()
