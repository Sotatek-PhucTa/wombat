// starting 4 stables, all 18 decimals
interface IUSDTokens {
  [network: string]: IUSDTTokensInfo
}
interface IUSDTTokensInfo {
  [token: string]: unknown[]
}

export const MAINNET_GNOSIS_SAFE = '0x123456789' // Actual mainnet BNB chain multi-sig wallet address

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
