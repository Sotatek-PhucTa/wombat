import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DYNAMICPOOL_TOKENS_MAP } from '../config/pools.config'
import { confirmTxn, getDeployedContract, isOwner } from '../utils'
import { deployAssetV2, getAssetDeploymentName, getPoolDeploymentName } from '../utils/deploy'
import { getCurrentNetwork } from '../types/network'

const contractName = 'DynamicPoolAssets'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  const network = getCurrentNetwork()
  deployments.log(`Step 031. Deploying on : ${network} with account : ${deployer}`)

  // create asset contracts, e.g. LP-USDC, LP-BUSD, etc. for the ERC20 stablecoins list
  const POOL_TOKENS = DYNAMICPOOL_TOKENS_MAP[getCurrentNetwork()] || {}
  for (const [poolName, poolInfo] of Object.entries(POOL_TOKENS)) {
    const setting = poolInfo.setting
    const poolContractName = getPoolDeploymentName(setting.deploymentNamePrefix, poolName)
    const pool = await getDeployedContract('DynamicPoolV2', poolContractName)

    for (const [, assetInfo] of Object.entries(poolInfo.assets)) {
      await deployAssetV2(assetInfo, pool.address, pool, getAssetDeploymentName(poolName, assetInfo.tokenSymbol))
    }

    // finally transfer pool contract ownership to Gnosis Safe after admin scripts completed
    // The owner of the pool contract is very powerful!
    if (await isOwner(pool, multisig)) {
      deployments.log('Pool is already owned by multisig')
    } else if (await isOwner(pool, deployer)) {
      deployments.log(`Transferring ownership of pool ${pool.address} to ${multisig}...`)
      await confirmTxn(pool.connect(deployerSigner).transferOwnership(multisig))
    } else {
      throw new Error(`Unknown owner: ${await pool.owner()} who is not multisig nor deployer`)
    }

    deployments.log('') // line break
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['DynamicPool']
