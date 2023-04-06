import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DYNAMICPOOL_TOKENS_MAP, FACTORYPOOL_TOKENS_MAP, USD_TOKENS_MAP } from '../config/tokens.config'
import { Network } from '../types'
import { confirmTxn, getDeployedContract } from '../utils'
import { getAssetContractName } from '../utils/deploy'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await getNamedAccounts()
  const owner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 105. Deploying on: ${hre.network.name}...`)

  const masterWombat = await getDeployedContract('MasterWombatV3')
  const vewom = await getDeployedContract('VeWom')
  const voter = await getDeployedContract('Voter')

  deployments.log(`set vewom to ${vewom.address}`)
  await confirmTxn(masterWombat.connect(owner).setVeWom(vewom.address))

  deployments.log(`set voter to ${voter.address}`)
  await confirmTxn(masterWombat.connect(owner).setVoter(voter.address))

  deployments.log('Setting up main pool')
  const USD_TOKENS = USD_TOKENS_MAP[hre.network.name as Network] || {}
  for (const index in USD_TOKENS) {
    const tokenSymbol = USD_TOKENS[index][1] as string
    const assetContractName = `Asset_P01_${tokenSymbol}`
    const assetContractAddress = (await deployments.get(assetContractName)).address as string
    await addAsset(masterWombat, owner, assetContractAddress)
  }

  deployments.log('Setting up dynamic pool')
  const DYNAMICPOOL_TOKENS = DYNAMICPOOL_TOKENS_MAP[hre.network.name as Network] || {}
  for (const [poolName, poolInfo] of Object.entries(DYNAMICPOOL_TOKENS)) {
    for (const [, assetInfo] of Object.entries(poolInfo.assets)) {
      const assetContractName = getAssetContractName(poolName, assetInfo.tokenSymbol)
      const assetContractAddress = (await deployments.get(assetContractName)).address as string
      await addAsset(masterWombat, owner, assetContractAddress)
    }
  }

  deployments.log('Setting up factory pool')
  const FACTORYPOOL_TOKENS = FACTORYPOOL_TOKENS_MAP[hre.network.name as Network] || {}
  for (const [poolName, poolInfo] of Object.entries(FACTORYPOOL_TOKENS)) {
    for (const [, assetInfo] of Object.entries(poolInfo.assets)) {
      const assetContractName = getAssetContractName(poolName, assetInfo.tokenSymbol)
      const assetContractAddress = (await deployments.get(assetContractName)).address as string
      await addAsset(masterWombat, owner, assetContractAddress)
    }
  }
}

async function addAsset(masterWombat: Contract, owner: SignerWithAddress, assetAddress: string) {
  deployments.log('addAsset', assetAddress)
  try {
    await confirmTxn(masterWombat.connect(owner).add(assetAddress, ethers.constants.AddressZero))
  } catch (err: any) {
    if (err.message.includes('add: LP already added')) {
      deployments.log(`Skip adding asset ${assetAddress} since it is already added`)
    } else {
      deployments.log('Failed to add asset', assetAddress, 'due to', err)
      throw err
    }
  }
}

export default deployFunc
deployFunc.dependencies = ['MasterWombatV3', 'Voter', 'VeWom']
deployFunc.tags = ['MasterWombatV3Setup']
