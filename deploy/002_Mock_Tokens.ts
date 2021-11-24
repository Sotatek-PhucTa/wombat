import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

interface IUSDTokens {
  [token: string]: any[]
}

export const USD_TOKENS_ARGS: IUSDTokens = {
  BUSD: ['Binance USD', 'BUSD', '18', 0], // 0 tokens minted to msg.sender initially
  USDC: ['USD Coin', 'USDC', '18', 0],
  USDT: ['Tether USD', 'USDT', '18', 0],
  TUSD: ['TrueUSD', 'TUSD', '18', 0],
  DAI: ['Dai Stablecoin', 'DAI', '18', 0],
  vUSDC: ['Venus USDC', 'vUSDC', '8', 0],
}

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  console.log(`Step 002. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // Mock tokens only on localhost and bsc testnet
  if (hre.network.name == 'localhost' || hre.network.name == 'hardhat' || hre.network.name == 'bsc_testnet') {
    /// Mock USD TOKENS ///
    for (const index in USD_TOKENS_ARGS) {
      // console.log('debug : ' + USD_TOKENS_ARGS[index])
      const tokenSymbol = USD_TOKENS_ARGS[index][1] as string
      await deploy(tokenSymbol, {
        from: deployer,
        log: true,
        contract: 'TestERC20',
        args: USD_TOKENS_ARGS[index],
        skipIfAlreadyDeployed: true,
      })
    }
  }
}
export default deployFunc
deployFunc.tags = ['MockTokens']
