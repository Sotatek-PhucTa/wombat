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
  startTimestamp?: number
  secondsToStart?: number
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
    HAY: ['Hay Stablecoin', 'HAY', '0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5', 0],
  },
  bsc_testnet: {
    BUSD: ['Binance USD', 'BUSD', '18', 0], // last item is 0 tokens minted to msg.sender initially
    TUSD: ['TrueUSD', 'TUSD', '18', 0],
    FRAX: ['Frax', 'FRAX', '18', 0],
    MIM: ['Magic Internet Money', 'MIM', '18', 0],
    HAY: ['Hay Stablecoin', 'HAY', '18', 0],
  },
}

export const FACTORYPOOL_TOKENS_MAP: ITokens<Record<string, ITokensInfo>> = {
  bsc_mainnet: {
    stables_01: {
      BUSD: ['Binance USD', 'BUSD', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 0], // last item is pool alloc point
      TUSD: ['TrueUSD', 'TUSD', '0x14016e85a25aeb13065688cafb43044c2ef86784', 0],
      FRAX: ['Frax', 'FRAX', '0x90C97F71E18723b0Cf0dfa30ee176Ab653E89F40', 0],
      // MIM: ['Magic Internet Money', 'MIM', '0xfE19F0B51438fd612f6FD59C1dbB3eA319f433Ba', 0], // added at later stage
    },
  },
  bsc_testnet: {
    stables_01: {
      BUSD: ['Binance USD', 'BUSD', '18', 0], // last item is 0 tokens minted to msg.sender initially
      TUSD: ['TrueUSD', 'TUSD', '18', 0],
      FRAX: ['Frax', 'FRAX', '18', 0],
    },
  },
}

export const WOM_DYNAMICPOOL_TOKENS_MAP: ITokens<Record<string, ITokensInfo>> = {
  bsc_mainnet: {
    wmxWOMPool: {
      WOM: ['Wombat Token', 'WOM', '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', 0], // last item is pool alloc point
      wmxWOM: ['Wombex WOM', 'wmxWom', '0x0415023846Ff1C6016c4d9621de12b24B2402979', 0],
    },
    mWOMPool: {
      WOM: ['Wombat Token', 'WOM', '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', 0], // last item is pool alloc point
      mWOM: ['mWOM', 'mWOM', '0x027a9d301FB747cd972CFB29A63f3BDA551DFc5c', 0],
    },
    qWOMPool: {
      WOM: ['Wombat Token', 'WOM', '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', 0], // last item is pool alloc point
      qWOM: ['Quoll WOM', 'qWOM', '0x0fE34B8aaAf3f522A6088E278936D10F934c0b19', 0],
    },
  },
  bsc_testnet: {
    wmxWOMPool: {
      WOM: ['Wombat Token', 'WOM', '18', 0],
      wmxWOM: ['WMX WOM', 'wmxWOM', '18', 0],
    },
    mWOMPool: {
      WOM: ['Wombat Token', 'WOM', '18', 0],
      mWOM: ['M WOM', 'mWOM', '18', 0],
    },
    qWOMPool: {
      WOM: ['Wombat Token', 'WOM', '18', 0], // last item is pool alloc point
      qWOM: ['Quoll WOM', 'qWOM', '18', 0], // pending
    },
  },
}

// TODO: refactor this to handle separate BNB pools
export const BNB_DYNAMICPOOL_TOKENS_MAP: ITokens<ITokensInfo> = {
  // TODO: re-enable after new BNB pools deploy
  // bsc_mainnet: {
  //   WBNB: ['Wrapped BNB', 'WBNB', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', '', 'Dynamic', 10], // last 3 items are exchange rate oracle, asset type, and pool alloc points
  //   STKBNB: [
  //     'Staked BNB',
  //     'stkBNB',
  //     '0xc2E9d07F66A89c44062459A47a0D2Dc038E4fb16',
  //     '0xC228CefDF841dEfDbD5B3a18dFD414cC0dbfa0D8', // exchange rate oracle
  //     'Stkbnb', // asset type
  //     10, // pool alloc point
  //   ], // TBC on mainnet
  //   BNBX: [
  //     'Liquid Staking BNB',
  //     'BNBx',
  //     '0x1bdd3Cf7F79cfB8EdbB955f20ad99211551BA275',
  //     '0x7276241a669489E4BBB76f63d2A43Bfe63080F2F',
  //     'Bnbx',
  //     10,
  //   ],
  //   ABNBC: [
  //     'Ankr BNB Reward Bearing Certificate',
  //     'aBNBc',
  //     '0xE85aFCcDaFBE7F2B096f268e31ccE3da8dA2990A',
  //     '0xE85aFCcDaFBE7F2B096f268e31ccE3da8dA2990A',
  //     'ABnbc',
  //     10,
  //   ],
  // },
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
}

export const REWARDERS_MAP: ITokens<{ [token: string]: IRewarder }> = {
  bsc_mainnet: {
    /*
    TODO: deploy rewarders for MWv3 for helio
    BUSD: {
      lpToken: '0xA649Be04619a8F3B3475498E1ac15C90C9661C1A', // BUSD-LP (Sidepool)
      rewardToken: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
      >> secondsToStart: 20 * 3600, // i.e. 2022/12/19 12PM HKT
      >> tokenPerSec: parseEther('0.005708'),
    },
    HAY: {
      lpToken: '0x1fa71DF4b344ffa5755726Ea7a9a56fbbEe0D38b', // HAY-LP
      rewardToken: '0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5', // HAY
      >> secondsToStart: 20 * 3600, // i.e. 2022/12/19 12PM HKT
      >> tokenPerSec: parseEther('0.005708'),
    },
    */
    /*
    TODO: deploy rewarders for MWv3 for wombex
    wmxWom: {
      lpToken: '0x3C42E4F84573aB8c88c8E479b7dC38A7e678D688', // wmxWOM-LP
      rewardToken: '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD', // WMX
      >> secondsToStart: 37800, // 10.5 hours later, i.e. deploy on 10/25/2022 11:30pm HKT
      >> tokenPerSec: parseEther('0.009513'),
    },
    wmxWOMPool_WOM: {
      lpToken: '0xF9BdC872D75f76B946E0770f96851b1f2F653caC', // WOM-LP
      rewardToken: '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD', // WMX
      >> secondsToStart: 37800, // 10.5 hours later, i.e. deploy on 10/25/2022 11:30pm HKT
      >> tokenPerSec: parseEther('0.019026'),
    },
    */
    /*
    TODO: deploy rewarders for MWv3 for magpie
    mWOM: {
      lpToken: '0x1f502fF26dB12F8e41B373f36Dc0ABf2D7F6723E', // mWOM-LP TBD
      rewardToken: '0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa', // MGP
      secondsToStart: 180000, // 50 hours later, i.e. deploy on 11/2/2022 12pm HKT
      tokenPerSec: parseEther('0.25'),
    },
    mWOMPool_WOM: {
      lpToken: '0xEABa290B154aF45DE72FDf2a40E56349e4E68AC2', // mWOMPool_WOM-LP TBD
      rewardToken: '0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa', // MGP
      secondsToStart: 180000, // 50 hours later, i.e. deploy on 11/2/2022 12pm HKT
      tokenPerSec: parseEther('0.075'),
    },
    */
    /*
    TODO: deploy rewarders for MWv3 for quoll
    qWOM: {
      lpToken: '0x87073ba87517E7ca981AaE3636754bCA95C120E4',
      rewardToken: '0x08b450e4a48C04CDF6DB2bD4cf24057f7B9563fF',
      >> secondsToStart: 172800, // 48 hours later, i.e. deploy on 11/16/2022 2pm HKT
      >> tokenPerSec: parseUnits('0.09', 18),
    },
    qWOMPool_WOM: {
      lpToken: '0xB5c9368545A26b91d5f7340205e5d9559f48Bcf8',
      rewardToken: '0x08b450e4a48C04CDF6DB2bD4cf24057f7B9563fF',
      >> secondsToStart: 172800, // 48 hours later, i.e. deploy on 11/16/2022 2pm HKT
      >> tokenPerSec: parseUnits('0.14', 18),
    },
    */
  },
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
    FRAX_BUSD: {
      lpToken: '0x0d3dBc403d121eB53d14E2FE2a98e78CA3E17c44',
      rewardToken: '0xa5c67cD016df71f9CDCfd9e76A749a1DDca6209d',
      secondsToStart: 60,
      tokenPerSec: parseUnits('0.035', 8),
    },
    FRAX: {
      lpToken: '0xc5f2B1df25B9Bfc61444b002121330bEa9460F3e',
      rewardToken: '0xa5c67cD016df71f9CDCfd9e76A749a1DDca6209d',
      secondsToStart: 60,
      tokenPerSec: parseUnits('0.035', 8),
    },
    wWOM: {
      lpToken: '0x505b0159871F86Ae0F4512BB52dB5030E31E2459',
      rewardToken: '0x9bbc325eb7a7367be610bce614c91ef7f29c69dc',
      secondsToStart: 60,
      tokenPerSec: parseUnits('0.00035', 18),
    },
    qWOM: {
      lpToken: '0x22056C9F7e8033BBea9F32b903a0ECF8a7Ea0bC7',
      rewardToken: '0x458c742849d041723efadd9a31153233de442b9b',
      secondsToStart: 60,
      tokenPerSec: parseUnits('0.09', 18),
    },
    qWOMPool_WOM: {
      lpToken: '0x82e5314DfdA9aD1a7F594B7D0b5D6b13459f4826',
      rewardToken: '0x458c742849d041723efadd9a31153233de442b9b',
      secondsToStart: 60,
      tokenPerSec: parseUnits('0.14', 18),
    },
  },
}

// IBribe reuses the interface of IRewarder
export const BRIBE_MAPS: ITokens<{ [token: string]: IRewarder }> = {
  bsc_testnet: {
    BUSD: {
      lpToken: '0xA1a8d6688A2DEF14d6bD3A76E3AA2bdB5670C567',
      // RT1
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc',
      secondsToStart: 60,
      tokenPerSec: parseEther('0.1'),
    },
    FRAX_BUSD: {
      lpToken: '0x0d3dBc403d121eB53d14E2FE2a98e78CA3E17c44',
      // RT1
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc',
      secondsToStart: 60,
      tokenPerSec: parseEther('0.1'),
    },
  },
}
