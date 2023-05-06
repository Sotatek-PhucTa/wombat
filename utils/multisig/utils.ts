import { deployments } from 'hardhat'
import { getDeployedContract } from '..'
import { getBribeDeploymentName, getRewarderDeploymentName } from '../deploy'
import { BatchTransaction } from './tx-builder'
import { ethers } from 'ethers'
import { Safe } from './transactions'

// This function will create two transactions:
// 1. MasterWombatV3.add(lp, rewarder)
// 2. Voter.add(masterWombat, lp, bribe)
//
// It relies on naming convetion to find rewarder and bribe for the asset.
// For example, if you asset id is `Asset_USDPlus_Pool_USDC`, it will look for:
// - Bribe_Asset_USDPlus_Pool_USDC
// - MultiRewarderPerSec_V3_Asset_USDPlus_Pool_USDC
export async function createTransactionsToAddAssets(assetDeployments: string[]): Promise<BatchTransaction[]> {
  const transactions = await Promise.all(assetDeployments.map(createTransactionsToAddAsset))
  return transactions.flat()
}

async function createTransactionsToAddAsset(assetDeployment: string): Promise<BatchTransaction[]> {
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
