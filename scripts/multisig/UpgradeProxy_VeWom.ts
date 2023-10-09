import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import { multisig } from '../../utils'

runScript('UpgradeProxy_VeWom', async function () {
  console.log(`Running against network: ${getCurrentNetwork()}`)
  return [await multisig.utils.upgradeProxy('VeWom_Proxy', 'VeWom_Implementation')]
})
