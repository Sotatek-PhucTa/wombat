import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { formatEther } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DYNAMICPOOL_TOKENS_MAP } from '../config/pools.config'
import { Network } from '../types'
import { confirmTxn } from '../utils'
import { deployBasePool } from '../utils/deploy'

export const contractName = 'DynamicPool'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 030. Deploying on : ${hre.network.name}...`)

  const POOL_TOKENS = DYNAMICPOOL_TOKENS_MAP[hre.network.name as Network] || {}
  for (const [poolName, pooInfo] of Object.entries(POOL_TOKENS)) {
    const { contract: pool, deployResult } = await deployBasePool('DynamicPoolV2', poolName, pooInfo)

    const setting = pooInfo.setting
    if (deployResult.newlyDeployed) {
      deployments.log(`Setting cov ratio: ${formatEther(setting.startCovRatio)} to ${formatEther(setting.endCovRatio)}`)
      await confirmTxn(pool.connect(deployerSigner).setCovRatioFeeParam(setting.startCovRatio, setting.endCovRatio))
    } else {
      deployments.log(`${contractName} Contract already deployed.`)
    }
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['MasterWombatV3']
