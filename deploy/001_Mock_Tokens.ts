import assert from 'assert'
import { DeployFunction, DeploymentsExtension } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  DYNAMICPOOL_TOKENS_MAP,
  FACTORYPOOL_TOKENS_MAP,
  USD_SIDEPOOL_TOKENS_MAP,
  USD_TOKENS_MAP,
  WOM_SIDEPOOL_TOKENS_MAP,
} from '../tokens.config'
import { IAssetInfo, Network } from '../types'
import { logVerifyCommand } from '../utils'

const contractName = 'MockTokens'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  deployments.log(`Step 001. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // Mock tokens only on localhost and testnets
  // For fork networks, please deploy the mock token on the testnet directly
  const shouldDeployMockTokens =
    process.env.FORK_NETWORK === 'false' &&
    [Network.AVALANCHE_TESTNET, Network.BSC_TESTNET, Network.LOCALHOST, Network.HARDHAT].includes(
      hre.network.name as Network
    )

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
    const DYNAMICPOOL_TOKENS = DYNAMICPOOL_TOKENS_MAP[hre.network.name as Network] || {}
    for (const [, poolInfo] of Object.entries(DYNAMICPOOL_TOKENS)) {
      for (const [, assetInfo] of Object.entries(poolInfo)) {
        await deployMockTokenForAsset(assetInfo, deployments, deployer, hre.network.name)
      }
    }

    /// Mock WOM DynamicPool Tokens ///
    const WOM_SIDEPOOL_TOKENS = WOM_SIDEPOOL_TOKENS_MAP[hre.network.name as Network] || {}
    for (const [, poolInfo] of Object.entries(WOM_SIDEPOOL_TOKENS)) {
      for (const [, assetInfo] of Object.entries(poolInfo)) {
        await deployMockTokenForAsset(assetInfo, deployments, deployer, hre.network.name)
      }
    }

    /// Mock FactoryPool Tokens ///
    const FACTORYPOOL_TOKENS = FACTORYPOOL_TOKENS_MAP[hre.network.name as Network] || {}
    for (const [, poolInfo] of Object.entries(FACTORYPOOL_TOKENS)) {
      for (const [, assetInfo] of Object.entries(poolInfo)) {
        await deployMockTokenForAsset(assetInfo, deployments, deployer, hre.network.name)
      }
    }
  }
}

async function deployMockTokenForAsset(
  assetInfo: IAssetInfo,
  deployments: DeploymentsExtension,
  deployer: string,
  network: string
) {
  const deployArgs = [assetInfo.tokenName, assetInfo.tokenSymbol, assetInfo.decimalForMockToken, 0]
  console.log(deployArgs)
  assert(typeof assetInfo.decimalForMockToken === 'number', 'decimalForMockToken is invalid')
  const deployment = await deployments.deploy(assetInfo.tokenSymbol, {
    from: deployer,
    log: true,
    contract: 'TestERC20',
    args: deployArgs,
    skipIfAlreadyDeployed: true,
  })

  logVerifyCommand(network, deployment)
}

export default deployFunc
deployFunc.tags = [contractName]
