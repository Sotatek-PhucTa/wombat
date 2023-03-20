import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { WOM_SIDEPOOL_TOKENS_MAP } from '../tokens.config'
import { Network } from '../types'
import { confirmTxn, getDeployedContract } from '../utils'
import { deployAssetV2, getPoolContractName } from '../utils/deploy'
import { contractNamePrefix } from './040_WomSidePool'

const contractName = 'WomSidePoolAssets'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer, multisig } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  deployments.log(`Step 041. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // create asset contracts, e.g. LP-USDC, LP-BUSD, etc. for the ERC20 stablecoins list
  const WOM_SIDEPOOL_TOKENS = WOM_SIDEPOOL_TOKENS_MAP[hre.network.name as Network] || {}
  for (const [poolName, poolInfo] of Object.entries(WOM_SIDEPOOL_TOKENS)) {
    // Get Pool Instance
    const poolContractName = getPoolContractName(contractNamePrefix, poolName)
    const pool = await getDeployedContract('DynamicPool', poolContractName)

    for (const [tokenSymbol, assetInfo] of Object.entries(poolInfo)) {
      if (tokenSymbol !== assetInfo.tokenSymbol) {
        // sanity check
        throw `token symbol should be the same: ${tokenSymbol}, ${assetInfo.tokenSymbol}`
      }
      const tokenAddress =
        assetInfo.underlyingTokenAddr ?? ((await deployments.get(assetInfo.tokenSymbol)).address as string)
      deployments.log(`Successfully got erc20 token ${assetInfo.tokenSymbol} instance at: ${tokenAddress}`)

      await deployAssetV2(
        hre.network.name,
        deployer,
        multisig,
        owner,
        deployments,
        Object.assign(assetInfo, { underlyingTokenAddr: tokenAddress }),
        pool.address,
        pool,
        `Asset_${poolName}_${assetInfo.tokenSymbol}`
      )
    }

    // finally transfer pool contract ownership to Gnosis Safe after admin scripts completed
    deployments.log(`Transferring ownership of pool ${pool.address} to ${multisig}...`)
    // The owner of the pool contract is very powerful!
    await confirmTxn(pool.connect(owner).transferOwnership(multisig))
    deployments.log(`Transferred ownership of pool ${pool.address} to ${multisig}...`)
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['MockTokens', contractNamePrefix] // this ensure the Token script above is executed first, so `deployments.get('DynamicPool')` succeeds
