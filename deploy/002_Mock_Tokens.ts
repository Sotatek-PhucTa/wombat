import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

interface IUSDTokens {
  [network: string]: IUSDTTokensInfo
}
interface IUSDTTokensInfo {
  [token: string]: unknown[]
}

// starting 4 stables, all 18 decimals
export const USD_TOKENS_MAP: IUSDTokens = {
  bsc_mainnet: {
    BUSD: ['Binance USD', 'BUSD', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'],
    USDC: ['USD Coin', 'USDC', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'],
    USDT: ['Tether USD', 'USDT', '0x55d398326f99059ff775485246999027b3197955'],
    DAI: ['Dai Stablecoin', 'DAI', '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3'],
  },
  bsc_testnet: {
    BUSD: ['Binance USD', 'BUSD', '18', 0], // 0 tokens minted to msg.sender initially
    USDC: ['USD Coin', 'USDC', '18', 0],
    USDT: ['Tether USD', 'USDT', '18', 0],
    TUSD: ['TrueUSD', 'TUSD', '18', 0],
    DAI: ['Dai Stablecoin', 'DAI', '18', 0],
    vUSDC: ['Venus USDC', 'vUSDC', '8', 0],
  },
  localhost: {
    BUSD: ['Binance USD', 'BUSD', '18', 0], // 0 tokens minted to msg.sender initially
    USDC: ['USD Coin', 'USDC', '18', 0],
    USDT: ['Tether USD', 'USDT', '18', 0],
    TUSD: ['TrueUSD', 'TUSD', '18', 0],
    DAI: ['Dai Stablecoin', 'DAI', '18', 0],
    vUSDC: ['Venus USDC', 'vUSDC', '8', 0],
  },
  hardhat: {
    BUSD: ['Binance USD', 'BUSD', '18', 0], // 0 tokens minted to msg.sender initially
    USDC: ['USD Coin', 'USDC', '18', 0],
    USDT: ['Tether USD', 'USDT', '18', 0],
    TUSD: ['TrueUSD', 'TUSD', '18', 0],
    DAI: ['Dai Stablecoin', 'DAI', '18', 0],
    vUSDC: ['Venus USDC', 'vUSDC', '8', 0],
  },
}

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
deployFunc.tags = ['MockTokens']
