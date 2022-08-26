import { BigNumber } from 'ethers'
import { parseEther, parseUnits } from 'ethers/lib/utils'

// starting 4 stables, all 18 decimals
interface ITokens<T> {
  [network: string]: T
}
interface ITokensInfo {
  [token: string]: unknown[]
}

export const WRAPPED_NATIVE_TOKENS_MAP: { [network: string]: string } = {
  bsc_mainnet: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  bsc_testnet: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
}

export interface IRewarder {
  lpToken: string
  rewardToken: string
  secondsToStart: number
  tokenPerSec: BigNumber
}

export const USD_TOKENS_MAP: ITokens<ITokensInfo> = {
  bsc_mainnet: {
    BUSD: ['Binance USD', 'BUSD', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 240], // last item is pool alloc point
    USDC: ['USD Coin', 'USDC', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 240],
    USDT: ['Tether USD', 'USDT', '0x55d398326f99059ff775485246999027b3197955', 240],
    DAI: ['Dai Stablecoin', 'DAI', '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', 240],
  },
  bsc_testnet: {
    BUSD: ['Binance USD', 'BUSD', '18', 0, 240], // 0 tokens minted to msg.sender initially
    USDC: ['USD Coin', 'USDC', '18', 0, 240],
    USDT: ['Tether USD', 'USDT', '18', 0, 240],
    TUSD: ['TrueUSD', 'TUSD', '18', 0, 240],
    DAI: ['Dai Stablecoin', 'DAI', '18', 0, 240],
    vUSDC: ['Venus USDC', 'vUSDC', '8', 0, 240],
  },
  localhost: {
    BUSD: ['Binance USD', 'BUSD', '18', 0, 240], // 0 tokens minted to msg.sender initially
    USDC: ['USD Coin', 'USDC', '18', 0, 240],
    USDT: ['Tether USD', 'USDT', '18', 0, 240],
    TUSD: ['TrueUSD', 'TUSD', '18', 0, 240],
    DAI: ['Dai Stablecoin', 'DAI', '18', 0, 240],
    vUSDC: ['Venus USDC', 'vUSDC', '8', 0, 240],
  },
  hardhat: {
    BUSD: ['Binance USD', 'BUSD', '18', 0, 240], // 0 tokens minted to msg.sender initially
    USDC: ['USD Coin', 'USDC', '18', 0, 240],
    USDT: ['Tether USD', 'USDT', '18', 0, 240],
    TUSD: ['TrueUSD', 'TUSD', '18', 0, 240],
    DAI: ['Dai Stablecoin', 'DAI', '18', 0, 240],
    vUSDC: ['Venus USDC', 'vUSDC', '8', 0, 240],
  },
}

export const USD_SIDEPOOL_TOKENS_MAP: ITokens<ITokensInfo> = {
  bsc_mainnet: {
    BUSD: ['Binance USD', 'BUSD', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 0], // last item is pool alloc point
    TUSD: ['TrueUSD', 'TUSD', '0x14016E85a25aeb13065688cAFB43044C2ef86784', 0],
    FRAX: ['Frax', 'FRAX', '0x90C97F71E18723b0Cf0dfa30ee176Ab653E89F40', 0],
    MIM: ['Magic Internet Money', 'MIM', '0xfE19F0B51438fd612f6FD59C1dbB3eA319f433Ba', 0],
    HAY: ['Hay Stablecoin', 'HAY', ''], // TBC on mainnet
  },
  bsc_testnet: {
    BUSD: ['Binance USD', 'BUSD', '18', 0], // last item is 0 tokens minted to msg.sender initially
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

export const BNB_DYNAMICPOOL_TOKENS_MAP: ITokens<ITokensInfo> = {
  bsc_mainnet: {
    WBNB: ['Wrapped BNB', 'WBNB', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', '', 'Dynamic', 10], // last 3 items are exchange rate oracle, asset type, and pool alloc points
    STKBNB: [
      'Staked BNB',
      'stkBNB',
      '0xc2E9d07F66A89c44062459A47a0D2Dc038E4fb16',
      '0xC228CefDF841dEfDbD5B3a18dFD414cC0dbfa0D8', // exchange rate oracle
      'Stkbnb', // asset type
      10, // pool alloc point
    ], // TBC on mainnet
    BNBX: [
      'Liquid Staking BNB',
      'BNBx',
      '0x1bdd3Cf7F79cfB8EdbB955f20ad99211551BA275',
      '0x7276241a669489E4BBB76f63d2A43Bfe63080F2F',
      'Bnbx',
      10,
    ],
    ABNBC: [
      'Ankr BNB Reward Bearing Certificate',
      'aBNBc',
      '0xE85aFCcDaFBE7F2B096f268e31ccE3da8dA2990A',
      '0xE85aFCcDaFBE7F2B096f268e31ccE3da8dA2990A',
      'ABnbc',
      10,
    ],
  },
  bsc_testnet: {
    WBNB: ['Wrapped BNB', 'WBNB', '18', 0, 'Dynamic', 10],
    TWBNB: ['Testnet Wrapped BNB', 'TWBNB', '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', '', 'Dynamic', 10],
    STKBNB: [
      'Staked BNB',
      'stkBNB',
      '0xF7CE8444b3b1c62e785a25343a8B4764198A81B8',
      '0x7CdFba1Ee6A8D1e688B4B34A56b62287ce400802',
      'Stkbnb',
      10,
    ],
    BNBX: [
      'Liquid Staking BNB',
      'BNBx',
      '0x3ECB02c703C815e9cFFd8d9437B7A2F93638d7Cb',
      '0xDAdcae6bF110c0e70E5624bCdcCBe206f92A2Df9',
      'Bnbx',
      10,
    ],
    ABNBC: [
      'Ankr BNB Reward Bearing Certificate',
      'aBNBc',
      '0x46de2fbaf41499f298457cd2d9288df4eb1452ab',
      '0x46de2fbaf41499f298457cd2d9288df4eb1452ab',
      'ABnbc',
      10,
    ],
  },
  localhost: {
    WBNB: ['Wrapped BNB', 'WBNB', '18', 0, 'Dynamic', 10],
    TWBNB: ['Testnet Wrapped BNB', 'TWBNB', '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', '', 'Dynamic', 10],
    STKBNB: [
      'Staked BNB',
      'stkBNB',
      '0xF7CE8444b3b1c62e785a25343a8B4764198A81B8',
      '0x7CdFba1Ee6A8D1e688B4B34A56b62287ce400802',
      'Stkbnb',
      10,
    ],
    BNBX: [
      'Liquid Staking BNB',
      'BNBx',
      '0x3ECB02c703C815e9cFFd8d9437B7A2F93638d7Cb',
      '0xDAdcae6bF110c0e70E5624bCdcCBe206f92A2Df9',
      'Bnbx',
      10,
    ],
    ABNBC: [
      'Ankr BNB Reward Bearing Certificate',
      'aBNBc',
      '0x46de2fbaf41499f298457cd2d9288df4eb1452ab',
      '0x46de2fbaf41499f298457cd2d9288df4eb1452ab',
      'ABnbc',
      10,
    ],
  },
  hardhat: {
    WBNB: ['Wrapped BNB', 'WBNB', '18', 0, 'Dynamic', 10],
    TWBNB: ['Testnet Wrapped BNB', 'TWBNB', '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', '', 'Dynamic', 10],
    STKBNB: [
      'Staked BNB',
      'stkBNB',
      '0xF7CE8444b3b1c62e785a25343a8B4764198A81B8',
      '0x7CdFba1Ee6A8D1e688B4B34A56b62287ce400802',
      'Stkbnb',
      10,
    ],
    BNBX: [
      'Liquid Staking BNB',
      'BNBx',
      '0x3ECB02c703C815e9cFFd8d9437B7A2F93638d7Cb',
      '0xDAdcae6bF110c0e70E5624bCdcCBe206f92A2Df9',
      'Bnbx',
      10,
    ],
    ABNBC: [
      'Ankr BNB Reward Bearing Certificate',
      'aBNBc',
      '0x46de2fbaf41499f298457cd2d9288df4eb1452ab',
      '0x46de2fbaf41499f298457cd2d9288df4eb1452ab',
      'ABnbc',
      10,
    ],
  },
}

export const REWARDERS_MAP: ITokens<{ [token: string]: IRewarder }> = {
  bsc_testnet: {
    BUSD: {
      lpToken: '0xA1a8d6688A2DEF14d6bD3A76E3AA2bdB5670C567',
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc',
      secondsToStart: 60,
      tokenPerSec: parseEther('0.1'),
    },
    USDC: {
      lpToken: '0x61ABD791773a7E583aD439F558C6c0F157707e7b',
      rewardToken: '0x615f8656b763ff4a6a82b3cbbd54d392834df13f',
      secondsToStart: 60,
      tokenPerSec: parseUnits('0.035', 8),
    },
  },
}
