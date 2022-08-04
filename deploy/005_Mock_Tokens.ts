import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { USD_TOKENS_MAP, USD_SIDEPOOL_TOKENS_MAP, BNB_DYNAMICPOOL_TOKENS_MAP } from '../tokens.config'

const contractName = 'MockTokens'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  console.log(`Step 005. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // Mock tokens only on localhost and bsc testnet
  if (hre.network.name == 'localhost' || hre.network.name == 'hardhat' || hre.network.name == 'bsc_testnet') {
    /// Mock USD TOKENS ///
    const USD_TOKENS = USD_TOKENS_MAP[hre.network.name]
    for (const index in USD_TOKENS) {
      const tokenSymbol = USD_TOKENS[index][1] as string
      await deploy(tokenSymbol, {
        from: deployer,
        log: true,
        contract: 'TestERC20',
        args: USD_TOKENS[index],
        skipIfAlreadyDeployed: true,
      })
    }

    /// Mock USD SIDEPOOL TOKENS ///
    const USD_SIDEPOOL_TOKENS = USD_SIDEPOOL_TOKENS_MAP[hre.network.name]
    for (const index in USD_SIDEPOOL_TOKENS) {
      const tokenSymbol = USD_SIDEPOOL_TOKENS[index][1] as string
      await deploy(tokenSymbol, {
        from: deployer,
        log: true,
        contract: 'TestERC20',
        args: USD_SIDEPOOL_TOKENS[index],
        skipIfAlreadyDeployed: true,
      })
    }

    /// Mock BNB DYNAMICPOOL TOKENS ///
    const BNB_DYNAMICPOOL_TOKENS = BNB_DYNAMICPOOL_TOKENS_MAP[hre.network.name]
    const tokenSymbol = BNB_DYNAMICPOOL_TOKENS['WBNB'][1] as string
    await deploy(tokenSymbol, {
      from: deployer,
      log: true,
      contract: 'TestERC20',
      args: BNB_DYNAMICPOOL_TOKENS['WBNB'],
      skipIfAlreadyDeployed: true,
    })
  }
}
export default deployFunc
deployFunc.tags = [contractName]
