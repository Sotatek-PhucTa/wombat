import { BigNumberish } from 'ethers'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { Network } from './types'

// starting 4 stables, all 18 decimals
interface ITokens<T> {
  [network: string]: T
}
interface ITokensInfo {
  [token: string]: unknown[]
}

export const WRAPPED_NATIVE_TOKENS_MAP: Record<Network, string> = injectForkNetwork({
  [Network.HARDHAT]: ethers.constants.AddressZero,
  [Network.LOCALHOST]: ethers.constants.AddressZero,
  [Network.BSC_MAINNET]: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  [Network.BSC_TESTNET]: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
  [Network.POLYGON_MAINNET]: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
  [Network.POLYGON_TESTNET]: '0x4bab602423c8a009ca8c25ef6e3d64367789c8a9',
  [Network.AVALANCHE_TESTNET]: '0x1d308089a2d1ced3f1ce36b1fcaf815b07217be3',
  [Network.ARBITRUM_MAINNET]: ethers.constants.AddressZero,
  [Network.ARBITRUM_TESTNET]: ethers.constants.AddressZero,
}) as Record<Network, string>

export interface IRewarder {
  lpToken: string
  rewardToken: string
  startTimestamp?: number
  secondsToStart?: number
  tokenPerSec: BigNumberish
}

function defaultRewarder(): IRewarder {
  return {
    lpToken: ethers.constants.AddressZero,
    rewardToken: ethers.constants.AddressZero,
    secondsToStart: 60,
    tokenPerSec: parseEther('0'),
  }
}

// inject forkNetwork to hardhat and localhost
function injectForkNetwork(config: { [network: string]: any }) {
  const forkNetwork = process.env.FORK_NETWORK || ''
  // default value in .env
  if (forkNetwork == 'false') {
    return config
  }

  if (!Object.values(Network).includes(forkNetwork)) {
    throw new Error(`Unrecognized network: ${forkNetwork}`)
  }

  return Object.assign(config, {
    [Network.HARDHAT]: config[forkNetwork],
    [Network.LOCALHOST]: config[forkNetwork],
  })
}

export const USD_TOKENS_MAP: ITokens<ITokensInfo> = injectForkNetwork({
  bsc_mainnet: {
    BUSD: ['Binance USD', 'BUSD', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 220], // last item is pool alloc point
    USDC: ['USD Coin', 'USDC', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 220],
    USDT: ['Tether USD', 'USDT', '0x55d398326f99059ff775485246999027b3197955', 220],
    DAI: ['Dai Stablecoin', 'DAI', '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', 75],
  },
  bsc_testnet: {
    BUSD: ['Binance USD', 'BUSD', '18', 0, 240], // 0 tokens minted to msg.sender initially
    USDC: ['USD Coin', 'USDC', '18', 0, 240],
    USDT: ['Tether USD', 'USDT', '18', 0, 240],
    TUSD: ['TrueUSD', 'TUSD', '18', 0, 240],
    DAI: ['Dai Stablecoin', 'DAI', '18', 0, 240],
    vUSDC: ['Venus USDC', 'vUSDC', '8', 0, 240],
  },
  [Network.AVALANCHE_TESTNET]: {
    BUSD: ['Binance USD', 'BUSD', '18', 0, 240], // 0 tokens minted to msg.sender initially
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
  [Network.ARBITRUM_MAINNET]: {
    USDC: ['USD Coin', 'USDC', '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'],
    USDT: ['Tether USD', 'USDT', '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9'],
    DAI: ['Dai Stablecoin', 'DAI', '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1'],
  },
})

export const USD_SIDEPOOL_TOKENS_MAP: ITokens<ITokensInfo> = injectForkNetwork({
  bsc_mainnet: {
    BUSD: ['Binance USD', 'BUSD', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 10], // last item is pool alloc point
    HAY: ['Hay Stablecoin', 'HAY', '0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5', 0],
  },
  bsc_testnet: {
    BUSD: ['Binance USD', 'BUSD', '18', 0], // last item is 0 tokens minted to msg.sender initially
    TUSD: ['TrueUSD', 'TUSD', '18', 0],
    FRAX: ['Frax', 'FRAX', '18', 0],
    MIM: ['Magic Internet Money', 'MIM', '18', 0],
    HAY: ['Hay Stablecoin', 'HAY', '18', 0],
  },
})

export const FACTORYPOOL_TOKENS_MAP: ITokens<Record<string, ITokensInfo>> = injectForkNetwork({
  bsc_mainnet: {
    stables_01: {
      BUSD: ['Binance USD', 'BUSD', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 5], // last item is pool alloc point
      TUSD: ['TrueUSD', 'TUSD', '0x14016e85a25aeb13065688cafb43044c2ef86784', 0],
      FRAX: ['Frax', 'FRAX', '0x90C97F71E18723b0Cf0dfa30ee176Ab653E89F40', 0],
      // MIM: ['Magic Internet Money', 'MIM', '0xfE19F0B51438fd612f6FD59C1dbB3eA319f433Ba', 0], // added at later stage
    },
    iUSD_Pool: {
      IUSD: ['iZUMi Bond USD', 'iUSD', '0x0A3BB08b3a15A19b4De82F8AcFc862606FB69A2D', 0],
      BUSD: ['Binance USD', 'BUSD', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 0],
    },
    CUSD_Pool: {
      CUSD: ['Coin98 Dollar', 'CUSD', '0xfa4ba88cf97e282c505bea095297786c16070129', 0],
      HAY: ['Hay Destablecoin', 'HAY', '0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5', 0],
    },
    axlUSDC_Pool: {
      AXLUSDC: ['Axelar Wrapped USDC', 'axlUSDC', '0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3', 0],
      BUSD: ['Binance USD', 'BUSD', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 0],
    },
    USDD_Pool: {
      USDD: ['Decentralized USD', 'USDD', '0xd17479997F34dd9156Deef8F95A52D81D265be9c', 0],
      USDC: ['USD Coin', 'USDC', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 0],
    },
    BOB_Pool: {
      BOB: ['BOB', 'BOB', '0xB0B195aEFA3650A6908f15CdaC7D92F8a5791B0B', 0],
      USDC: ['USD Coin', 'USDC', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 0],
    },
  },
  bsc_testnet: {
    stables_01: {
      BUSD: ['Binance USD', 'BUSD', '18', 0], // last item is 0 tokens minted to msg.sender initially
      TUSD: ['TrueUSD', 'TUSD', '18', 0],
      FRAX: ['Frax', 'FRAX', '18', 0],
    },
    iUSD_Pool: {
      IUSD: ['iZUMi Bond USD', 'iUSD', '18', 0],
      BUSD: ['Binance USD', 'BUSD', '18', 0],
    },
    CUSD_Pool: {
      CUSD: ['Coin98 Dollar', 'CUSD', '18', 0],
      HAY: ['Hay Destablecoin', 'HAY', '18', 0],
    },
    axlUSDC_Pool: {
      AXLUSDC: ['Axelar Wrapped USDC', 'axlUSDC', '6', 0],
      BUSD: ['Binance USD', 'BUSD', '18', 0],
    },
    USDD_Pool: {
      USDD: ['Decentralized USD', 'USDD', '18', 0],
      USDC: ['USD Coin', 'USDC', '18', 0],
    },
    BOB_Pool: {
      BOB: ['BOB', 'BOB', '18', 0],
      USDC: ['USD Coin', 'USDC', '18', 0],
    },
  },
})

export const WOM_DYNAMICPOOL_TOKENS_MAP: ITokens<Record<string, ITokensInfo>> = injectForkNetwork({
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
})

// TODO: refactor this to handle separate BNB pools
export const BNB_DYNAMICPOOL_TOKENS_MAP: ITokens<ITokensInfo> = injectForkNetwork({
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
})

export const BNBX_POOL_TOKENS_MAP: ITokens<ITokensInfo> = injectForkNetwork({
  bsc_mainnet: {
    WBNB: ['Wrapped BNB', 'WBNB', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', '', 'DynamicAsset'], // last 3 items are exchange rate oracle, asset type, and pool alloc points
    BNBX: [
      'Liquid Staking BNB',
      'BNBx',
      '0x1bdd3Cf7F79cfB8EdbB955f20ad99211551BA275',
      '0x7276241a669489E4BBB76f63d2A43Bfe63080F2F',
      'BnbxAsset',
    ],
  },
  bsc_testnet: {
    WBNB: ['Wrapped BNB', 'WBNB', '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', '', 'DynamicAsset'],
    TWBNB: ['Testnet Wrapped BNB', 'TWBNB', '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', '', 'DynamicAsset'],
    BNBX: [
      'Liquid Staking BNB',
      'BNBx',
      '0x3ECB02c703C815e9cFFd8d9437B7A2F93638d7Cb',
      '0xDAdcae6bF110c0e70E5624bCdcCBe206f92A2Df9',
      'BnbxAsset',
    ],
  },
})

export const STKBNB_POOL_TOKENS_MAP: ITokens<ITokensInfo> = injectForkNetwork({
  bsc_mainnet: {
    WBNB: [
      'Wrapped BNB',
      'WBNB',
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '', //
      'DynamicAsset',
    ], // last 2 items are exchange rate oracle, asset type
    BNBX: [
      'Staked BNB',
      'stkBNB',
      '0xc2E9d07F66A89c44062459A47a0D2Dc038E4fb16',
      '0xC228CefDF841dEfDbD5B3a18dFD414cC0dbfa0D8', // exchange rate oracle
      'StkbnbAsset',
    ],
  },
  bsc_testnet: {},
})

export const FRXETH_POOL_TOKENS_MAP: ITokens<ITokensInfo> = injectForkNetwork({
  bsc_mainnet: {
    WETH: [
      'Wrapped ETH',
      'WETH',
      '0x4DB5a66E937A9F4473fA95b1cAF1d1E1D62E29EA',
      '', //
      'DynamicAsset',
    ], // last 2 items are exchange rate oracle, asset type
    frxETH: [
      'Frax ETH',
      'frxETH',
      '0x64048A7eEcF3a2F1BA9e144aAc3D7dB6e58F555e',
      '', // exchange rate oracle
      'DynamicAsset',
    ],
    ETH: [
      'Binance-Peg Ethereum Token',
      'ETH',
      '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
      '', //
      'DynamicAsset',
    ],
  },
  bsc_testnet: {},
})

export const REWARDERS_MAP: ITokens<{ [token: string]: IRewarder }> = injectForkNetwork({
  bsc_mainnet: {
    HAY: {
      lpToken: '0x1fa71DF4b344ffa5755726Ea7a9a56fbbEe0D38b', // HAY-LP
      rewardToken: '0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5', // HAY
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: parseEther('0.005708'),
    },
    wmxWom: {
      lpToken: '0x3C42E4F84573aB8c88c8E479b7dC38A7e678D688', // wmxWOM-LP
      rewardToken: '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD', // WMX
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: parseEther('0.027'),
    },
    wmxWOMPool_WOM: {
      lpToken: '0xF9BdC872D75f76B946E0770f96851b1f2F653caC', // WOM-LP
      rewardToken: '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD', // WMX
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: parseEther('0.0116'),
    },
    mWOM: {
      lpToken: '0x1f502fF26dB12F8e41B373f36Dc0ABf2D7F6723E', // mWOM-LP TBD
      rewardToken: '0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa', // MGP
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: parseEther('0.375'),
    },
    mWOMPool_WOM: {
      lpToken: '0xEABa290B154aF45DE72FDf2a40E56349e4E68AC2', // mWOMPool_WOM-LP TBD
      rewardToken: '0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa', // MGP
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: parseEther('0.075'),
    },
    qWOM: {
      lpToken: '0x87073ba87517E7ca981AaE3636754bCA95C120E4',
      rewardToken: '0x08b450e4a48C04CDF6DB2bD4cf24057f7B9563fF',
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: parseEther('0.13'),
    },
    qWOMPool_WOM: {
      lpToken: '0xB5c9368545A26b91d5f7340205e5d9559f48Bcf8',
      rewardToken: '0x08b450e4a48C04CDF6DB2bD4cf24057f7B9563fF',
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: parseEther('0.1'),
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: '0x16B37225889A038FAD42efdED462821224A509A7',
      rewardToken: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', // WOM
    },
    BnbxPool_WBNB: {
      ...defaultRewarder(),
      lpToken: '0x0321D1D769cc1e81Ba21a157992b635363740f86',
      rewardToken: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', // WOM
    },
    stkBnb: {
      ...defaultRewarder(),
      lpToken: '0x0E202A0bCad2712d1fdeEB94Ec98C58bEeD0679f',
      rewardToken: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', // WOM
    },
    StkBnbPool_WBNB: {
      ...defaultRewarder(),
      lpToken: '0x6C7B407411b3DB90DfA25DA4aA66605438D378CE',
      rewardToken: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', // WOM
    },
    frxETH_Pool_ETH: {
      ...defaultRewarder(),
      lpToken: '0x4d41E9EDe1783b85756D3f5Bd136C50c4Fb8E67E',
      rewardToken: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', // WOM
    },
  },
  bsc_testnet: {
    BUSD: {
      ...defaultRewarder(),
      lpToken: '0xA1a8d6688A2DEF14d6bD3A76E3AA2bdB5670C567',
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc',
      tokenPerSec: parseEther('0.1'),
    },
    USDC: {
      ...defaultRewarder(),
      lpToken: '0x61ABD791773a7E583aD439F558C6c0F157707e7b',
      rewardToken: '0x615f8656b763ff4a6a82b3cbbd54d392834df13f',
      tokenPerSec: parseUnits('0.035', 8),
    },
    FRAX_BUSD: {
      ...defaultRewarder(),
      lpToken: '0x0d3dBc403d121eB53d14E2FE2a98e78CA3E17c44',
      rewardToken: '0xa5c67cD016df71f9CDCfd9e76A749a1DDca6209d',
      tokenPerSec: parseUnits('0.035', 8),
    },
    FRAX: {
      ...defaultRewarder(),
      lpToken: '0xc5f2B1df25B9Bfc61444b002121330bEa9460F3e',
      rewardToken: '0xa5c67cD016df71f9CDCfd9e76A749a1DDca6209d',
      tokenPerSec: parseUnits('0.035', 8),
    },
    wWOM: {
      ...defaultRewarder(),
      lpToken: '0x505b0159871F86Ae0F4512BB52dB5030E31E2459',
      rewardToken: '0x9bbc325eb7a7367be610bce614c91ef7f29c69dc',
      tokenPerSec: parseUnits('0.00035', 18),
    },
    qWOM: {
      ...defaultRewarder(),
      lpToken: '0x22056C9F7e8033BBea9F32b903a0ECF8a7Ea0bC7',
      rewardToken: '0x458c742849d041723efadd9a31153233de442b9b',
      tokenPerSec: parseUnits('0.09', 18),
    },
    qWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: '0x82e5314DfdA9aD1a7F594B7D0b5D6b13459f4826',
      rewardToken: '0x458c742849d041723efadd9a31153233de442b9b',
      tokenPerSec: parseUnits('0.14', 18),
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: '0xB9207cc7bEaFb74773Cd08C869d6F6f890105564',
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc', // RT1
    },
    BnbxPool_WBNB: {
      ...defaultRewarder(),
      lpToken: '0xC0aFB4E0f2A11E2a74F168904F47178865b728ba',
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc', // RT1
    },
  },
})

// IBribe reuses the interface of IRewarder
export const BRIBE_MAPS: ITokens<{ [token: string]: IRewarder }> = injectForkNetwork({
  bsc_mainnet: {
    HAY: {
      ...defaultRewarder(),
      lpToken: '0x1fa71DF4b344ffa5755726Ea7a9a56fbbEe0D38b', // LP-HAY
      rewardToken: '0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5', // HAY
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: '0x16B37225889A038FAD42efdED462821224A509A7', // LP-BNBx
      rewardToken: '0x3BC5AC0dFdC871B365d159f728dd1B9A0B5481E8', // SD
    },
    BnbxPool_WBNB: {
      ...defaultRewarder(),
      lpToken: '0x0321D1D769cc1e81Ba21a157992b635363740f86', // LP-BnbxPool_WBNB pid: 16
      rewardToken: '0x3BC5AC0dFdC871B365d159f728dd1B9A0B5481E8', // SD
    },
    stkBnb: {
      ...defaultRewarder(),
      lpToken: '0x0E202A0bCad2712d1fdeEB94Ec98C58bEeD0679f',
      rewardToken: '0x4C882ec256823eE773B25b414d36F92ef58a7c0C', // pSTAKE
    },
    StkBnbPool_WBNB: {
      ...defaultRewarder(),
      lpToken: '0x6C7B407411b3DB90DfA25DA4aA66605438D378CE',
      rewardToken: '0x4C882ec256823eE773B25b414d36F92ef58a7c0C', // pSTAKE
    },
    wmxWom: {
      ...defaultRewarder(),
      lpToken: '0x3C42E4F84573aB8c88c8E479b7dC38A7e678D688', // LP-wmxWOM pid:7
      rewardToken: '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD', // WMX
    },
    wmxWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: '0xF9BdC872D75f76B946E0770f96851b1f2F653caC', // LP-WOM pid:6
      rewardToken: '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD', // WMX
    },
    mWOM: {
      ...defaultRewarder(),
      lpToken: '0x1f502fF26dB12F8e41B373f36Dc0ABf2D7F6723E', // LP-mWOM pid:9
      rewardToken: '0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa', // MGP
    },
    mWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: '0xEABa290B154aF45DE72FDf2a40E56349e4E68AC2', // LP-mWOMPool_WOM pid:8
      rewardToken: '0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa', // MGP
    },
    qWOM: {
      ...defaultRewarder(),
      lpToken: '0x87073ba87517E7ca981AaE3636754bCA95C120E4', // LP-qWOM pid:11
      rewardToken: '0x08b450e4a48C04CDF6DB2bD4cf24057f7B9563fF', // QUO
    },
    qWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: '0xB5c9368545A26b91d5f7340205e5d9559f48Bcf8', // LP-qWOMPool_WOM pid:10
      rewardToken: '0x08b450e4a48C04CDF6DB2bD4cf24057f7B9563fF', // QUO
    },
    IUSDPool_iUSD: {
      ...defaultRewarder(),
      lpToken: '0x3A29dF144bB54A8bF3d20357c116befa7adE962d',
      rewardToken: '0x0A3BB08b3a15A19b4De82F8AcFc862606FB69A2D', // iUSD
    },
    IUSDPool_BUSD: {
      ...defaultRewarder(),
      lpToken: '0x7Ff1AEc17ea060BBcB7dF6b8723F6Ea7fc905E8F',
      rewardToken: '0x0A3BB08b3a15A19b4De82F8AcFc862606FB69A2D', // iUSD
    },
    CUSDPool_CUSD: {
      ...defaultRewarder(),
      lpToken: '0x3ac762C607ed6Dba156cBcF11efF96340e86b490',
      rewardToken: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', // WOM
    },
    CUSDPool_HAY: {
      ...defaultRewarder(),
      lpToken: '0xa6eF6C45EbFDBc13f6D032fbDFeC9b389C1603E5',
      rewardToken: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', // WOM
    },
    AxlUsdcPool_axlUSDC: {
      ...defaultRewarder(),
      lpToken: '0x77F645Ee0c6d47380A942B04B8151fD542927391',
      rewardToken: '0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3', // axlUSDC
    },
    AxlUsdcPool_BUSD: {
      ...defaultRewarder(),
      lpToken: '0x791b2424df9865994Ad570425278902E2B5D7946',
      rewardToken: '0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3', // axlUSDC
    },
    BOBPool_BOB: {
      ...defaultRewarder(),
      lpToken: '0x4968E21be7Bb0ced1bd3859d3dB993ad3a05d2E6',
      rewardToken: '0xB0B195aEFA3650A6908f15CdaC7D92F8a5791B0B', // BOB
    },
    BOBPool_USDC: {
      ...defaultRewarder(),
      lpToken: '0x6b98d2B6ed0131338C7945Db8588DA43323d1b8C',
      rewardToken: '0xB0B195aEFA3650A6908f15CdaC7D92F8a5791B0B', // BOB
    },
    frxETH: {
      ...defaultRewarder(),
      lpToken: '0xd67EdEA100AdC2Aa8ae0b5CEe7bF420ee17E5bB9',
      rewardToken: '0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE', // FXS
    },
    frxETHPool_WETH: {
      ...defaultRewarder(),
      lpToken: '0xb268c3181921747379271B9BFfCE8B16311656e3',
      rewardToken: '0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE', // FXS
    },
    frxETH_Pool_ETH: {
      ...defaultRewarder(),
      lpToken: '0x4d41E9EDe1783b85756D3f5Bd136C50c4Fb8E67E',
      rewardToken: '0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE', // FXS
    },
    frax: {
      ...defaultRewarder(),
      lpToken: '0x47aB513f97e1CC7D7d1a4DB4563F1a0fa5C371EB',
      rewardToken: '0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE', // FXS
    },
  },
  bsc_testnet: {
    BUSD: {
      ...defaultRewarder(),
      lpToken: '0xA1a8d6688A2DEF14d6bD3A76E3AA2bdB5670C567',
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc', // RT1
      tokenPerSec: parseEther('0.1'),
    },
    FRAX_BUSD: {
      ...defaultRewarder(),
      lpToken: '0x0d3dBc403d121eB53d14E2FE2a98e78CA3E17c44',
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc', // RT1
      tokenPerSec: parseEther('0.1'),
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: '0xB9207cc7bEaFb74773Cd08C869d6F6f890105564',
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc', // RT1
    },
  },
})

export const WORMHOLE_MAPS: ITokens<{ relayer: string; wormholeBridge: string }> = injectForkNetwork({
  bsc_testnet: {
    relayer: '0xda2592C43f2e10cBBA101464326fb132eFD8cB09',
    wormholeBridge: '0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D',
  },
  [Network.AVALANCHE_TESTNET]: {
    relayer: '0xDDe6b89B7d0AD383FafDe6477f0d300eC4d4033e',
    wormholeBridge: '0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C',
  },
  [Network.LOCALHOST]: {
    relayer: '0x0000000000000000000000000000000000000000',
    wormholeBridge: '0x0000000000000000000000000000000000000000',
  },
  [Network.HARDHAT]: {
    relayer: '0x0000000000000000000000000000000000000000',
    wormholeBridge: '0x0000000000000000000000000000000000000000',
  },
})
