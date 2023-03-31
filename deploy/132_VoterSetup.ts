import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { BigNumberish, Contract } from 'ethers'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  WOM_SIDEPOOL_TOKENS_MAP,
  DYNAMICPOOL_TOKENS_MAP,
  USD_SIDEPOOL_TOKENS_MAP,
  USD_TOKENS_MAP,
  FACTORYPOOL_TOKENS_MAP,
} from '../tokens.config'
import { getDeployedContract, confirmTxn } from '../utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { parseEther } from 'ethers/lib/utils'
import { IAssetInfo, Network } from '../types'
import { getAssetContractName } from '../utils/deploy'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre
  const { deployer } = await getNamedAccounts()
  const owner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 132. Deploying on: ${hre.network.name}...`)

  const voter = await getDeployedContract('Voter')
  const masterWombat = await getDeployedContract('MasterWombatV3')
  // In mainnet, we wait for 2 blocks for stabilization
  const blocksToConfirm = hre.network.name != 'bsc_mainnet' ? 1 : 2

  deployments.log('Setting up main pool')
  const USD_TOKENS = USD_TOKENS_MAP[hre.network.name as Network] || {}
  for (const index in USD_TOKENS) {
    const tokenSymbol = USD_TOKENS[index][1] as string
    const tokenAllocPoint = parseEther((USD_TOKENS[index][3] as number).toString())
    const assetContractName = `Asset_P01_${tokenSymbol}`
    const assetContractAddress = (await deployments.get(assetContractName)).address as string
    await addAsset(voter, owner, masterWombat.address, assetContractAddress)
    await setAllocPoint(voter, owner, assetContractAddress, tokenAllocPoint, blocksToConfirm)
  }

  deployments.log('Setting up side pool')
  const USD_SIDEPOOL_TOKENS = USD_SIDEPOOL_TOKENS_MAP[hre.network.name as Network] || {}
  for (const index in USD_SIDEPOOL_TOKENS) {
    const tokenSymbol = USD_SIDEPOOL_TOKENS[index][1] as string
    const tokenAllocPoint = parseEther((USD_SIDEPOOL_TOKENS[index][3] as number).toString())
    const assetContractName = `Asset_SP01_${tokenSymbol}`
    const assetContractAddress = (await deployments.get(assetContractName)).address as string
    await addAsset(voter, owner, masterWombat.address, assetContractAddress)
    await setAllocPoint(voter, owner, assetContractAddress, tokenAllocPoint, blocksToConfirm)
  }

  deployments.log('Setting up wom pool')
  const WOM_SIDEPOOL_TOKENS = WOM_SIDEPOOL_TOKENS_MAP[hre.network.name as Network] || {}
  for (const [poolName, poolInfo] of Object.entries(WOM_SIDEPOOL_TOKENS)) {
    for (const [, assetInfo] of Object.entries(poolInfo)) {
      setup(poolName, assetInfo, voter, owner, masterWombat, blocksToConfirm)
    }
  }

  deployments.log('Setting up dynamic pool')
  const DYNAMICPOOL_TOKENS = DYNAMICPOOL_TOKENS_MAP[hre.network.name as Network] || {}
  for (const [poolName, poolInfo] of Object.entries(DYNAMICPOOL_TOKENS)) {
    for (const [, assetInfo] of Object.entries(poolInfo)) {
      setup(poolName, assetInfo, voter, owner, masterWombat, blocksToConfirm)
    }
  }

  deployments.log('Setting up factory pool')
  const FACTORYPOOL_TOKENS = FACTORYPOOL_TOKENS_MAP[hre.network.name as Network] || {}
  for (const [poolName, poolInfo] of Object.entries(FACTORYPOOL_TOKENS)) {
    for (const [, assetInfo] of Object.entries(poolInfo)) {
      setup(poolName, assetInfo, voter, owner, masterWombat, blocksToConfirm)
    }
  }
}

async function setup(
  poolName: string,
  assetInfo: IAssetInfo,
  voter: Contract,
  owner: SignerWithAddress,
  masterWombat: Contract,
  blocksToConfirm: number
) {
  const assetContractName = getAssetContractName(poolName, assetInfo.tokenSymbol)
  const assetContractAddress = (await deployments.get(assetContractName)).address as string
  await addAsset(voter, owner, masterWombat.address, assetContractAddress)
  await setAllocPoint(voter, owner, assetContractAddress, assetInfo.allocPoint ?? 0, blocksToConfirm)
}

async function addAsset(voter: Contract, owner: SignerWithAddress, masterWombat: string, assetAddress: string) {
  deployments.log('addAsset', assetAddress)
  try {
    await confirmTxn(voter.connect(owner).add(masterWombat, assetAddress, ethers.constants.AddressZero))
  } catch (err: any) {
    if (err.message.includes('voter: already added') || err.message.includes('Voter: gaugeManager is already exist')) {
      deployments.log(`Skip adding asset ${assetAddress} since it is already added`)
    } else {
      deployments.log('Failed to add asset', assetAddress, 'due to', err)
      throw err
    }
  }
}

async function setAllocPoint(
  voter: Contract,
  owner: SignerWithAddress,
  assetAddress: string,
  tokenAllocPoint: BigNumberish,
  blocksToConfirm: number
) {
  deployments.log('setAllocPoint', assetAddress, tokenAllocPoint)
  try {
    await confirmTxn(voter.connect(owner).setAllocPoint(assetAddress, tokenAllocPoint), blocksToConfirm)
  } catch (err) {
    // do nothing as asset already exists in pool
    deployments.log('Contract', voter.address, 'fails to set alloc point on asset', assetAddress, 'due to', err)
  }
}

export default deployFunc
deployFunc.dependencies = ['MasterWombatV3', 'Voter']
deployFunc.tags = ['VoterSetup']
