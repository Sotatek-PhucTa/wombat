import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { concatAll, getAddress, getDeployedContract, impersonateAsMultisig, isForkedNetwork } from '..'
import { getBribeDeploymentName, getRewarderDeploymentName } from '../deploy'
import { BatchTransaction } from './tx-builder'
import { Safe, encodeData, executeBatchTransaction } from './transactions'
import assert from 'assert'
import chalk from 'chalk'
import { Token, getTokenAddress, getTokenDeploymentOrAddress } from '../../config/token'
import { BigNumberish, Contract, BigNumber, utils } from 'ethers'
import { Zero } from '@ethersproject/constants'
import _ from 'lodash'
import { epoch_duration_seconds } from '../../config/epoch'
import { convertTokenPerEpochToTokenPerSec } from '../../config/emission'
import { ExternalContract, getContractAddress } from '../../config/contract'
import { isSameAddress } from '../addresses'
import { DeploymentOrAddress, IRewardInfoStruct, IRewarder, TokenMap } from '../../types'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { convertTokenPerMonthToTokenPerSec } from '../../config/emission'
import { duration } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time'

// This function will create two transactions:
// 1. MasterWombatV3.add(lp, rewarder)
// 2. Voter.add(masterWombat, lp, bribe)
//
// It relies on naming convetion to find rewarder and bribe for the asset.
// For example, if you asset id is `Asset_USDPlus_Pool_USDC`, it will look for:
// - Bribe_Asset_USDPlus_Pool_USDC
// - MultiRewarderPerSec_V3_Asset_USDPlus_Pool_USDC
export async function addAssetToMasterWombatAndVoter(
  assetDeployment: string,
  bypassGovernanceVoting = false
): Promise<BatchTransaction[]> {
  const lpToken = await getDeployedContract('Asset', assetDeployment)
  const rewarder = await deployments.getOrNull(getRewarderDeploymentName(assetDeployment))
  const bribe = await deployments.getOrNull(getBribeDeploymentName(assetDeployment))
  const masterWombat = await getDeployedContract('MasterWombatV3')
  const voter = await getDeployedContract('Voter')

  return [
    Safe(masterWombat).add(lpToken.address, rewarder?.address || ethers.constants.AddressZero),
    Safe(voter).add(masterWombat.address, lpToken.address, bribe?.address || ethers.constants.AddressZero),
    // Bribe emission is disabled by default and only enabled by governance.
    ...(bypassGovernanceVoting ? [] : [Safe(voter).pauseVoteEmission(lpToken.address)]),
  ]
}

export async function addAssetToMasterWombat(assetDeployment: string): Promise<BatchTransaction[]> {
  const lpToken = await getDeployedContract('Asset', assetDeployment)
  const rewarder = await deployments.getOrNull(getRewarderDeploymentName(assetDeployment))
  const masterWombat = await getDeployedContract('MasterWombatV3')
  return [Safe(masterWombat).add(lpToken.address, rewarder?.address || ethers.constants.AddressZero)]
}

export async function addAssetToPool(assetDeployment: string, poolDeployment: string): Promise<BatchTransaction[]> {
  const asset = await getDeployedContract('Asset', assetDeployment)
  const token = await asset.underlyingToken()
  const pool = await getDeployedContract('PoolV2', poolDeployment)
  return [Safe(pool).addAsset(token, asset.address)]
}

// This function generates transactions to merge pools.
// The first pool will be used as the base for all assets.
export async function mergePools(poolDeployments: string[]): Promise<BatchTransaction[]> {
  assert(poolDeployments.length > 1, 'Need at least two pools to merge')
  assert(
    poolDeployments.every((name) => name.includes('Proxy')),
    'Must use proxy'
  )

  const [basePool, ...otherPools] = await Promise.all(
    poolDeployments.map((pool) => getDeployedContract('PoolV2', pool))
  )
  const txns = []
  // For each pool to merge:
  // 1. pause the pool
  // 2. transfer all assets to the base pool
  for (const pool of otherPools) {
    txns.push(Safe(pool).pause())
    for (const token of await pool.getTokens()) {
      const assetAddress = await pool.addressOfAsset(token)
      const asset = await ethers.getContractAt('Asset', assetAddress)
      txns.push(Safe(asset).setPool(basePool.address))
      txns.push(Safe(basePool).addAsset(token, assetAddress))
    }
  }

  assert(txns.length >= 5 * otherPools.length, 'Expect at least 3 transactions per pool to merge')
  return txns
}

// Pause a pool by name
export async function pausePool(poolDeployment: string): Promise<BatchTransaction[]> {
  assert(poolDeployment.includes('Proxy'), 'Must use proxy')
  const pool = await getDeployedContract('PoolV2', poolDeployment)
  return [Safe(pool).pause()]
}

export async function unpausePool(poolDeployment: string): Promise<BatchTransaction[]> {
  assert(poolDeployment.includes('Proxy'), 'Must use proxy')
  const pool = await getDeployedContract('PoolV2', poolDeployment)
  return [Safe(pool).unpause()]
}

// Pause asset by looking up the pool from the asset.
export async function pauseAsset(assetDeployment: string): Promise<BatchTransaction[]> {
  const asset = await getDeployedContract('Asset', assetDeployment)
  const token = await asset.underlyingToken()
  const pool = await ethers.getContractAt('PoolV2', await asset.pool())
  return [Safe(pool).pauseAsset(token)]
}

export async function setPool(assetDeployment: string, poolDeployment: string): Promise<BatchTransaction[]> {
  assert(poolDeployment.includes('Proxy'), 'Must use proxy')
  const asset = await getDeployedContract('Asset', assetDeployment)
  const pool = await getDeployedContract('PoolV2', poolDeployment)
  return [Safe(asset).setPool(pool.address)]
}

// 1. asset set pool to multisig
// 2. multisig transfer erc20 to asset
// 3. multisig addcash to asset
// 4. multisig set pool to pool
export async function addCash(
  assetDeployment: string,
  token: Token,
  amount: BigNumberish
): Promise<BatchTransaction[]> {
  const { multisig } = await getNamedAccounts()
  const asset = await getDeployedContract('Asset', assetDeployment)
  const originalPool = await asset.pool()

  const tokenAddress = await getAddress(getTokenDeploymentOrAddress(token))
  const erc20 = await ethers.getContractAt('ERC20', tokenAddress)

  return [
    Safe(asset).setPool(multisig),
    Safe(erc20).transfer(asset.address, amount),
    Safe(asset).addCash(amount),
    Safe(asset).setPool(originalPool),
  ]
}

// Remove asset from current pool and add it to the standalone pool.
export async function removeAssets(
  assetDeployments: string[],
  poolDeployment = 'FactoryPools_StandalonePool_Proxy'
): Promise<BatchTransaction[]> {
  assert(poolDeployment.includes('Proxy'), 'Must use proxy')
  const standalonePool = await getDeployedContract('PoolV2', poolDeployment)
  return concatAll(
    ...assetDeployments.flatMap(async (assetDeployment) => {
      const asset = await getDeployedContract('Asset', assetDeployment)
      const token = await asset.underlyingToken()
      const poolAddress = await asset.pool()
      const currentPool = await ethers.getContractAt('PoolV2', poolAddress)
      return [
        Safe(currentPool).removeAsset(token),
        Safe(asset).setPool(standalonePool.address),
        Safe(standalonePool).addAsset(token, asset.address),
        Safe(standalonePool).pauseAsset(token),
      ]
    })
  )
}

// Set bribe to voter
// Requires: bribe.master() == voter.address
// Requires: no existing bribe or it has no active emission
export async function setBribe(bribeDeployment: string): Promise<BatchTransaction[]> {
  const bribe = await getDeployedContract('Bribe', bribeDeployment)
  const voter = await getDeployedContract('Voter')
  const master = await bribe.master()
  assert(voter.address == master, `Voter does not own bribe. Voter: ${voter.address}, Bribe master: ${master}`)
  const lpToken = await bribe.lpToken()

  // Make sure existing bribe is not emitting
  const { bribe: currentBribe } = await voter.infos(lpToken)
  if (currentBribe != ethers.constants.AddressZero) {
    assert(await !hasActiveRewards(bribe), 'Bribe is still emitting rewards')
  }
  return [Safe(voter).setBribe(lpToken, bribe.address)]
}

// Requires: rewarder.master() == voter.address
// Requires: no existing rewarder or it has no active emission
export async function setRewarder(rewarderDeployment: string): Promise<BatchTransaction[]> {
  const rewarder = await getDeployedContract('MultiRewarderPerSec', rewarderDeployment)
  const masterWombat = await getDeployedContract('MasterWombatV3')
  const master = await rewarder.master()
  assert(
    masterWombat.address == master,
    `MasterWombat does not own rewarder. MasterWombat: ${masterWombat.address}, Rewarder master: ${master}`
  )
  const lpToken = await rewarder.lpToken()
  const pid = await masterWombat.getAssetPid(lpToken)

  // Make sure existing bribe is not emitting
  const { rewarder: currentRewarder } = await masterWombat.poolInfoV3(pid)
  if (currentRewarder != ethers.constants.AddressZero) {
    assert(await !hasActiveRewards(rewarder), 'Bribe is still emitting rewards')
  }
  return [Safe(masterWombat).setRewarder(pid, rewarder.address)]
}

async function hasActiveRewards(rewarderOrBribe: Contract): Promise<boolean> {
  const length = await rewarderOrBribe.rewardLength()
  const tokenRates = await Promise.all(
    _.range(0, length).map(async (i) => {
      const { tokenPerSec } = await rewarderOrBribe.rewardInfo(i)
      return tokenPerSec
    })
  )
  return tokenRates.every((tokenPerSec) => tokenPerSec == 0)
}

export async function topUpRewarder(
  rewarderOrBribeDeployment: string,
  token: Token,
  epochAmount?: BigNumberish
): Promise<BatchTransaction[]> {
  const rewarder = await getDeployedContract('MultiRewarderPerSec', rewarderOrBribeDeployment)
  const length = await rewarder.rewardLength()
  const tokenAddress = await getTokenAddress(token)
  const allRewardRates = await Promise.all(
    _.range(0, length).map(async (i) => ({ i, ...(await rewarder.rewardInfo(i)) }))
  )

  const currentRewardRate = allRewardRates.find(({ rewardToken }) => isSameAddress(rewardToken, tokenAddress))
  if (currentRewardRate != undefined) {
    const txns = []
    const { i, rewardToken, tokenPerSec } = currentRewardRate
    const newTokenRate = epochAmount != undefined ? convertTokenPerEpochToTokenPerSec(epochAmount) : tokenPerSec
    if (BigNumber.from(newTokenRate).gt(0)) {
      const erc20 = await ethers.getContractAt('ERC20', rewardToken)
      txns.push(Safe(erc20).transfer(rewarder.address, newTokenRate.mul(epoch_duration_seconds)))
    }
    if (!newTokenRate.eq(tokenPerSec)) {
      txns.push(Safe(rewarder).setRewardRate(i, newTokenRate))
    }
    return txns
  } else {
    const txns = []
    assert(epochAmount != undefined && Zero.lt(epochAmount), 'Cannot add new token without epoch amount')
    const erc20 = await ethers.getContractAt('ERC20', tokenAddress)
    const newTokenRate = convertTokenPerEpochToTokenPerSec(epochAmount)
    txns.push(Safe(erc20).transfer(rewarder.address, epochAmount))
    txns.push(Safe(rewarder).addRewardToken(tokenAddress, newTokenRate))
    return txns
  }
}

// addRewardToken to a bribe or rewarder
export async function addRewardToken(
  rewarderOrBribeDeployment: string,
  token: Token,
  epochAmount: BigNumberish
): Promise<BatchTransaction[]> {
  const rewarder = await getDeployedContract('MultiRewarderPerSec', rewarderOrBribeDeployment)
  const tokenAddress = await getTokenAddress(token)
  const newTokenRate = convertTokenPerEpochToTokenPerSec(epochAmount)
  return [Safe(rewarder).addRewardToken(tokenAddress, newTokenRate)]
}

export async function setOperator(deploymentName: string, to: ExternalContract): Promise<BatchTransaction[]> {
  // Note: use abi for set operator since many contracts have this method.
  const abi = [
    {
      inputs: [{ internalType: 'address', name: '_operator', type: 'address' }],
      name: 'setOperator',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ]
  const deployment = await deployments.get(deploymentName)
  const contract = await ethers.getContractAt(abi, deployment.address)
  return [Safe(contract).setOperator(await getContractAddress(to))]
}

export async function transferAssetsOwnership(
  assetDeploymentNames: string[],
  newOwner: DeploymentOrAddress
): Promise<BatchTransaction[]> {
  return concatAll(...assetDeploymentNames.map((name) => transferOwnership(name, newOwner)))
}

export async function transferProxyAdminOwnership(newOwner: DeploymentOrAddress): Promise<BatchTransaction[]> {
  return transferOwnership('DefaultProxyAdmin', newOwner)
}

async function transferOwnership(deploymentName: string, newOwner: DeploymentOrAddress): Promise<BatchTransaction[]> {
  const deployment = await deployments.get(deploymentName)
  const ownable = await ethers.getContractAt('Ownable', deployment.address)
  const newOwnerAddress = await getAddress(newOwner)
  if (isSameAddress(await ownable.owner(), newOwnerAddress)) {
    return []
  } else {
    return [Safe(ownable).transferOwnership(newOwnerAddress)]
  }
}

export async function upgradeProxy(proxy: string, impl: string): Promise<BatchTransaction> {
  assert(proxy.includes('_Proxy'), 'Must use proxy')
  assert(impl.includes('_Implementation'), 'Must use implementation')

  const proxyDeployment = await deployments.get(proxy)
  const implDeployment = await deployments.get(impl)
  const proxyAdmin = await getDeployedContract('ProxyAdmin', 'DefaultProxyAdmin')
  return Safe(proxyAdmin).upgrade(proxyDeployment.address, implDeployment.address)
}

export async function setMaxSupply(assetDeployment: string, maxSupply: BigNumberish): Promise<BatchTransaction> {
  const asset = await getDeployedContract('Asset', assetDeployment)
  return Safe(asset).setMaxSupply(maxSupply)
}

export async function scheduleTimelock(txns: BatchTransaction[]): Promise<BatchTransaction> {
  const timelockController = await getDeployedContract('TimelockController')
  const delay = await timelockController.getMinDelay()
  const data = encodeBatchTransactionsForTimelock(txns)
  const salt = await deployerSalt()
  const noPredecessor = ethers.constants.HashZero
  return Safe(timelockController).scheduleBatch(data.tos, data.values, data.payloads, noPredecessor, salt, delay)
}

export async function executeTimelock(txns: BatchTransaction[]): Promise<BatchTransaction> {
  const timelockController = await getDeployedContract('TimelockController')
  const data = encodeBatchTransactionsForTimelock(txns)
  const salt = await deployerSalt()
  const noPredecessor = ethers.constants.HashZero
  return Safe(timelockController).executeBatch(data.tos, data.values, data.payloads, noPredecessor, salt)
}

function encodeBatchTransactionsForTimelock(txns: BatchTransaction[]) {
  return {
    tos: txns.map((txn) => txn.to),
    payloads: txns.map((txn) => encodeData(txn)),
    values: txns.map((txn) => txn.value),
  }
}

async function deployerSalt() {
  // address is only 20 bytes. we need a bytes32.
  const { deployer } = await getNamedAccounts()
  return ethers.utils.hexZeroPad(deployer, 32)
}

// Simulate multisig proposals in a forked network.
// Will auto-advance if the transaction is a timelock execution.
export async function simulate(txns: BatchTransaction[]) {
  assert(isForkedNetwork(), 'Must simulate on a forked network.')
  const timelock = await deployments.getOrNull('TimelockController')
  for await (const txn of txns) {
    if (txn.to == timelock?.address && txn.contractMethod?.name.includes('execute')) {
      console.info('Advancing time to simulate executing a timelock transaction')
      const timelockController = await getDeployedContract('TimelockController')
      await time.increase(await timelockController.getMinDelay())
    }
    await impersonateAsMultisig((signer) => executeBatchTransaction(signer, txn))
  }
}

export async function pauseRewardRateFor(
  type: 'Bribe' | 'Rewarder',
  assetDeployments: string[]
): Promise<BatchTransaction[]> {
  return concatAll(
    ...assetDeployments.flatMap(async (name) => {
      const deploymentName = type === 'Bribe' ? getBribeDeploymentName(name) : getRewarderDeploymentName(name)
      const rewarder = await getDeployedContract('MultiRewarderPerSec', deploymentName)
      const length = await rewarder.rewardLength()
      return concatAll(
        ..._.range(0, length).map(async (i) => {
          const { tokenPerSec } = await rewarder.rewardInfo(i)
          if (tokenPerSec > 0) {
            return [Safe(rewarder).setRewardRate(i, 0)]
          } else {
            return []
          }
        })
      )
    })
  )
}

export async function pauseVoteEmissionFor(assetDeployments: string[]): Promise<BatchTransaction[]> {
  const voter = await getDeployedContract('Voter')
  const safe = Safe(voter)
  return concatAll(
    ...assetDeployments.map(async (name) => {
      const lpToken = await getDeployedContract('Asset', name)
      const { whitelist } = await voter.infos(lpToken.address)
      if (whitelist) {
        return [safe.pauseVoteEmission(lpToken.address)]
      } else {
        return []
      }
    })
  )
}

export async function unpauseVoteEmissionFor(assetDeployments: string[]): Promise<BatchTransaction[]> {
  const voter = await getDeployedContract('Voter')
  const safe = Safe(voter)
  return concatAll(
    ...assetDeployments.map(async (name) => {
      const lpToken = await getDeployedContract('Asset', name)
      const { whitelist } = await voter.infos(lpToken.address)
      if (whitelist) {
        return []
      } else {
        return [safe.resumeVoteEmission(lpToken.address)]
      }
    })
  )
}

export async function updateEmissions(
  config: TokenMap<IRewarder>,
  getDeploymentName: (key: string) => string
): Promise<BatchTransaction[]> {
  return loopRewarder(config, getDeploymentName, async (name, rewarder, info, rewardInfos) => {
    return concatAll(
      ..._.range(0, rewardInfos.length).map(async (i) => {
        const rewardToken = info.rewardTokens[i]
        const expected = info.tokenPerSec[i]
        const actual = rewardInfos[i].tokenPerSec
        if (BigNumber.from(expected).eq(actual)) {
          console.log(`${name}: ${Token[rewardToken]} does not need to be updated.`)
          return []
        }
        console.log(`${name}: Expected ${Token[rewardToken]} to be ${expected} but got ${actual}.`)
        return [Safe(rewarder).setRewardRate(i, expected)]
      })
    )
  })
}

// Pause a rewarder if it has less than N hours worth of emissions.
// Otherwise, resumt it if it has been paused.
export async function pauseOrResumeRewardRate(
  config: TokenMap<IRewarder>,
  getDeploymentName: (key: string) => string,
  timeLeftThresholdSec = duration.hours(8)
): Promise<BatchTransaction[]> {
  return loopRewarder(config, getDeploymentName, async (name, rewarder, info, rewardInfos) => {
    return concatAll(
      ..._.range(0, rewardInfos.length).map(async (i) => {
        const expected = BigNumber.from(info.tokenPerSec[i])
        const actual = rewardInfos[i].tokenPerSec
        // Identify the state transition based on (expected, actual)
        if (expected.eq(0) && actual.eq(0)) {
          // inactive (0, 0)
          return []
        } else if (expected.eq(0) && actual.gt(0)) {
          // out of sync (0, >0)
          console.error(
            `${name}: ${Token[info.rewardTokens[i]]} emission rate is not in sync. Expected ${actual.toString()}.`
          )
          return []
        } else {
          // paused (>0, 0) or active (>0, >0)
          assert(expected.gt(0))
          const hasEmission = actual.gt(0)
          const erc20 = await ethers.getContractAt('ERC20', rewardInfos[i].rewardToken)
          const balance = await erc20.balanceOf(rewarder.address)
          const hasEnoughToken = balance.div(expected).gte(timeLeftThresholdSec)
          if (hasEmission) {
            if (!expected.eq(actual))
              console.error(
                `${name}: ${Token[info.rewardTokens[i]]} emission rate is not in sync. Expected ${actual.toString()}.`
              )
            return hasEnoughToken ? [] : [Safe(rewarder).setRewardRate(i, 0)]
          } else {
            return hasEnoughToken ? [Safe(rewarder).setRewardRate(i, expected)] : []
          }
        }
      })
    )
  })
}

async function loopRewarder(
  config: TokenMap<IRewarder>,
  getDeploymentName: (key: string) => string,
  handler: (
    name: string,
    rewarder: Contract,
    config: IRewarder,
    rewardInfos: IRewardInfoStruct[]
  ) => Promise<BatchTransaction[]>
): Promise<BatchTransaction[]> {
  const txns = []
  // Run this in a await for-loop to avoid creating too many RPCs at the same time.
  for await (const [token, info] of Object.entries(config)) {
    const name = getDeploymentName(token)
    const rewarder = await getDeployedContract('MultiRewarderPerSec', name)
    const rewardLength = await rewarder.rewardLength()
    const rewardInfos = await Promise.all(_.range(0, rewardLength).map((i) => rewarder.rewardInfo(i)))
    assert(
      rewardLength == info.rewardTokens.length,
      `rewarder config for ${name} does not match rewardLength on chain at ${rewarder.address}: [${rewardInfos
        .map((i) => i.rewardToken)
        .join(', ')}]`
    )
    for (let i = 0; i < rewardLength; i++) {
      assert(
        isSameAddress(rewardInfos[i].rewardToken, await getTokenAddress(info.rewardTokens[i])),
        `rewardToken mismatch for ${name}, expected: ${Token[info.rewardTokens[i]]}, actual: ${
          rewardInfos[i].rewardToken
        }`
      )
    }
    txns.push(...(await handler(name, rewarder, info, rewardInfos)))
  }

  return txns
}

export async function setAllocPercent(assetDeployment: string, allocationPercent: number): Promise<BatchTransaction[]> {
  assert(allocationPercent >= 0 && allocationPercent <= 100, 'invalid allocation percent')
  const allocPoint = ethers.utils.parseEther(String(allocationPercent * 10))
  const asset = await getDeployedContract('Asset', assetDeployment)
  const voter = await getDeployedContract('Voter')
  const currentAllocPoint = (await voter.weights(asset.address)).allocPoint as BigNumber
  if (!currentAllocPoint.eq(allocPoint)) {
    console.log(
      `${assetDeployment} allocation point: current ${chalk.red(currentAllocPoint)} updating to: ${chalk.green(
        allocPoint
      )}.`
    )
    return [Safe(voter).setAllocPoint(asset.address, allocPoint.toString())]
  } else {
    console.log(`${assetDeployment} allocation point: current ${currentAllocPoint} does not need to be updated.`)
    return []
  }
}

export async function setWomMonthlyEmissionRate(womPerMonth: number): Promise<BatchTransaction[]> {
  assert(womPerMonth >= 0, 'invalid wom emission rate')
  assert(womPerMonth < 10_000_000, "likely an error. WOM emission rate shouldn't be 10M or higher")
  const womPerSec = convertTokenPerMonthToTokenPerSec(ethers.utils.parseEther(String(womPerMonth)))
  const voter = await getDeployedContract('Voter')
  const currentwomPerSec = (await voter.womPerSec()) as BigNumber
  if (!womPerSec.eq(currentwomPerSec)) {
    console.log(
      `Wom per second: current ${chalk.red(utils.formatEther(currentwomPerSec))} updating to: ${chalk.green(
        utils.formatEther(womPerSec)
      )}.`
    )
    return [Safe(voter).setWomPerSec(womPerSec.toString())]
  } else {
    console.log(`Wom per second: ${utils.formatEther(currentwomPerSec)} does not need to be updated.`)
    return []
  }
}

export async function setBribeAllocPercent(bribeAllocationPercent: number): Promise<BatchTransaction[]> {
  assert(bribeAllocationPercent >= 0 && bribeAllocationPercent <= 100, 'invalid bribe allocation percent')
  const baseAllocationPercent = 100 - bribeAllocationPercent
  // convert from percentage to a base 1000 number (for example, 10% -> 100)
  const baseAllocPoint = Math.floor(baseAllocationPercent * 10)
  const voter = await getDeployedContract('Voter')
  const currentBaseAllocPoint = (await voter.baseAllocation()) as number
  if (currentBaseAllocPoint !== baseAllocPoint) {
    console.log(
      `Bribe allocation: current ${chalk.red(currentBaseAllocPoint)} updating to: ${chalk.green(baseAllocPoint)}.`
    )
    return [Safe(voter).setBaseAllocation(baseAllocPoint.toString())]
  } else {
    console.log(`Bribe allocation: ${currentBaseAllocPoint} does not need to be updated.`)
    return []
  }
}
