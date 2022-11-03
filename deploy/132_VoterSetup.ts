import { ethers } from 'hardhat'
import { Contract } from 'ethers'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  WOM_DYNAMICPOOL_TOKENS_MAP,
  BNB_DYNAMICPOOL_TOKENS_MAP,
  USD_SIDEPOOL_TOKENS_MAP,
  USD_TOKENS_MAP,
} from '../tokens.config'
import { getDeployedContract, confirmTxn } from '../utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre
  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 132. Deploying on: ${hre.network.name}...`)

  const voter = await getDeployedContract('Voter')
  const masterWombat = await getDeployedContract('MasterWombatV3')

  console.log('Setting up main pool')
  const USD_TOKENS = USD_TOKENS_MAP[hre.network.name]
  for (const index in USD_TOKENS) {
    const tokenSymbol = USD_TOKENS[index][1] as string
    const tokenAllocPoint = USD_TOKENS[index][3] as number
    const assetContractName = `Asset_P01_${tokenSymbol}`
    const assetContractAddress = (await deployments.get(assetContractName)).address as string
    await addAsset(voter, owner, masterWombat.address, assetContractAddress)
    await setAllocPoint(voter, owner, assetContractAddress, tokenAllocPoint)
  }

  console.log('Setting up side pool')
  const USD_SIDEPOOL_TOKENS = USD_SIDEPOOL_TOKENS_MAP[hre.network.name]
  for (const index in USD_SIDEPOOL_TOKENS) {
    const tokenSymbol = USD_SIDEPOOL_TOKENS[index][1] as string
    const tokenAllocPoint = USD_SIDEPOOL_TOKENS[index][3] as number
    const assetContractName = `Asset_SP01_${tokenSymbol}`
    const assetContractAddress = (await deployments.get(assetContractName)).address as string
    await addAsset(voter, owner, masterWombat.address, assetContractAddress)
    await setAllocPoint(voter, owner, assetContractAddress, tokenAllocPoint)
  }

  console.log('Setting up BNB pool')
  const BNB_DYNAMICPOOL_TOKENS = BNB_DYNAMICPOOL_TOKENS_MAP[hre.network.name]
  for (const index in BNB_DYNAMICPOOL_TOKENS) {
    const tokenSymbol = BNB_DYNAMICPOOL_TOKENS[index][1] as string
    const tokenAllocPoint = BNB_DYNAMICPOOL_TOKENS[index][5] as number
    const assetContractName = `Asset_DP01_${tokenSymbol}`
    const assetContractAddress = (await deployments.get(assetContractName)).address as string
    await addAsset(voter, owner, masterWombat.address, assetContractAddress)
    await setAllocPoint(voter, owner, assetContractAddress, tokenAllocPoint)
  }

  console.log('Setting up wom pool')
  const WOM_DYNAMICPOOL_TOKENS = WOM_DYNAMICPOOL_TOKENS_MAP[hre.network.name]
  for (const pool in WOM_DYNAMICPOOL_TOKENS) {
    const WOM_POOL_TOKENS = WOM_DYNAMICPOOL_TOKENS[pool]
    for (const index in WOM_POOL_TOKENS) {
      const tokenSymbol = WOM_POOL_TOKENS[index][1] as string
      const tokenAllocPoint = WOM_POOL_TOKENS[index][3] as number
      const assetContractName = `Asset_${pool}_${tokenSymbol}`
      const assetContractAddress = (await deployments.get(assetContractName)).address as string
      await addAsset(voter, owner, masterWombat.address, assetContractAddress)
      await setAllocPoint(voter, owner, assetContractAddress, tokenAllocPoint)
    }
  }
}

async function addAsset(voter: Contract, owner: SignerWithAddress, masterWombat: string, assetAddress: string) {
  console.log('addAsset', assetAddress)
  await confirmTxn(voter.connect(owner).add(masterWombat, assetAddress, ethers.constants.AddressZero))
}

async function setAllocPoint(voter: Contract, owner: SignerWithAddress, assetAddress: string, tokenAllocPoint: number) {
  console.log('setAllocPoint', assetAddress, tokenAllocPoint)
  try {
    await confirmTxn(voter.connect(owner).setAllocPoint(assetAddress, tokenAllocPoint), 2)
  } catch (err) {
    // do nothing as asset already exists in pool
    console.log('Contract', voter.address, 'fails to set alloc point on asset', assetAddress, 'due to', err)
  }
}

export default deployFunc
deployFunc.dependencies = ['MasterWombatV3', 'Voter']
deployFunc.tags = ['VoterSetup']
