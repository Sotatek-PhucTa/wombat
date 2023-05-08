import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { VOLATILEPOOL_TOKENS_MAP } from '../config/tokens.config'
import { Network } from '../types'
import { confirmTxn, getDeployedContract, getUnderlyingTokenAddr, isOwner } from '../utils'
import { deployAssetV2, getAssetDeploymentName, getPoolDeploymentName } from '../utils/deploy'

const contractName = 'VolatilePoolAssets'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 041. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // create asset contracts, e.g. LP-USDC, LP-BUSD, etc. for the ERC20 stablecoins list
  const POOL_TOKENS = VOLATILEPOOL_TOKENS_MAP[hre.network.name as Network] || {}
  for (const [poolName, poolInfo] of Object.entries(POOL_TOKENS)) {
    const setting = poolInfo.setting
    const poolContractName = getPoolDeploymentName(setting.deploymentNamePrefix, poolName)
    const pool = await getDeployedContract('VolatilePool', poolContractName)

    for (const [, assetInfo] of Object.entries(poolInfo.assets)) {
      const tokenAddress = await getUnderlyingTokenAddr(assetInfo)

      await deployAssetV2(
        hre.network.name,
        deployer,
        multisig,
        Object.assign(assetInfo, { underlyingTokenAddr: tokenAddress }),
        pool.address,
        pool,
        getAssetDeploymentName(poolName, assetInfo.tokenSymbol)
      )

      deployments.log('') // separate asset deployments
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
deployFunc.tags = [contractName]
deployFunc.dependencies = ['VolatilePool', 'ChainlinkPriceFeed', 'PythPriceFeed']
