import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

export const USD_TOKENS_ARGS: { [token: string]: unknown[] } = {
  DAIe: ['Dai Stablecoin', 'DAI.e', '18', 0],
  USDCe: ['USD Coin', 'USDC.e', '6', 0],
  USDTe: ['Tether USD', 'USDT.e', '6', 0],
  TUSD: ['TrueUSD', 'TUSD', '18', 0],
  FRAX: ['Frax', 'FRAX', '18', 0],
  zUSDT: ['zUSDT', 'zUSDT', '6', 0],
}

export const ETH_TOKENS_ARGS: { [token: string]: unknown[] } = {
  WETHe: ['Wrapped Etherem ab', 'WETH.e', '18', 0],
  AnyETH: ['Any Ethereum', 'AnyETH', '18', 0],
  zETH: ['z Ethereum', 'zETH', '18', 0],
  DETH: ['D Ethereum', 'DETH', '18', 0],
}

export const BTC_TOKENS_ARGS: { [token: string]: unknown[] } = {
  WBTC: ['Wrapped BTC', 'WBTC', '8', 0],
  renBTC: ['renBTC', 'renBTC', '8', 0],
}

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  // Mock tokens only on localhost and bsc
  if (hre.network.name == 'localhost' || hre.network.name == 'hardhat' || hre.network.name == 'bsc') {
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

    /// Mock ETH TOKENS ///
    for (const index in ETH_TOKENS_ARGS) {
      // console.log('debug : ' + USD_TOKENS_ARGS[index])
      const tokenSymbol = ETH_TOKENS_ARGS[index][1] as string
      await deploy(tokenSymbol, {
        from: deployer,
        log: true,
        contract: 'TestERC20',
        args: ETH_TOKENS_ARGS[index],
        skipIfAlreadyDeployed: true,
      })
    }

    /// Mock BTC TOKENS ///
    for (const index in BTC_TOKENS_ARGS) {
      // console.log('debug : ' + USD_TOKENS_ARGS[index])
      const tokenSymbol = BTC_TOKENS_ARGS[index][1] as string
      await deploy(tokenSymbol, {
        from: deployer,
        log: true,
        contract: 'TestERC20',
        args: BTC_TOKENS_ARGS[index],
        skipIfAlreadyDeployed: true,
      })
    }
  }
}
export default deployFunc
deployFunc.tags = ['MockTokens']
