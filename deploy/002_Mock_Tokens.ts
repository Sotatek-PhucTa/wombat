import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { USD_TOKENS_MAP } from '../tokens.config'

const contractName = 'MockTokens'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  console.log(`Step 002. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // Mock tokens only on localhost and bsc testnet
  if (hre.network.name == 'localhost' || hre.network.name == 'hardhat' || hre.network.name == 'bsc_testnet') {
    /// Mock USD TOKENS ///
    const USD_TOKENS = USD_TOKENS_MAP[hre.network.name]
    for (const index in USD_TOKENS) {
      // console.log('debug : ' + USD_TOKENS_ARGS[index])
      const tokenSymbol = USD_TOKENS[index][1] as string
      await deploy(tokenSymbol, {
        from: deployer,
        log: true,
        contract: 'TestERC20',
        args: USD_TOKENS[index],
        skipIfAlreadyDeployed: true,
      })
    }
  }
}
export default deployFunc
deployFunc.tags = [contractName]
