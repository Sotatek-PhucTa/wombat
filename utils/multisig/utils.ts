import { deployments, ethers } from 'hardhat'
import { concatAll, getAddress, getDeployedContract } from '..'
import { getBribeDeploymentName, getRewarderDeploymentName } from '../deploy'
import { BatchTransaction } from './tx-builder'
import { Safe } from './transactions'
import assert from 'assert'
import { Token, getTokenAddress } from '../../config/token'
import { BigNumberish, Contract } from 'ethers'
import { Zero } from '@ethersproject/constants'
import _ from 'lodash'
import { epoch_duration_seconds } from '../../config/epoch'
import { convertTokenPerEpochToTokenPerSec } from '../../config/emission'
import { ExternalContract, getContractAddress } from '../../config/contract'
import { isSameAddress } from '../addresses'
import { DeploymentOrAddress } from '../../types'

// This function will create two transactions:
// 1. MasterWombatV3.add(lp, rewarder)
// 2. Voter.add(masterWombat, lp, bribe)
//
// It relies on naming convetion to find rewarder and bribe for the asset.
// For example, if you asset id is `Asset_USDPlus_Pool_USDC`, it will look for:
// - Bribe_Asset_USDPlus_Pool_USDC
// - MultiRewarderPerSec_V3_Asset_USDPlus_Pool_USDC
export async function addAssetToMasterWombatAndVoter(assetDeployment: string): Promise<BatchTransaction[]> {
  const lpToken = await getDeployedContract('Asset', assetDeployment)
  const rewarder = await deployments.getOrNull(getRewarderDeploymentName(assetDeployment))
  const bribe = await deployments.getOrNull(getBribeDeploymentName(assetDeployment))
  const masterWombat = await getDeployedContract('MasterWombatV3')
  const voter = await getDeployedContract('Voter')
  return [
    Safe(masterWombat).add(lpToken.address, rewarder?.address || ethers.constants.AddressZero),
    Safe(voter).add(masterWombat.address, lpToken.address, bribe?.address || ethers.constants.AddressZero),
  ]
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
        Safe(standalonePool).addAsset(token, asset.address),
        Safe(asset).setPool(standalonePool.address),
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

async function hasActiveRewards(bribe: Contract): Promise<boolean> {
  const length = await bribe.rewardLength()
  const tokenRates = await Promise.all(
    _.range(0, length).map(async (i) => {
      const { tokenPerSec } = await bribe.rewardInfo(i)
      return tokenPerSec
    })
  )
  return tokenRates.every((tokenPerSec) => tokenPerSec == 0)
}

// Top up the bribe token by one epoch. Optionally set a new rate.
export async function topUpBribe(
  bribeDeployment: string,
  token: Token,
  epochAmount?: BigNumberish
): Promise<BatchTransaction[]> {
  const bribe = await getDeployedContract('Bribe', bribeDeployment)
  const length = await bribe.rewardLength()
  const tokenAddress = await getTokenAddress(token)
  const allRewardRates = await Promise.all(_.range(0, length).map(async (i) => ({ i, ...(await bribe.rewardInfo(i)) })))
  const currentRewardRate = allRewardRates.find(({ rewardToken }) => isSameAddress(rewardToken, tokenAddress))
  if (currentRewardRate != undefined) {
    const txns = []
    const { i, rewardToken, tokenPerSec } = currentRewardRate
    const newTokenRate = epochAmount != undefined ? convertTokenPerEpochToTokenPerSec(epochAmount) : tokenPerSec
    if (newTokenRate > 0) {
      const erc20 = await ethers.getContractAt('ERC20', rewardToken)
      txns.push(Safe(erc20).transfer(bribe.address, newTokenRate.mul(epoch_duration_seconds)))
    }
    if (newTokenRate != tokenPerSec) {
      txns.push(Safe(bribe).setRewardRate(i, newTokenRate))
    }
    return txns
  } else {
    const txns = []
    assert(epochAmount != undefined && Zero.lt(epochAmount), 'Cannot add new token without epoch amount')
    const erc20 = await ethers.getContractAt('ERC20', tokenAddress)
    const newTokenRate = convertTokenPerEpochToTokenPerSec(epochAmount)
    txns.push(Safe(erc20).transfer(bribe.address, epochAmount))
    txns.push(Safe(bribe).addRewardToken(tokenAddress, newTokenRate))
    return txns
  }
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
