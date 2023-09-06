import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { IPoolConfig, Network, NetworkPoolInfo } from '../types'
import { confirmTxn, getLatestMasterWombat } from '../utils'
import { getCurrentNetwork } from '../types/network'
import { Contract } from 'ethers'
import { getAssetDeploymentName } from '../utils/deploy'
import { CROSS_CHAIN_POOL_TOKENS_MAP, DYNAMICPOOL_TOKENS_MAP, FACTORYPOOL_TOKENS_MAP } from '../config/pools.config'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const network: Network = getCurrentNetwork()
  const { deployer } = await getNamedAccounts()
  const owner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 191. Deploying on: ${network}...`)

  const masterWombat = await getLatestMasterWombat()
  const vewom = await deployments.getOrNull('VeWom')
  const voter = await deployments.getOrNull('Voter')
  const bribeRewarderFactory = await deployments.getOrNull('BribeRewarderFactory')
  if (vewom != undefined && vewom != (await masterWombat.veWom())) {
    deployments.log(`set vewom to ${vewom.address}`)
    await confirmTxn(masterWombat.connect(owner).setVeWom(vewom.address))
  }
  if (voter != undefined && voter != (await masterWombat.voter())) {
    deployments.log(`set voter to ${voter.address}`)
    await confirmTxn(masterWombat.connect(owner).setVoter(voter.address))
  }
  if (
    bribeRewarderFactory != undefined &&
    masterWombat.bribeRewarderFactory &&
    bribeRewarderFactory != (await masterWombat.bribeRewarderFactory())
  ) {
    deployments.log(`set bribeRewarderFactory to ${bribeRewarderFactory.address}`)
    await confirmTxn(masterWombat.connect(owner).setBribeRewarderFactory(bribeRewarderFactory.address))
  }

  deployments.log('Setting up dynamic pool')
  await deployPools(masterWombat, owner, DYNAMICPOOL_TOKENS_MAP[network] || {})

  deployments.log('Setting up factory pool')
  await deployPools(masterWombat, owner, FACTORYPOOL_TOKENS_MAP[network] || {})

  deployments.log('Setting up cross chain pool')
  await deployPools(masterWombat, owner, CROSS_CHAIN_POOL_TOKENS_MAP[network] || {})
}

async function deployPools(masterWombat: Contract, owner: SignerWithAddress, poolConfig: NetworkPoolInfo<IPoolConfig>) {
  for (const [poolName, poolInfo] of Object.entries(poolConfig)) {
    for (const [, assetInfo] of Object.entries(poolInfo.assets)) {
      const assetContractName = getAssetDeploymentName(poolName, assetInfo.tokenSymbol)
      const assetContractAddress = (await deployments.get(assetContractName)).address as string
      await addAsset(masterWombat, owner, assetContractAddress)
    }
  }
}

function hasAsset(masterWombat: Contract, assetAddress: string): Promise<boolean> {
  return masterWombat.getAssetPid(assetAddress).then(
    () => true,
    () => false
  )
}

async function addAsset(masterWombat: Contract, owner: SignerWithAddress, assetAddress: string) {
  deployments.log('addAsset', assetAddress)
  if (await hasAsset(masterWombat, assetAddress)) {
    deployments.log(`Skip adding asset ${assetAddress} since it is already added`)
    return
  }

  try {
    await confirmTxn(masterWombat.connect(owner).add(assetAddress, ethers.constants.AddressZero))
  } catch (err: any) {
    deployments.log('Failed to add asset', assetAddress, 'due to', err)
    throw err
  }
}

export default deployFunc
deployFunc.dependencies = ['MasterWombatV3']
deployFunc.tags = ['BoostedMasterWombatSetup']
