import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import {
  USD_TOKENS_MAP,
  USD_SIDEPOOL_TOKENS_MAP,
  BNB_DYNAMICPOOL_TOKENS_MAP,
  WOM_DYNAMICPOOL_TOKENS_MAP,
  FACTORYPOOL_TOKENS_MAP,
} from '../tokens.config'
import { logVerifyCommand } from '../utils'
import { Network } from '../types'

const contractName = 'MockTokens'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  deployments.log(`Step 001. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // Mock tokens only on localhost and bsc testnet
  const shouldDeployMockTokens = [
    Network.AVALANCHE_TESTNET,
    Network.BSC_TESTNET,
    Network.LOCALHOST,
    Network.HARDHAT,
  ].includes(hre.network.name as Network)

  if (shouldDeployMockTokens) {
    /// Mock USD TOKENS ///
    const USD_TOKENS = USD_TOKENS_MAP[hre.network.name] || {}
    for (const index in USD_TOKENS) {
      const tokenSymbol = USD_TOKENS[index][1] as string
      const deployment = await deploy(tokenSymbol, {
        from: deployer,
        log: true,
        contract: 'TestERC20',
        args: USD_TOKENS[index].slice(0, 4),
        skipIfAlreadyDeployed: true,
      })

      logVerifyCommand(hre.network.name, deployment)
    }

    /// Mock USD SIDEPOOL TOKENS ///
    const USD_SIDEPOOL_TOKENS = USD_SIDEPOOL_TOKENS_MAP[hre.network.name] || {}
    for (const index in USD_SIDEPOOL_TOKENS) {
      const tokenSymbol = USD_SIDEPOOL_TOKENS[index][1] as string
      const deployment = await deploy(tokenSymbol, {
        from: deployer,
        log: true,
        contract: 'TestERC20',
        args: USD_SIDEPOOL_TOKENS[index].slice(0, 4),
        skipIfAlreadyDeployed: true,
      })

      logVerifyCommand(hre.network.name, deployment)
    }

    /// Mock BNB DYNAMICPOOL TOKENS ///
    const BNB_DYNAMICPOOL_TOKENS = BNB_DYNAMICPOOL_TOKENS_MAP[hre.network.name]
    if (BNB_DYNAMICPOOL_TOKENS) {
      const tokenSymbol = BNB_DYNAMICPOOL_TOKENS['WBNB'][1] as string
      const args = BNB_DYNAMICPOOL_TOKENS['WBNB']
      const deployment = await deploy(tokenSymbol, {
        from: deployer,
        log: true,
        contract: 'TestERC20',
        args: args.slice(0, 4),
        skipIfAlreadyDeployed: true,
      })

      logVerifyCommand(hre.network.name, deployment)
    }

    /// Mock WOM DynamicPool Tokens ///
    const WOM_SIDEPOOL_TOKENS = WOM_DYNAMICPOOL_TOKENS_MAP[hre.network.name] || {}
    for (const tokens of Object.values(WOM_SIDEPOOL_TOKENS)) {
      for (const deployArgs of Object.values(tokens)) {
        const tokenSymbol = deployArgs[1] as string
        const deployment = await deploy(tokenSymbol, {
          from: deployer,
          log: true,
          contract: 'TestERC20',
          args: deployArgs.slice(0, 4),
          skipIfAlreadyDeployed: true,
        })

        logVerifyCommand(hre.network.name, deployment)
      }
    }

    /// Mock FactoryPool Tokens ///
    const FACTORYPOOL_TOKENS = FACTORYPOOL_TOKENS_MAP[hre.network.name] || {}
    for (const tokens of Object.values(FACTORYPOOL_TOKENS)) {
      for (const deployArgs of Object.values(tokens)) {
        const tokenSymbol = deployArgs[1] as string
        const deployment = await deploy(tokenSymbol, {
          from: deployer,
          log: true,
          contract: 'TestERC20',
          args: deployArgs.slice(0, 4),
          skipIfAlreadyDeployed: true,
        })

        logVerifyCommand(hre.network.name, deployment)
      }
    }
  }
}
export default deployFunc
deployFunc.tags = [contractName]
