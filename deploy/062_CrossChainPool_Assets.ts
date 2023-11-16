import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { CROSS_CHAIN_POOL_TOKENS_MAP } from '../config/pools.config'
import { confirmTxn, getDeployedContract, isOwner } from '../utils'
import { deployAssetV2, getAssetDeploymentName, getPoolDeploymentName } from '../utils/deploy'
import { contractNamePrefix } from './060_CrossChainPool'
import { getCurrentNetwork } from '../types/network'

const contractName = 'CrossChainPoolAssets'
const tags = ['FirstClass']

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const network = getCurrentNetwork()

  deployments.log(`Step 062. Deploying on : ${network}...`)

  /// Deploy pool
  const CROSS_CHAIN_POOL_TOKENS = CROSS_CHAIN_POOL_TOKENS_MAP[network] || {}
  for (const [poolName, poolInfo] of Object.entries(CROSS_CHAIN_POOL_TOKENS)) {
    const poolContractName = getPoolDeploymentName(contractNamePrefix, poolName)
    const pool = await getDeployedContract('CrossChainPool', poolContractName)

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
  }
}

export default deployFunc
deployFunc.tags = [contractName, ...tags]
deployFunc.dependencies = ['CrossChainPool']
