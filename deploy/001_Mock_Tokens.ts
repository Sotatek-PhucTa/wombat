import { deployments, getNamedAccounts } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { IMockTokenInfo, Network } from '../types'
import { logVerifyCommand } from '../utils'
import { getCurrentNetwork } from '../types/network'
import { getMockTokens } from '../config/mockTokens.config'

const contractName = 'MockTokens'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await getNamedAccounts()
  deployments.log(`Step 001. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // Mock tokens only on localhost and testnets
  // For fork networks, please deploy the mock token on the testnet directly
  const shouldDeployMockTokens = [
    Network.AVALANCHE_TESTNET,
    Network.BSC_TESTNET,
    Network.LOCALHOST,
    Network.HARDHAT,
  ].includes(getCurrentNetwork())

  if (shouldDeployMockTokens) {
    for (const mockTokenInfo of await getMockTokens()) {
      await deployMockToken(mockTokenInfo, deployer, hre.network.name)
    }
  }
}

async function deployMockToken(mockTokenInfo: IMockTokenInfo, deployer: string, network: string) {
  deployments.log('deploy mock token for', mockTokenInfo.tokenName)
  const deployment = await deployments.deploy(mockTokenInfo.tokenSymbol, {
    from: deployer,
    log: true,
    contract: 'TestERC20',
    args: [mockTokenInfo.tokenName, mockTokenInfo.tokenSymbol, mockTokenInfo.decimalForMockToken, 0],
    skipIfAlreadyDeployed: true,
  })
  logVerifyCommand(deployment)
}

export default deployFunc
deployFunc.tags = [contractName]
