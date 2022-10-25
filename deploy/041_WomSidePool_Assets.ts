import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { WOM_DYNAMICPOOL_TOKENS_MAP } from '../tokens.config'
import { deployAsset } from './031_DynamicPool_Assets'
import { getPoolContractName } from './040_WomSidePool'

const contractName = 'WomMockAsset'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer, multisig } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 031. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // create asset contracts, e.g. LP-USDC, LP-BUSD, etc. for the ERC20 stablecoins list
  const WOM_SIDEPOOL_TOKENS = WOM_DYNAMICPOOL_TOKENS_MAP[hre.network.name]

  for (const poolName of Object.keys(WOM_SIDEPOOL_TOKENS)) {
    // Get Pool Instance
    const poolContractName = getPoolContractName(poolName)
    const poolDeployment = await deployments.get(poolContractName)
    const poolAddress = poolDeployment.address

    const pool = await ethers.getContractAt('DynamicPool', poolAddress)

    for (const args of Object.values(WOM_SIDEPOOL_TOKENS[poolName])) {
      const tokenName = args[0] as string
      const tokenSymbol = args[1] as string
      const tokenAddress =
        hre.network.name == 'bsc_mainnet'
          ? (args[2] as string)
          : ((await deployments.get(tokenSymbol)).address as string)
      console.log(`Successfully got erc20 token ${tokenSymbol} instance at: ${tokenAddress}`)

      await deployAsset(
        hre.network.name,
        deployer,
        multisig,
        owner,
        deployments,
        [tokenName, tokenSymbol, tokenAddress],
        poolAddress,
        pool,
        `Asset_${poolName}_${tokenSymbol}`
      )
    }

    // finally transfer pool contract ownership to Gnosis Safe after admin scripts completed
    console.log(`Transferring ownership of ${poolAddress} to ${multisig}...`)
    // The owner of the pool contract is very powerful!
    const transferOwnershipTxn = await pool.connect(owner).transferOwnership(multisig)
    await transferOwnershipTxn.wait()
    console.log(`Transferred ownership of ${poolAddress} to:`, multisig)
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['WomSidePools', 'MockTokens'] // this ensure the Token script above is executed first, so `deployments.get('DynamicPool')` succeeds
