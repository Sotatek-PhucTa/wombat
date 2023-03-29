import { deployments, getNamedAccounts } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { MOCK_TOKEN_MAP, USD_SIDEPOOL_TOKENS_MAP, USD_TOKENS_MAP } from '../tokens.config'
import { IMockTokenInfo, Network } from '../types'
import { logVerifyCommand } from '../utils'

const contractName = 'MockTokens'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  deployments.log(`Step 001. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // Mock tokens only on localhost and testnets
  // For fork networks, please deploy the mock token on the testnet directly
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

    const MOCK_TOKENS = MOCK_TOKEN_MAP[hre.network.name as Network] || {}
    for (const [, mockTokenInfo] of Object.entries(MOCK_TOKENS)) {
      await deployMockToken(mockTokenInfo, deployer, hre.network.name)
    }
  }
}

async function deployMockToken(mockTokenInfo: IMockTokenInfo, deployer: string, network: string) {
  const deployArgs = [mockTokenInfo.tokenName, mockTokenInfo.tokenSymbol, mockTokenInfo.decimalForMockToken, 0]
  // console.log('deploy mock token for', mockTokenInfo.tokenName)
  const deployment = await deployments.deploy(mockTokenInfo.tokenSymbol, {
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
