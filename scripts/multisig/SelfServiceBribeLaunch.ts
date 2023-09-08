import { runScript } from '.'
import { concatAll, multisig } from '../../utils'
import { getCurrentNetwork } from '../../types/network'
import { Network } from '../../types'
;(async function () {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  const upgradeTxns = [await multisig.utils.upgradeProxy('Voter_Proxy', 'Voter_Implementation')]
  // BSC: Schedule upgrade voter and setBribeRewarderFactory
  if (network == Network.BSC_MAINNET) {
    await runScript('Timelock_Schedule_SelfServiceBribeLaunch', async function () {
      return [await multisig.utils.scheduleTimelock(upgradeTxns)]
    })
    await runScript('Timelock_Execute_SelfServiceBribeLaunch', async function () {
      return [await multisig.utils.executeTimelock(upgradeTxns)].concat(await multisig.utils.setBribeRewarderFactory())
    })
  } else {
    await runScript('SelfServiceBribeLaunch', async function () {
      // ETH: init voter dependencies and setBribeRewarderFactory
      if (network == Network.ETHEREUM_MAINNET) {
        return concatAll(multisig.utils.initializeVoterToDependencies(), multisig.utils.setBribeRewarderFactory())
      } else if (network == Network.ARBITRUM_MAINNET) {
        // ARB: setBribeRewarderFactory
        return upgradeTxns.concat(await multisig.utils.setBribeRewarderFactory())
      } else {
        throw new Error(`Network ${network} not supported`)
      }
    })
  }
})()
