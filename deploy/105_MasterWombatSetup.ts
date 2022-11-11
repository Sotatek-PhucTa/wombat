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

  console.log(`Step 105. Deploying on: ${hre.network.name}...`)

  const masterWombat = await getDeployedContract('MasterWombatV3')
  const vewom = await getDeployedContract('VeWom')
  const voter = await getDeployedContract('Voter')

  console.log(`set vewom to ${vewom.address}`)
  await confirmTxn(masterWombat.connect(owner).setVeWom(vewom.address))

  console.log(`set voter to ${voter.address}`)
  await confirmTxn(masterWombat.connect(owner).setVoter(voter.address))

  console.log('Setting up main pool')
  const USD_TOKENS = USD_TOKENS_MAP[hre.network.name]
  for (const index in USD_TOKENS) {
    const tokenSymbol = USD_TOKENS[index][1] as string
    const assetContractName = `Asset_P01_${tokenSymbol}`
    const assetContractAddress = (await deployments.get(assetContractName)).address as string
    await addAsset(masterWombat, owner, assetContractAddress)
  }

  console.log('Setting up side pool')
  const USD_SIDEPOOL_TOKENS = USD_SIDEPOOL_TOKENS_MAP[hre.network.name]
  for (const index in USD_SIDEPOOL_TOKENS) {
    const tokenSymbol = USD_SIDEPOOL_TOKENS[index][1] as string
    const assetContractName = `Asset_SP01_${tokenSymbol}`
    const assetContractAddress = (await deployments.get(assetContractName)).address as string
    await addAsset(masterWombat, owner, assetContractAddress)
  }

  console.log('Setting up BNB pool')
  const BNB_DYNAMICPOOL_TOKENS = BNB_DYNAMICPOOL_TOKENS_MAP[hre.network.name]
  for (const index in BNB_DYNAMICPOOL_TOKENS) {
    const tokenSymbol = BNB_DYNAMICPOOL_TOKENS[index][1] as string
    const assetContractName = `Asset_DP01_${tokenSymbol}`
    const assetContractAddress = (await deployments.get(assetContractName)).address as string
    await addAsset(masterWombat, owner, assetContractAddress)
  }

  console.log('Setting up wom pool')
  const WOM_DYNAMICPOOL_TOKENS = WOM_DYNAMICPOOL_TOKENS_MAP[hre.network.name]
  for (const pool in WOM_DYNAMICPOOL_TOKENS) {
    const WOM_POOL_TOKENS = WOM_DYNAMICPOOL_TOKENS[pool]
    for (const index in WOM_POOL_TOKENS) {
      const tokenSymbol = WOM_POOL_TOKENS[index][1] as string
      const assetContractName = `Asset_${pool}_${tokenSymbol}`
      const assetContractAddress = (await deployments.get(assetContractName)).address as string
      await addAsset(masterWombat, owner, assetContractAddress)
    }
  }
}

async function addAsset(masterWombat: Contract, owner: SignerWithAddress, assetAddress: string) {
  console.log('addAsset', assetAddress)
  try {
    await confirmTxn(masterWombat.connect(owner).add(assetAddress, ethers.constants.AddressZero))
  } catch (err: any) {
    if (err.error.stack.includes('add: LP already added')) {
      console.log(`Skip adding asset ${assetAddress} since it is already added`)
    } else {
      console.log('Failed to add asset', assetAddress, 'due to', err)
      throw err
    }
  }
}

export default deployFunc
deployFunc.dependencies = ['MasterWombatV3', 'Voter', 'VeWom']
deployFunc.tags = ['MasterWombatV3Setup']
