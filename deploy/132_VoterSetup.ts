import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { BNB_DYNAMICPOOL_TOKENS_MAP, USD_TOKENS_MAP } from '../tokens.config'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 132. Deploying on: ${hre.network.name}...`)

  const voterDeployment = await deployments.get('Voter')
  const voter = await ethers.getContractAt('Voter', voterDeployment.address)

  console.log('Setting up main pool')
  const USD_TOKENS = USD_TOKENS_MAP[hre.network.name]
  for (const index in USD_TOKENS) {
    const tokenSymbol = USD_TOKENS[index][1] as string
    const tokenAllocPoint = USD_TOKENS[index][3] as number
    const assetContractName = `Asset_P01_${tokenSymbol}`
    const assetContractAddress = (await deployments.get(assetContractName)).address as string
    await setAllocPoint(voter, owner, assetContractAddress, tokenAllocPoint)
  }

  console.log('Setting up BNB pool')
  const BNB_DYNAMICPOOL_TOKENS = BNB_DYNAMICPOOL_TOKENS_MAP[hre.network.name]
  for (const index in BNB_DYNAMICPOOL_TOKENS) {
    const tokenSymbol = BNB_DYNAMICPOOL_TOKENS[index][1] as string
    const tokenAllocPoint = BNB_DYNAMICPOOL_TOKENS[index][5] as number
    const assetContractName = `Asset_DP01_${tokenSymbol}`
    const assetContractAddress = (await deployments.get(assetContractName)).address as string
    await setAllocPoint(voter, owner, assetContractAddress, tokenAllocPoint)
  }
}

async function setAllocPoint(voter: any, owner: any, assetAddress: string, tokenAllocPoint: number) {
  console.log('setAllocPoint', assetAddress, tokenAllocPoint)
  try {
    const txn = await voter.connect(owner).setAllocPoint(assetAddress, tokenAllocPoint)
    // wait until the transaction is mined
    await txn.wait(2)
  } catch (err) {
    // do nothing as asset already exists in pool
    console.log('Contract', voter.address, 'fails to set alloc point on asset', assetAddress, 'due to', err)
  }
}

export default deployFunc
deployFunc.dependencies = ['MasterWombatV3', 'Voter']
deployFunc.tags = ['VoterSetup']
