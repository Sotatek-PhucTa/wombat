import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DYNAMICPOOL_TOKENS_MAP, FACTORYPOOL_TOKENS_MAP } from '../config/tokens.config'
import { Network } from '../types'
import { confirmTxn, getDeployedContract } from '../utils'
import { getAssetDeploymentName } from '../utils/deploy'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await getNamedAccounts()
  const owner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 105. Deploying on: ${hre.network.name}...`)

  const masterWombat = await getDeployedContract('MasterWombatV3')
  const vewom = await deployments.getOrNull('VeWom')
  const voter = await deployments.getOrNull('Voter')
  if (vewom != undefined && vewom != (await masterWombat.veWom())) {
    deployments.log(`set vewom to ${vewom.address}`)
    await confirmTxn(masterWombat.connect(owner).setVeWom(vewom.address))
  }
  if (voter != undefined && voter != (await masterWombat.voter())) {
    deployments.log(`set voter to ${voter.address}`)
    await confirmTxn(masterWombat.connect(owner).setVoter(voter.address))
  }

  deployments.log('Setting up dynamic pool')
  const DYNAMICPOOL_TOKENS = DYNAMICPOOL_TOKENS_MAP[hre.network.name as Network] || {}
  for (const [poolName, poolInfo] of Object.entries(DYNAMICPOOL_TOKENS)) {
    for (const [, assetInfo] of Object.entries(poolInfo.assets)) {
      const assetContractName = getAssetDeploymentName(poolName, assetInfo.tokenSymbol)
      const assetContractAddress = (await deployments.get(assetContractName)).address as string
      await addAsset(masterWombat, owner, assetContractAddress)
    }
  }

  deployments.log('Setting up factory pool')
  const FACTORYPOOL_TOKENS = FACTORYPOOL_TOKENS_MAP[hre.network.name as Network] || {}
  for (const [poolName, poolInfo] of Object.entries(FACTORYPOOL_TOKENS)) {
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
deployFunc.tags = ['MasterWombatV3Setup']
