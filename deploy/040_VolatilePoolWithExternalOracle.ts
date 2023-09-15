import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { formatEther } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { VOLATILEPOOL_TOKENS_MAP } from '../config/pools.config'
import { Network } from '../types'
import { confirmTxn, getDeployedContract } from '../utils'
import { deployBasePool } from '../utils/deploy'

const contractName = 'VolatilePoolWithExternalOracle'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const coreV3Deployment = await getDeployedContract('CoreV3')

  deployments.log(`Step 040. Deploying on : ${hre.network.name}...`)

  const POOL_TOKENS = VOLATILEPOOL_TOKENS_MAP[hre.network.name as Network] || {}
  for (const [poolName, pooInfo] of Object.entries(POOL_TOKENS)) {
    const { contract: pool, deployResult } = await deployBasePool('VolatilePoolWithExternalOracle', poolName, pooInfo, {
      CoreV3: coreV3Deployment.address,
    })

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
deployFunc.dependencies = ['CoreV3']
