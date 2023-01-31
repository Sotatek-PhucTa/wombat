import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { rewarderRunway, mwV3Overview, bribesRunway, voterOverview } from '../utils/hardhat'

task('runwayRewarder', 'print runway of v3 rewarders').setAction(async (_args, hre: HardhatRuntimeEnvironment) => {
  console.log(await rewarderRunway(hre))
})

task('runwayBribes', 'print runway of bribes contract').setAction(async (_args, hre: HardhatRuntimeEnvironment) => {
  console.log(await bribesRunway(hre))
})

task('overviewMw', 'print lp overview of masterWombatV3').setAction(async (_args, hre: HardhatRuntimeEnvironment) => {
  console.table(await mwV3Overview(hre))
})

task('overviewVoter', 'print lp overview of voter contract').setAction(
  async (_args, hre: HardhatRuntimeEnvironment) => {
    console.table(await voterOverview(hre))
  }
)
