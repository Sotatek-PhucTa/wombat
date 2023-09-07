import { IMockTokenInfo, Network, TokenMap } from '../types'
import { getCurrentNetwork } from '../types/network'

export function getMockTokens(): IMockTokenInfo[] {
  const network = getCurrentNetwork()
  return Object.values(MOCK_TOKEN_MAP[network])
}

const MOCK_TOKEN_MAP: Record<Network, TokenMap<IMockTokenInfo>> = {
  [Network.HARDHAT]: {
    BUSD: { tokenName: 'Binance USD', tokenSymbol: 'BUSD', decimalForMockToken: 18 },
    USDC: { tokenName: 'USD Coin', tokenSymbol: 'USDC', decimalForMockToken: 18 },
    USDT: { tokenName: 'Tether USD', tokenSymbol: 'USDT', decimalForMockToken: 18 },
    TUSD: { tokenName: 'TrueUSD', tokenSymbol: 'TUSD', decimalForMockToken: 18 },
    DAI: { tokenName: 'Dai Stablecoin', tokenSymbol: 'DAI', decimalForMockToken: 18 },
    vUSDC: { tokenName: 'Venus USDC', tokenSymbol: 'vUSDC', decimalForMockToken: 8 },
    axlUSDC: { tokenName: 'Axelar Wrapped USDC', tokenSymbol: 'axlUSDC', decimalForMockToken: 6 },
  },
  [Network.BSC_TESTNET]: {
    BUSD: { tokenName: 'Binance USD', tokenSymbol: 'BUSD', decimalForMockToken: 18 },
    USDC: { tokenName: 'USD Coin', tokenSymbol: 'USDC', decimalForMockToken: 18 },
    USDT: { tokenName: 'Tether USD', tokenSymbol: 'USDT', decimalForMockToken: 18 },
    DAI: { tokenName: 'Dai Stablecoin', tokenSymbol: 'DAI', decimalForMockToken: 18 },
    vUSDC: { tokenName: 'Venus USDC', tokenSymbol: 'vUSDC', decimalForMockToken: 8 },
    TUSD: { tokenName: 'TrueUSD', tokenSymbol: 'TUSD', decimalForMockToken: 18 },
    FRAX: { tokenName: 'Frax', tokenSymbol: 'FRAX', decimalForMockToken: 18 },
    iUSD: { tokenName: 'iZUMi Bond USD', tokenSymbol: 'iUSD', decimalForMockToken: 18 },
    CUSD: { tokenName: 'Coin98 Dollar', tokenSymbol: 'CUSD', decimalForMockToken: 18 },
    MIM: { tokenName: 'Magic Internet Money', tokenSymbol: 'MIM', decimalForMockToken: 18 },
    HAY: { tokenName: 'Hay Destablecoin', tokenSymbol: 'HAY', decimalForMockToken: 18 },
    axlUSDC: { tokenName: 'Axelar Wrapped USDC', tokenSymbol: 'axlUSDC', decimalForMockToken: 6 },
    USDD: { tokenName: 'Decentralized USD', tokenSymbol: 'USDD', decimalForMockToken: 18 },
    BOB: { tokenName: 'BOB', tokenSymbol: 'BOB', decimalForMockToken: 18 },
    WOM: { tokenName: 'Wombat Token', tokenSymbol: 'WOM', decimalForMockToken: 18 },
    wmxWOM: { tokenName: 'WMX WOM', tokenSymbol: 'wmxWOM', decimalForMockToken: 18 },
    mWOM: { tokenName: 'M WOM', tokenSymbol: 'mWOM', decimalForMockToken: 18 },
    qWOM: { tokenName: 'Quoll WOM', tokenSymbol: 'qWOM', decimalForMockToken: 18 },
    BTC: { tokenName: 'Bitcoin Token', tokenSymbol: 'BTC', decimalForMockToken: 18 },
    ETH: { tokenName: 'Ethereum Token', tokenSymbol: 'ETH', decimalForMockToken: 18 },
  },
  [Network.LOCALHOST]: {
    BUSD: { tokenName: 'Binance USD', tokenSymbol: 'BUSD', decimalForMockToken: 18 },
    USDC: { tokenName: 'USD Coin', tokenSymbol: 'USDC', decimalForMockToken: 18 },
    USDT: { tokenName: 'Tether USD', tokenSymbol: 'USDT', decimalForMockToken: 18 },
    TUSD: { tokenName: 'TrueUSD', tokenSymbol: 'TUSD', decimalForMockToken: 18 },
    DAI: { tokenName: 'Dai Stablecoin', tokenSymbol: 'DAI', decimalForMockToken: 18 },
    vUSDC: { tokenName: 'Venus USDC', tokenSymbol: 'vUSDC', decimalForMockToken: 8 },
  },
  [Network.AVALANCHE_TESTNET]: {
    BUSD: { tokenName: 'Binance USD', tokenSymbol: 'BUSD', decimalForMockToken: 18 },
    vUSDC: { tokenName: 'Venus USDC', tokenSymbol: 'vUSDC', decimalForMockToken: 8 },
  },
  [Network.SCROLL_TESTNET]: {},
  [Network.BSC_MAINNET]: {},
  [Network.POLYGON_MAINNET]: {},
  [Network.POLYGON_TESTNET]: {
    USDC: { tokenName: 'USD Coin', tokenSymbol: 'USDC', decimalForMockToken: 18 },
    USDT: { tokenName: 'Tether USD', tokenSymbol: 'USDT', decimalForMockToken: 18 },
    axlUSDC: { tokenName: 'Axelar Wrapped USDC', tokenSymbol: 'axlUSDC', decimalForMockToken: 6 },
  },
  [Network.ARBITRUM_MAINNET]: {},
  [Network.ARBITRUM_TESTNET]: {},
  [Network.OPTIMISM_MAINNET]: {},
  [Network.OPTIMISM_TESTNET]: {},
  [Network.ETHEREUM_MAINNET]: {},
  [Network.AVALANCHE_MAINNET]: {},
}
