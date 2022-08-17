// starting 4 stables, all 18 decimals
interface ITokens {
  [network: string]: ITokensInfo
}
interface ITokensInfo {
  [token: string]: unknown[]
}

export const WRAPPED_NATIVE_TOKENS_MAP: { [network: string]: string } = {
  bsc_mainnet: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  bsc_testnet: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
}

export const USD_TOKENS_MAP: ITokens = {
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

export const USD_SIDEPOOL_TOKENS_MAP: ITokens = {
  bsc_mainnet: {
    BUSD: ['Binance USD', 'BUSD', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'],
    TUSD: ['TrueUSD', 'TUSD', '0x14016E85a25aeb13065688cAFB43044C2ef86784'],
    FRAX: ['Frax', 'FRAX', '0x90C97F71E18723b0Cf0dfa30ee176Ab653E89F40'],
    MIM: ['Magic Internet Money', 'MIM', '0xfE19F0B51438fd612f6FD59C1dbB3eA319f433Ba'],
    HAY: ['Hay Stablecoin', 'HAY', ''], // TBC on mainnet
  },
  bsc_testnet: {
    BUSD: ['Binance USD', 'BUSD', '18', 0], // 0 tokens minted to msg.sender initially
    TUSD: ['TrueUSD', 'TUSD', '18', 0],
    FRAX: ['Frax', 'FRAX', '18', 0],
    MIM: ['Magic Internet Money', 'MIM', '18', 0],
    HAY: ['Hay Stablecoin', 'HAY', '18', 0],
  },
  localhost: {
    BUSD: ['Binance USD', 'BUSD', '18', 0], // 0 tokens minted to msg.sender initially
    TUSD: ['TrueUSD', 'TUSD', '18', 0],
    FRAX: ['Frax', 'FRAX', '18', 0],
    MIM: ['Magic Internet Money', 'MIM', '18', 0],
    HAY: ['Hay Stablecoin', 'HAY', '18', 0],
  },
  hardhat: {
    BUSD: ['Binance USD', 'BUSD', '18', 0], // 0 tokens minted to msg.sender initially
    TUSD: ['TrueUSD', 'TUSD', '18', 0],
    FRAX: ['Frax', 'FRAX', '18', 0],
    MIM: ['Magic Internet Money', 'MIM', '18', 0],
    HAY: ['Hay Stablecoin', 'HAY', '18', 0],
  },
}

export const BNB_DYNAMICPOOL_TOKENS_MAP: ITokens = {
  bsc_mainnet: {
    WBNB: ['Wrapped BNB', 'WBNB', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', '', 'Dynamic'], // last 2 items are exchange rate oracle and asset type
    STKBNB: ['Staked BNB', 'stkBNB', '', '', 'Stkbnb'], // TBC on mainnet
    BNBX: [
      'Liquid Staking BNB',
      'BNBx',
      '0x1bdd3Cf7F79cfB8EdbB955f20ad99211551BA275',
      '0x7276241a669489E4BBB76f63d2A43Bfe63080F2F',
      'Bnbx',
    ],
  },
  bsc_testnet: {
    WBNB: ['Wrapped BNB', 'WBNB', '18', 0, 'Dynamic'],
    TWBNB: ['Testnet Wrapped BNB', 'TWBNB', '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', '', 'Dynamic'],
    STKBNB: [
      'Staked BNB',
      'stkBNB',
      '0xF7CE8444b3b1c62e785a25343a8B4764198A81B8',
      '0x7CdFba1Ee6A8D1e688B4B34A56b62287ce400802',
      'Stkbnb',
    ],
    BNBX: [
      'Liquid Staking BNB',
      'BNBx',
      '0x3ECB02c703C815e9cFFd8d9437B7A2F93638d7Cb',
      '0xDAdcae6bF110c0e70E5624bCdcCBe206f92A2Df9',
      'Bnbx',
    ],
  },
  localhost: {
    WBNB: ['Wrapped BNB', 'WBNB', '18', 0, 'Dynamic'],
    TWBNB: ['Testnet Wrapped BNB', 'TWBNB', '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', '', 'Dynamic'],
    STKBNB: [
      'Staked BNB',
      'stkBNB',
      '0xF7CE8444b3b1c62e785a25343a8B4764198A81B8',
      '0x7CdFba1Ee6A8D1e688B4B34A56b62287ce400802',
      'Stkbnb',
    ],
    BNBX: [
      'Liquid Staking BNB',
      'BNBx',
      '0x3ECB02c703C815e9cFFd8d9437B7A2F93638d7Cb',
      '0xDAdcae6bF110c0e70E5624bCdcCBe206f92A2Df9',
      'Bnbx',
    ],
  },
  hardhat: {
    WBNB: ['Wrapped BNB', 'WBNB', '18', 0, 'Dynamic'],
    TWBNB: ['Testnet Wrapped BNB', 'TWBNB', '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', '', 'Dynamic'],
    STKBNB: [
      'Staked BNB',
      'stkBNB',
      '0xF7CE8444b3b1c62e785a25343a8B4764198A81B8',
      '0x7CdFba1Ee6A8D1e688B4B34A56b62287ce400802',
      'Stkbnb',
    ],
    BNBX: [
      'Liquid Staking BNB',
      'BNBx',
      '0x3ECB02c703C815e9cFFd8d9437B7A2F93638d7Cb',
      '0xDAdcae6bF110c0e70E5624bCdcCBe206f92A2Df9',
      'Bnbx',
    ],
  },
}
