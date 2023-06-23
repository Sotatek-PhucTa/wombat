import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { formatEther } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { FACTORYPOOL_TOKENS_MAP } from '../config/pools.config'
import { Network } from '../types'
import { confirmTxn } from '../utils'
import { deployBasePool } from '../utils/deploy'
import { getCurrentNetwork } from '../types/network'

const contractName = 'HighCovRatioFeePool'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const network = getCurrentNetwork()
  deployments.log(`Step 020. Deploying on : ${network}...`)

  const POOL_TOKENS = FACTORYPOOL_TOKENS_MAP[network as Network] || {}
  for (const [poolName, pooInfo] of Object.entries(POOL_TOKENS)) {
    const { contract: pool, deployResult } = await deployBasePool('HighCovRatioFeePoolV2', poolName, pooInfo)

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
