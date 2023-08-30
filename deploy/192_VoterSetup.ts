import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { BigNumberish, Contract } from 'ethers'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { CROSS_CHAIN_POOL_TOKENS_MAP, DYNAMICPOOL_TOKENS_MAP, FACTORYPOOL_TOKENS_MAP } from '../config/pools.config'
import { getDeployedContract, confirmTxn, getLatestMasterWombat } from '../utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { IAssetInfo, Network } from '../types'
import { getAssetDeploymentName } from '../utils/deploy'
import { getCurrentNetwork } from '../types/network'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const network = getCurrentNetwork()
  const { deployments } = hre
  const { deployer } = await getNamedAccounts()
  const owner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 192. Deploying on: ${network}...`)

  const voter = await getDeployedContract('Voter')
  const bribeRewarderFactory = await deployments.getOrNull('BribeRewarderFactory')
  const masterWombat = await getLatestMasterWombat()
  // In mainnet, we wait for 2 blocks for stabilization
  const blocksToConfirm = network != Network.BSC_MAINNET ? 1 : 2

  deployments.log('Setting up dynamic pool')
  const DYNAMICPOOL_TOKENS = DYNAMICPOOL_TOKENS_MAP[network] || {}
  for (const [poolName, poolInfo] of Object.entries(DYNAMICPOOL_TOKENS)) {
    for (const [, assetInfo] of Object.entries(poolInfo.assets)) {
      setup(poolName, assetInfo, voter, owner, masterWombat, blocksToConfirm)
    }
  }

  deployments.log('Setting up factory pool')
  const FACTORYPOOL_TOKENS = FACTORYPOOL_TOKENS_MAP[network] || {}
  for (const [poolName, poolInfo] of Object.entries(FACTORYPOOL_TOKENS)) {
    for (const [, assetInfo] of Object.entries(poolInfo.assets)) {
      setup(poolName, assetInfo, voter, owner, masterWombat, blocksToConfirm)
    }
  }

  deployments.log('Setting up crosschain pool')
  const CROSSCHAINPOOL_TOKENS = CROSS_CHAIN_POOL_TOKENS_MAP[network] || {}
  for (const [poolName, poolInfo] of Object.entries(CROSSCHAINPOOL_TOKENS)) {
    for (const [, assetInfo] of Object.entries(poolInfo.assets)) {
      setup(poolName, assetInfo, voter, owner, masterWombat, blocksToConfirm)
    }
  }

  deployments.log('Set BribeFactory')
  if (bribeRewarderFactory != undefined && bribeRewarderFactory.address !== (await voter.bribeFactory())) {
    deployments.log(`set BribeFactory to ${bribeRewarderFactory.address}`)
    await confirmTxn(voter.connect(owner).setBribeFactory(bribeRewarderFactory.address))
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
  const assetContractName = getAssetDeploymentName(poolName, assetInfo.tokenSymbol)
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
