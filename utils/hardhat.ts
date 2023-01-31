import { formatEther } from 'ethers/lib/utils'
import { Contract } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import _ from 'lodash'

// Alt version of getDeployedContract with hre as `hardhat` is not available for hh tasks.
async function getDeployedContractHre(
  hre: HardhatRuntimeEnvironment,
  contract: string,
  deploymentName = contract
): Promise<Contract> {
  const deployment = await hre.deployments.get(deploymentName)
  return hre.ethers.getContractAt(contract, deployment.address)
}

export async function rewarderRunway(hre: HardhatRuntimeEnvironment) {
  const names = Object.keys(await hre.deployments.all()).filter((name) => name.includes('MultiRewarderPerSec_V3'))
  return Promise.all(
    names.map(async (name) => {
      const rewarder = await getDeployedContractHre(hre, 'MultiRewarderPerSec', name)
      const rewardLength = await rewarder.rewardLength()
      const rewardInfos = await Promise.all(_.range(0, rewardLength).map((i) => rewarder.rewardInfo(i)))
      return Promise.all(
        rewardInfos.map(async (rewardInfo, idx) => {
          const tokenPerSec = rewardInfo.tokenPerSec
          const rewardBalances = (await rewarder.balances())[idx]
          const dayLeft = tokenPerSec > 0 ? rewardBalances.div(tokenPerSec).toNumber() / 86400 : 0
          return {
            rewarder: name,
            rewarderAddress: rewarder.address,
            lpToken: await rewarder.lpToken(),
            rewardTokens: rewardInfo.rewardToken,
            rewardBalances: formatEther((await rewarder.balances())[idx]),
            tokenPerSec: formatEther(rewardInfo.tokenPerSec),
            dayLeft: dayLeft.toString(),
          }
        })
      )
    })
  )
}

export async function mwV3Overview(hre: HardhatRuntimeEnvironment) {
  const masterWombatV3 = await getDeployedContractHre(hre, 'MasterWombatV3')
  const poolLength = await masterWombatV3.poolLength()
  const poolInfos = await Promise.all(_.range(0, poolLength).map((i) => masterWombatV3.poolInfoV3(i)))

  return Promise.all(
    poolInfos.map(async (poolInfo) => {
      const asset = await hre.ethers.getContractAt('Asset', poolInfo.lpToken)
      const symbol = await asset.symbol()
      const pool = await asset.pool()
      return {
        pool,
        symbol,
        lpToken: poolInfo.lpToken,
        rewardRate: formatEther(poolInfo.rewardRate),
      }
    })
  )
}

export async function voterOverview(hre: HardhatRuntimeEnvironment) {
  const voter = await getDeployedContractHre(hre, 'Voter')
  const lpTokenLength = await voter.lpTokenLength()
  const lpTokens = await Promise.all(_.range(0, lpTokenLength).map((i) => voter.lpTokens(i)))

  return Promise.all(
    lpTokens.map(async (lpToken) => {
      const gaugeInfo = await voter.infos(lpToken)
      const weights = await voter.weights(lpToken)
      return {
        lpAddress: lpToken,
        bribeAddress: gaugeInfo.bribe,
        allocPoint: formatEther(weights.allocPoint),
        voteWeight: formatEther(weights.voteWeight),
      }
    })
  )
}

export async function bribesRunway(hre: HardhatRuntimeEnvironment) {
  const voter = await getDeployedContractHre(hre, 'Voter')
  const lpTokenLength = await voter.lpTokenLength()
  const lpTokens = await Promise.all(_.range(0, lpTokenLength).map((i) => voter.lpTokens(i)))
  const bribes = await (
    await Promise.all(lpTokens.map(async (lpToken) => (await voter.infos(lpToken)).bribe))
  ).filter((name) => name != hre.ethers.constants.AddressZero)
  return Promise.all(
    bribes.map(async (name) => {
      const rewarder = await hre.ethers.getContractAt('MultiRewarderPerSec', name)
      const rewardLength = await rewarder.rewardLength()
      const rewardInfos = await Promise.all(_.range(0, rewardLength).map((i) => rewarder.rewardInfo(i)))
      return Promise.all(
        rewardInfos.map(async (rewardInfo, idx) => {
          const tokenPerSec = rewardInfo.tokenPerSec
          const rewardBalances = (await rewarder.balances())[idx]
          const dayLeft = tokenPerSec > 0 ? rewardBalances.div(tokenPerSec).toNumber() / 86400 : 0
          return {
            rewarder: name,
            lpToken: await rewarder.lpToken(),
            rewardTokens: rewardInfo.rewardToken,
            rewardBalances: formatEther((await rewarder.balances())[idx]),
            tokenPerSec: formatEther(rewardInfo.tokenPerSec),
            dayLeft: dayLeft.toString(),
          }
        })
      )
    })
  )
}
