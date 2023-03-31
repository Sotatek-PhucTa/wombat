import { parseEther, parseUnits } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import {
  Address,
  Deployment,
  DeploymentOrAddress,
  IAssetInfo,
  IMockTokenInfo,
  IRewarder,
  ITokens,
  ITokensInfo,
  IWormholeAdaptorConfig,
  IWormholeConfig,
  Network,
  NetworkPoolInfo,
  PartialRecord,
  PoolInfo,
  PoolName,
  TokenMap,
  TokenSymbol,
} from './types'

// To resolve DeploymentOrAddress, use getAddress in utils/index.ts
export const WOMBAT_TOKEN: PartialRecord<Network, DeploymentOrAddress> = injectForkNetwork({
  [Network.HARDHAT]: { deploymentOrAddress: 'WombatToken' },
  [Network.LOCALHOST]: { deploymentOrAddress: 'WombatToken' },
  [Network.BSC_MAINNET]: { deploymentOrAddress: 'WombatToken' },
  [Network.BSC_TESTNET]: { deploymentOrAddress: 'WombatToken' },
  [Network.ARBITRUM_MAINNET]: { deploymentOrAddress: '0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96' },
}) as PartialRecord<Network, DeploymentOrAddress>

export const WRAPPED_NATIVE_TOKENS_MAP: Record<Network, string> = injectForkNetwork({
  [Network.HARDHAT]: ethers.constants.AddressZero,
  [Network.LOCALHOST]: ethers.constants.AddressZero,
  [Network.BSC_MAINNET]: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  [Network.BSC_TESTNET]: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
  [Network.POLYGON_MAINNET]: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
  [Network.POLYGON_TESTNET]: '0x4bab602423c8a009ca8c25ef6e3d64367789c8a9',
  [Network.AVALANCHE_TESTNET]: '0x1d308089a2d1ced3f1ce36b1fcaf815b07217be3',
  [Network.ARBITRUM_MAINNET]: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  [Network.ARBITRUM_TESTNET]: '0xDa01302C86ECcd5bc94c1086777acF3c3Af7EF63',
}) as Record<Network, string>

function defaultRewarder() {
  return {
    secondsToStart: 60,
    tokenPerSec: 0,
  }
}

// inject forkNetwork to hardhat and localhost
function injectForkNetwork<T>(config: PartialRecord<Network, T>): PartialRecord<Network, T> {
  const forkNetwork = process.env.FORK_NETWORK || ''
  // default value in .env
  if (forkNetwork == 'false') {
    return config
  }

  if (!Object.values(Network).includes(forkNetwork as Network)) {
    throw new Error(`Unrecognized network: ${forkNetwork}`)
  }

  return Object.assign(config, {
    [Network.HARDHAT]: config[forkNetwork as Network],
    [Network.LOCALHOST]: config[forkNetwork as Network],
  })
}

export const USD_TOKENS_MAP: ITokens<ITokensInfo> = injectForkNetwork<ITokensInfo>({
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
    USDC: ['USD Coin', 'USDC', '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', /*allocPoint=*/ '300'],
    USDT: ['Tether USD', 'USDT', '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', /*allocPoint=*/ '300'],
    DAI: ['Dai Stablecoin', 'DAI', '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', /*allocPoint=*/ '300'],
  },
})

export const USD_SIDEPOOL_TOKENS_MAP: ITokens<ITokensInfo> = injectForkNetwork<ITokensInfo>({
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

export const MOCK_TOKEN_MAP: PartialRecord<Network, TokenMap<IMockTokenInfo>> = injectForkNetwork<
  TokenMap<IMockTokenInfo>
>({
  bsc_testnet: {
    BUSD: {
      tokenName: 'Binance USD',
      tokenSymbol: 'BUSD',
      decimalForMockToken: 18,
    },
    TUSD: {
      tokenName: 'TrueUSD',
      tokenSymbol: 'TUSD',
      decimalForMockToken: 18,
    },
    FRAX: {
      tokenName: 'Frax',
      tokenSymbol: 'FRAX',
      decimalForMockToken: 18,
    },
    iUSD: {
      tokenName: 'iZUMi Bond USD',
      tokenSymbol: 'iUSD',
      decimalForMockToken: 18,
    },
    CUSD: {
      tokenName: 'Coin98 Dollar',
      tokenSymbol: 'CUSD',
      decimalForMockToken: 18,
    },
    HAY: {
      tokenName: 'Hay Destablecoin',
      tokenSymbol: 'HAY',
      decimalForMockToken: 18,
    },
    axlUSDC: {
      tokenName: 'Axelar Wrapped USDC',
      tokenSymbol: 'axlUSDC',
      decimalForMockToken: 6,
    },
    USDD: {
      tokenName: 'Decentralized USD',
      tokenSymbol: 'USDD',
      decimalForMockToken: 18,
    },
    USDC: {
      tokenName: 'USD Coin',
      tokenSymbol: 'USDC',
      decimalForMockToken: 18,
    },
    BOB: {
      tokenName: 'BOB',
      tokenSymbol: 'BOB',
      decimalForMockToken: 18,
    },
    WOM: {
      tokenName: 'Wombat Token',
      tokenSymbol: 'WOM',
      decimalForMockToken: 18,
    },
    wmxWOM: {
      tokenName: 'WMX WOM',
      tokenSymbol: 'wmxWOM',
      decimalForMockToken: 18,
    },
    mWOM: {
      tokenName: 'M WOM',
      tokenSymbol: 'mWOM',
      decimalForMockToken: 18,
    },
    qWOM: {
      tokenName: 'Quoll WOM',
      tokenSymbol: 'qWOM',
      decimalForMockToken: 18,
    },
  },
})

export const FACTORYPOOL_TOKENS_MAP: PartialRecord<Network, NetworkPoolInfo> = injectForkNetwork<NetworkPoolInfo>({
  [Network.BSC_MAINNET]: {
    stables_01: {
      BUSD: {
        tokenName: 'Binance USD',
        tokenSymbol: 'BUSD',
        underlyingTokenAddr: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        allocPoint: 5,
      },
      TUSD: {
        tokenName: 'TrueUSD',
        tokenSymbol: 'TUSD',
        underlyingTokenAddr: '0x14016e85a25aeb13065688cafb43044c2ef86784',
      },
      FRAX: {
        tokenName: 'Frax',
        tokenSymbol: 'FRAX',
        underlyingTokenAddr: '0x90C97F71E18723b0Cf0dfa30ee176Ab653E89F40',
      },
    },
    iUSD_Pool: {
      iUSD: {
        tokenName: 'iZUMi Bond USD',
        tokenSymbol: 'iUSD',
        underlyingTokenAddr: '0x0A3BB08b3a15A19b4De82F8AcFc862606FB69A2D',
      },
      BUSD: {
        tokenName: 'Binance USD',
        tokenSymbol: 'BUSD',
        underlyingTokenAddr: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      },
    },
    CUSD_Pool: {
      CUSD: {
        tokenName: 'Coin98 Dollar',
        tokenSymbol: 'CUSD',
        underlyingTokenAddr: '0xfa4ba88cf97e282c505bea095297786c16070129',
      },
      HAY: {
        tokenName: 'Hay Destablecoin',
        tokenSymbol: 'HAY',
        underlyingTokenAddr: '0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5',
      },
    },
    axlUSDC_Pool: {
      axlUSDC: {
        tokenName: 'Axelar Wrapped USDC',
        tokenSymbol: 'axlUSDC',
        underlyingTokenAddr: '0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3',
      },
      BUSD: {
        tokenName: 'Binance USD',
        tokenSymbol: 'BUSD',
        underlyingTokenAddr: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      },
    },
    USDD_Pool: {
      USDD: {
        tokenName: 'Decentralized USD',
        tokenSymbol: 'USDD',
        underlyingTokenAddr: '0xd17479997F34dd9156Deef8F95A52D81D265be9c',
      },
      USDC: {
        tokenName: 'USD Coin',
        tokenSymbol: 'USDC',
        underlyingTokenAddr: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
      },
    },
    BOB_Pool: {
      BOB: {
        tokenName: 'BOB',
        tokenSymbol: 'BOB',
        underlyingTokenAddr: '0xB0B195aEFA3650A6908f15CdaC7D92F8a5791B0B',
      },
      USDC: {
        tokenName: 'USD Coin',
        tokenSymbol: 'USDC',
        underlyingTokenAddr: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
      },
    },
    // Skim admin: 0xD9fCDFFEd5cA34Ef21661Ec6Fe3AEb742db6331e
    USDPlus_Pool: {
      'USD+': {
        tokenName: 'USD+',
        tokenSymbol: 'USD+',
        underlyingTokenAddr: '0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65',
        assetContractName: 'SkimmableAsset',
      },
      'USDT+': {
        tokenName: 'USDT+',
        tokenSymbol: 'USDT+',
        underlyingTokenAddr: '0x5335E87930b410b8C5BB4D43c3360ACa15ec0C8C',
        assetContractName: 'SkimmableAsset',
      },
      USDC: {
        tokenName: 'USD Coin',
        tokenSymbol: 'USDC',
        underlyingTokenAddr: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
      },
    },
  },
  [Network.BSC_TESTNET]: {
    stables_01: {
      BUSD: {
        tokenName: 'Binance USD',
        tokenSymbol: 'BUSD',
        useMockToken: true,
      },
      TUSD: {
        tokenName: 'TrueUSD',
        tokenSymbol: 'TUSD',
        useMockToken: true,
      },
      FRAX: {
        tokenName: 'Frax',
        tokenSymbol: 'FRAX',
        useMockToken: true,
      },
    },
    iUSD_Pool: {
      iUSD: {
        tokenName: 'iZUMi Bond USD',
        tokenSymbol: 'iUSD',
        useMockToken: true,
      },
      BUSD: {
        tokenName: 'Binance USD',
        tokenSymbol: 'BUSD',
        useMockToken: true,
      },
    },
    CUSD_Pool: {
      CUSD: {
        tokenName: 'Coin98 Dollar',
        tokenSymbol: 'CUSD',
        useMockToken: true,
      },
      HAY: {
        tokenName: 'Hay Destablecoin',
        tokenSymbol: 'HAY',
        useMockToken: true,
      },
    },
    axlUSDC_Pool: {
      axlUSDC: {
        tokenName: 'Axelar Wrapped USDC',
        tokenSymbol: 'axlUSDC',
        useMockToken: true,
      },
      BUSD: {
        tokenName: 'Binance USD',
        tokenSymbol: 'BUSD',
        useMockToken: true,
      },
    },
    USDD_Pool: {
      USDD: {
        tokenName: 'Decentralized USD',
        tokenSymbol: 'USDD',
        useMockToken: true,
      },
      USDC: {
        tokenName: 'USD Coin',
        tokenSymbol: 'USDC',
        useMockToken: true,
      },
    },
    BOB_Pool: {
      BOB: {
        tokenName: 'BOB',
        tokenSymbol: 'BOB',
        useMockToken: true,
      },
      USDC: {
        tokenName: 'USD Coin',
        tokenSymbol: 'USDC',
        useMockToken: true,
      },
    },
  },
  [Network.ARBITRUM_MAINNET]: {
    USDPlus_Pool: {
      'USD+': {
        tokenName: 'USD+',
        tokenSymbol: 'USD+',
        underlyingTokenAddr: '0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65',
        assetContractName: 'SkimmableAsset',
      },
      'DAI+': {
        tokenName: 'DAI+',
        tokenSymbol: 'DAI+',
        underlyingTokenAddr: '0xeb8E93A0c7504Bffd8A8fFa56CD754c63aAeBFe8',
        assetContractName: 'SkimmableAsset',
      },
      USDC: {
        tokenName: 'USD Coin',
        tokenSymbol: 'USDC',
        underlyingTokenAddr: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      },
    },
    MIM_Pool: {
      MIM: {
        tokenName: 'Magic Internet Money',
        tokenSymbol: 'MIM',
        underlyingTokenAddr: '0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A',
      },
      USDT: {
        tokenName: 'Tether USD',
        tokenSymbol: 'USDT',
        underlyingTokenAddr: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      },
    },
    FRAX_Pool: {
      FRAX: {
        tokenName: 'Frax',
        tokenSymbol: 'FRAX',
        underlyingTokenAddr: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
      },
      USDT: {
        tokenName: 'Tether USD',
        tokenSymbol: 'USDT',
        underlyingTokenAddr: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      },
    },
    BOB_Pool: {
      BOB: {
        tokenName: 'BOB',
        tokenSymbol: 'BOB',
        underlyingTokenAddr: '0xB0B195aEFA3650A6908f15CdaC7D92F8a5791B0B',
      },
      USDT: {
        tokenName: 'Tether USD',
        tokenSymbol: 'USDT',
        underlyingTokenAddr: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      },
    },
  },
})

// TODO: merge this config into `DYNAMICPOOL_TOKENS_MAP`
export const WOM_SIDEPOOL_TOKENS_MAP: PartialRecord<Network, NetworkPoolInfo> = injectForkNetwork<NetworkPoolInfo>({
  bsc_mainnet: {
    wmxWOMPool: {
      WOM: {
        tokenName: 'Wombat Token',
        tokenSymbol: 'WOM',
        underlyingTokenAddr: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1',
      },
      wmxWOM: {
        tokenName: 'Wombex WOM',
        tokenSymbol: 'wmxWOM',
        underlyingTokenAddr: '0x0415023846Ff1C6016c4d9621de12b24B2402979',
      },
    },
    mWOMPool: {
      WOM: {
        tokenName: 'Wombat Token',
        tokenSymbol: 'WOM',
        underlyingTokenAddr: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1',
      },
      mWOM: {
        tokenName: 'mWOM',
        tokenSymbol: 'mWOM',
        underlyingTokenAddr: '0x027a9d301FB747cd972CFB29A63f3BDA551DFc5c',
      },
    },
    qWOMPool: {
      WOM: {
        tokenName: 'Wombat Token',
        tokenSymbol: 'WOM',
        underlyingTokenAddr: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1',
      },
      qWOM: {
        tokenName: 'Quoll WOM',
        tokenSymbol: 'qWOM',
        underlyingTokenAddr: '0x0fE34B8aaAf3f522A6088E278936D10F934c0b19',
      },
    },
  },
  bsc_testnet: {
    wmxWOMPool: {
      WOM: {
        tokenName: 'Wombat Token',
        tokenSymbol: 'WOM',
        useMockToken: true,
      },
      wmxWOM: {
        tokenName: 'WMX WOM',
        tokenSymbol: 'wmxWOM',
        useMockToken: true,
      },
    },
    mWOMPool: {
      WOM: {
        tokenName: 'Wombat Token',
        tokenSymbol: 'WOM',
        useMockToken: true,
      },
      mWOM: {
        tokenName: 'M WOM',
        tokenSymbol: 'mWOM',
        useMockToken: true,
      },
    },
    qWOMPool: {
      WOM: {
        tokenName: 'Wombat Token',
        tokenSymbol: 'WOM',
        useMockToken: true,
      },
      qWOM: {
        tokenName: 'Quoll WOM',
        tokenSymbol: 'qWOM',
        useMockToken: true,
      },
    },
  },
})

export const DYNAMICPOOL_TOKENS_MAP: PartialRecord<Network, NetworkPoolInfo> = injectForkNetwork<NetworkPoolInfo>({
  bsc_mainnet: {
    frxETH_Pool: {
      sfrxETH: {
        tokenName: 'Staked Frax Ether',
        tokenSymbol: 'sfrxETH',
        underlyingTokenAddr: '0x3Cd55356433C89E50DC51aB07EE0fa0A95623D53',
        assetContractName: 'PriceFeedAsset',
        priceFeed: {
          priceFeedContract: 'GovernedPriceFeed',
          deployArgs: [
            '0x3Cd55356433C89E50DC51aB07EE0fa0A95623D53',
            parseEther('1.029'), // The initial value could be read from convertToAssets at https://etherscan.io/token/0xac3e018457b222d93114458476f3e3416abbe38f#readContract
            parseEther('0.01'),
          ],
        },
      },
      frxETH: {
        tokenName: 'Frax Ether',
        tokenSymbol: 'frxETH',
        underlyingTokenAddr: '0x64048a7eecf3a2f1ba9e144aac3d7db6e58f555e',
        assetContractName: 'DynamicAsset',
      },
      ETH: {
        tokenName: 'Binance-Peg Ethereum Token',
        tokenSymbol: 'ETH',
        underlyingTokenAddr: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
        assetContractName: 'DynamicAsset',
      },
    },
  },
})

// TODO: merge this config into `DYNAMICPOOL_TOKENS_MAP`
export const BNBX_POOL_TOKENS_MAP: ITokens<ITokensInfo> = injectForkNetwork<ITokensInfo>({
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

// TODO: merge this config into `DYNAMICPOOL_TOKENS_MAP`
export const STKBNB_POOL_TOKENS_MAP: ITokens<ITokensInfo> = injectForkNetwork<ITokensInfo>({
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

export const REWARDERS_MAP: PartialRecord<Network, TokenMap<IRewarder>> = injectForkNetwork<TokenMap<IRewarder>>({
  bsc_mainnet: {
    HAY: {
      lpToken: Address('0x1fa71DF4b344ffa5755726Ea7a9a56fbbEe0D38b'), // HAY-LP
      rewardToken: '0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5', // HAY
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: parseEther('0.005708'),
    },
    wmxWom: {
      lpToken: Address('0x3C42E4F84573aB8c88c8E479b7dC38A7e678D688'), // wmxWOM-LP
      rewardToken: '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD', // WMX
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: parseEther('0.027'),
    },
    wmxWOMPool_WOM: {
      lpToken: Address('0xF9BdC872D75f76B946E0770f96851b1f2F653caC'), // WOM-LP
      rewardToken: '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD', // WMX
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: parseEther('0.0116'),
    },
    mWOM: {
      lpToken: Address('0x1f502fF26dB12F8e41B373f36Dc0ABf2D7F6723E'), // mWOM-LP TBD
      rewardToken: '0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa', // MGP
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: parseEther('0.375'),
    },
    mWOMPool_WOM: {
      lpToken: Address('0xEABa290B154aF45DE72FDf2a40E56349e4E68AC2'), // mWOMPool_WOM-LP TBD
      rewardToken: '0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa', // MGP
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: parseEther('0.075'),
    },
    qWOM: {
      lpToken: Address('0x87073ba87517E7ca981AaE3636754bCA95C120E4'),
      rewardToken: '0x08b450e4a48C04CDF6DB2bD4cf24057f7B9563fF',
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: parseEther('0.13'),
    },
    qWOMPool_WOM: {
      lpToken: Address('0xB5c9368545A26b91d5f7340205e5d9559f48Bcf8'),
      rewardToken: '0x08b450e4a48C04CDF6DB2bD4cf24057f7B9563fF',
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: parseEther('0.1'),
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: Address('0x16B37225889A038FAD42efdED462821224A509A7'),
      rewardToken: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', // WOM
    },
    BnbxPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0x0321D1D769cc1e81Ba21a157992b635363740f86'),
      rewardToken: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', // WOM
    },
    stkBnb: {
      ...defaultRewarder(),
      lpToken: Address('0x0E202A0bCad2712d1fdeEB94Ec98C58bEeD0679f'),
      rewardToken: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', // WOM
    },
    StkBnbPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0x6C7B407411b3DB90DfA25DA4aA66605438D378CE'),
      rewardToken: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', // WOM
    },
    frxETH_Pool_ETH: {
      ...defaultRewarder(),
      lpToken: Address('0x4d41E9EDe1783b85756D3f5Bd136C50c4Fb8E67E'),
      rewardToken: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', // WOM
    },
  },
  bsc_testnet: {
    BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0xA1a8d6688A2DEF14d6bD3A76E3AA2bdB5670C567'),
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc',
      tokenPerSec: parseEther('0.1'),
    },
    USDC: {
      ...defaultRewarder(),
      lpToken: Address('0x61ABD791773a7E583aD439F558C6c0F157707e7b'),
      rewardToken: '0x615f8656b763ff4a6a82b3cbbd54d392834df13f',
      tokenPerSec: parseUnits('0.035', 8),
    },
    FRAX_BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x0d3dBc403d121eB53d14E2FE2a98e78CA3E17c44'),
      rewardToken: '0xa5c67cD016df71f9CDCfd9e76A749a1DDca6209d',
      tokenPerSec: parseUnits('0.035', 8),
    },
    FRAX: {
      ...defaultRewarder(),
      lpToken: Address('0xc5f2B1df25B9Bfc61444b002121330bEa9460F3e'),
      rewardToken: '0xa5c67cD016df71f9CDCfd9e76A749a1DDca6209d',
      tokenPerSec: parseUnits('0.035', 8),
    },
    wWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x505b0159871F86Ae0F4512BB52dB5030E31E2459'),
      rewardToken: '0x9bbc325eb7a7367be610bce614c91ef7f29c69dc',
      tokenPerSec: parseUnits('0.00035', 18),
    },
    qWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x22056C9F7e8033BBea9F32b903a0ECF8a7Ea0bC7'),
      rewardToken: '0x458c742849d041723efadd9a31153233de442b9b',
      tokenPerSec: parseUnits('0.09', 18),
    },
    qWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0x82e5314DfdA9aD1a7F594B7D0b5D6b13459f4826'),
      rewardToken: '0x458c742849d041723efadd9a31153233de442b9b',
      tokenPerSec: parseUnits('0.14', 18),
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: Address('0xB9207cc7bEaFb74773Cd08C869d6F6f890105564'),
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc', // RT1
    },
    BnbxPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0xC0aFB4E0f2A11E2a74F168904F47178865b728ba'),
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc', // RT1
    },
  },
})

// IBribe reuses the interface of IRewarder
export const BRIBE_MAPS: PartialRecord<Network, TokenMap<IRewarder>> = injectForkNetwork<TokenMap<IRewarder>>({
  bsc_mainnet: {
    HAY: {
      ...defaultRewarder(),
      lpToken: Address('0x1fa71DF4b344ffa5755726Ea7a9a56fbbEe0D38b'), // LP-HAY
      rewardToken: '0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5', // HAY
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: Address('0x16B37225889A038FAD42efdED462821224A509A7'), // LP-BNBx
      rewardToken: '0x3BC5AC0dFdC871B365d159f728dd1B9A0B5481E8', // SD
    },
    BnbxPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0x0321D1D769cc1e81Ba21a157992b635363740f86'), // LP-BnbxPool_WBNB pid: 16
      rewardToken: '0x3BC5AC0dFdC871B365d159f728dd1B9A0B5481E8', // SD
    },
    stkBnb: {
      ...defaultRewarder(),
      lpToken: Address('0x0E202A0bCad2712d1fdeEB94Ec98C58bEeD0679f'),
      rewardToken: '0x4C882ec256823eE773B25b414d36F92ef58a7c0C', // pSTAKE
    },
    StkBnbPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0x6C7B407411b3DB90DfA25DA4aA66605438D378CE'),
      rewardToken: '0x4C882ec256823eE773B25b414d36F92ef58a7c0C', // pSTAKE
    },
    wmxWom: {
      ...defaultRewarder(),
      lpToken: Address('0x3C42E4F84573aB8c88c8E479b7dC38A7e678D688'), // LP-wmxWOM pid:7
      rewardToken: '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD', // WMX
    },
    wmxWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xF9BdC872D75f76B946E0770f96851b1f2F653caC'), // LP-WOM pid:6
      rewardToken: '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD', // WMX
    },
    mWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x1f502fF26dB12F8e41B373f36Dc0ABf2D7F6723E'), // LP-mWOM pid:9
      rewardToken: '0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa', // MGP
    },
    mWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xEABa290B154aF45DE72FDf2a40E56349e4E68AC2'), // LP-mWOMPool_WOM pid:8
      rewardToken: '0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa', // MGP
    },
    qWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x87073ba87517E7ca981AaE3636754bCA95C120E4'), // LP-qWOM pid:11
      rewardToken: '0x08b450e4a48C04CDF6DB2bD4cf24057f7B9563fF', // QUO
    },
    qWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xB5c9368545A26b91d5f7340205e5d9559f48Bcf8'), // LP-qWOMPool_WOM pid:10
      rewardToken: '0x08b450e4a48C04CDF6DB2bD4cf24057f7B9563fF', // QUO
    },
    IUSDPool_iUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x3A29dF144bB54A8bF3d20357c116befa7adE962d'),
      rewardToken: '0x0A3BB08b3a15A19b4De82F8AcFc862606FB69A2D', // iUSD
    },
    IUSDPool_BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x7Ff1AEc17ea060BBcB7dF6b8723F6Ea7fc905E8F'),
      rewardToken: '0x0A3BB08b3a15A19b4De82F8AcFc862606FB69A2D', // iUSD
    },
    CUSDPool_CUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x3ac762C607ed6Dba156cBcF11efF96340e86b490'),
      rewardToken: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', // WOM
    },
    CUSDPool_HAY: {
      ...defaultRewarder(),
      lpToken: Address('0xa6eF6C45EbFDBc13f6D032fbDFeC9b389C1603E5'),
      rewardToken: '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1', // WOM
    },
    AxlUsdcPool_axlUSDC: {
      ...defaultRewarder(),
      lpToken: Address('0x77F645Ee0c6d47380A942B04B8151fD542927391'),
      rewardToken: '0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3', // axlUSDC
    },
    AxlUsdcPool_BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x791b2424df9865994Ad570425278902E2B5D7946'),
      rewardToken: '0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3', // axlUSDC
    },
    BOBPool_BOB: {
      ...defaultRewarder(),
      lpToken: Address('0x4968E21be7Bb0ced1bd3859d3dB993ad3a05d2E6'),
      rewardToken: '0xB0B195aEFA3650A6908f15CdaC7D92F8a5791B0B', // BOB
    },
    BOBPool_USDC: {
      ...defaultRewarder(),
      lpToken: Address('0x6b98d2B6ed0131338C7945Db8588DA43323d1b8C'),
      rewardToken: '0xB0B195aEFA3650A6908f15CdaC7D92F8a5791B0B', // BOB
    },
    frxETH: {
      ...defaultRewarder(),
      lpToken: Address('0xd67EdEA100AdC2Aa8ae0b5CEe7bF420ee17E5bB9'),
      rewardToken: '0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE', // FXS
    },
    frxETHPool_WETH: {
      ...defaultRewarder(),
      lpToken: Address('0xb268c3181921747379271B9BFfCE8B16311656e3'),
      rewardToken: '0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE', // FXS
    },
    frxETH_Pool_ETH: {
      ...defaultRewarder(),
      lpToken: Address('0x4d41E9EDe1783b85756D3f5Bd136C50c4Fb8E67E'),
      rewardToken: '0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE', // FXS
    },
    frax: {
      ...defaultRewarder(),
      lpToken: Address('0x47aB513f97e1CC7D7d1a4DB4563F1a0fa5C371EB'),
      rewardToken: '0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE', // FXS
    },
  },
  bsc_testnet: {
    BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0xA1a8d6688A2DEF14d6bD3A76E3AA2bdB5670C567'),
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc', // RT1
      tokenPerSec: parseEther('0.1'),
    },
    FRAX_BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x0d3dBc403d121eB53d14E2FE2a98e78CA3E17c44'),
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc', // RT1
      tokenPerSec: parseEther('0.1'),
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: Address('0xB9207cc7bEaFb74773Cd08C869d6F6f890105564'),
      rewardToken: '0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc', // RT1
    },
  },
  [Network.ARBITRUM_MAINNET]: {
    // TODO: update token addresses before deployment.
    USDPlus_Pool_USDPlus: {
      ...defaultRewarder(),
      lpToken: Deployment('Asset_USDPlus_Pool_USD+'),
      rewardToken: '0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96', // WOM
    },
    USDPlus_Pool_USDC: {
      ...defaultRewarder(),
      lpToken: Deployment('Asset_USDPlus_Pool_USDC'),
      rewardToken: '0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96', // WOM
    },
    MIM_Pool_MIM: {
      ...defaultRewarder(),
      lpToken: Deployment('Asset_MIM_Pool_MIM'),
      rewardToken: '0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96', // WOM
    },
    MIM_Pool_USDT: {
      ...defaultRewarder(),
      lpToken: Deployment('Asset_MIM_Pool_USDT'),
      rewardToken: '0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96', // WOM
    },
    FRAX_Pool_FRAX: {
      ...defaultRewarder(),
      lpToken: Deployment('Asset_FRAX_Pool_FRAX'),
      rewardToken: '0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96', // WOM
    },
    FRAX_Pool_USDT: {
      ...defaultRewarder(),
      lpToken: Deployment('Asset_FRAX_Pool_USDT'),
      rewardToken: '0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96', // WOM
    },
    BOB_Pool_BOB: {
      ...defaultRewarder(),
      lpToken: Deployment('Asset_BOB_Pool_BOB'),
      rewardToken: '0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96', // WOM
    },
    BOB_Pool_USDT: {
      ...defaultRewarder(),
      lpToken: Deployment('Asset_BOB_Pool_USDT'),
      rewardToken: '0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96', // WOM
    },
  },
})

export const WORMHOLE_CONFIG_MAPS: PartialRecord<Network, IWormholeConfig> = injectForkNetwork<IWormholeConfig>({
  [Network.BSC_TESTNET]: {
    relayer: '0xda2592C43f2e10cBBA101464326fb132eFD8cB09',
    wormholeBridge: '0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D',
    consistencyLevel: 15,
  },
  [Network.AVALANCHE_TESTNET]: {
    relayer: '0xDDe6b89B7d0AD383FafDe6477f0d300eC4d4033e',
    wormholeBridge: '0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C',
    consistencyLevel: 1,
  },
  [Network.LOCALHOST]: {
    relayer: '0x0000000000000000000000000000000000000000',
    wormholeBridge: '0x0000000000000000000000000000000000000000',
    consistencyLevel: 1,
  },
  [Network.HARDHAT]: {
    relayer: '0x0000000000000000000000000000000000000000',
    wormholeBridge: '0x0000000000000000000000000000000000000000',
    consistencyLevel: 1,
  },
})

export const CROSS_CHAIN_POOL_TOKENS_MAP: PartialRecord<Network, NetworkPoolInfo> = injectForkNetwork<NetworkPoolInfo>({
  [Network.BSC_TESTNET]: {
    stablecoinPool: {
      BUSD: {
        tokenName: 'Binance USD',
        tokenSymbol: 'BUSD',
        useMockToken: true,
      },
      vUSDC: { tokenName: 'Venus USDC', tokenSymbol: 'vUSDC', useMockToken: true },
    },
  },
  [Network.AVALANCHE_TESTNET]: {
    stablecoinPool: {
      BUSD: {
        tokenName: 'Binance USD',
        tokenSymbol: 'BUSD',
        useMockToken: true,
      },
      vUSDC: { tokenName: 'Venus USDC', tokenSymbol: 'vUSDC', useMockToken: true },
    },
  },
})

export const WORMHOLE_ADAPTOR_CONFIG_MAP: PartialRecord<
  Network,
  Record<PoolName, IWormholeAdaptorConfig>
> = injectForkNetwork<Record<PoolName, IWormholeAdaptorConfig>>({
  [Network.BSC_TESTNET]: {
    stablecoinPool: {
      adaptorAddr: '0xebD34D7d249686d7Cfb391dd18A220773e72feDb',
      tokens: ['0x326335BA4e70cb838Ee55dEB18027A6570E5144d', '0x9cc77B893d40861854fD90Abaf8414a5bD2bEcf8'], // BUSD, vUSDC
    },
  },
  [Network.AVALANCHE_TESTNET]: {
    stablecoinPool: {
      adaptorAddr: '0x0683e2c4d6e26274bd0574D09bfb8CE25e4dFA85',
      tokens: ['0x921ee0bdBB71065DCC15d201Cc99F63d71224b87', '0x8Cfa834ebBE803294020b08c521aA4637cB3dC1A'], // BUSD, vUSDC
    },
  },
})

/**
 * Helper Functions
 */

// Helper functions that upgrade objects to NetworkPoolInfo
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const networkInfoToNewFormat = (networkInfo: Record<string, Record<string, ITokensInfo>>): NetworkPoolInfo => {
  const result: NetworkPoolInfo = {}
  for (const [poolName, poolInfo] of Object.entries(networkInfo)) {
    result[poolName] = poolInfoToNewFormat(poolInfo)
  }
  return result
}

const poolInfoToNewFormat = (poolInfo: Record<string, ITokensInfo>): PoolInfo => {
  const result: Record<TokenSymbol, IAssetInfo> = {}
  for (const [pool, tokenInfo] of Object.entries(poolInfo)) {
    result[pool] = tokensInfoToAssetInfo(tokenInfo)
  }
  return result
}

const tokensInfoToAssetInfo = (tokenInfo: ITokensInfo): IAssetInfo => {
  if (
    typeof tokenInfo[0] !== 'string' ||
    typeof tokenInfo[1] !== 'string' ||
    typeof tokenInfo[2] !== 'string' ||
    typeof tokenInfo[3] !== 'number' ||
    (tokenInfo[4] && typeof tokenInfo[4] !== 'string')
  ) {
    throw 'invalid token info'
  }
  return {
    tokenName: tokenInfo[0],
    tokenSymbol: tokenInfo[1],
    underlyingTokenAddr: tokenInfo[2],
    allocPoint: tokenInfo[3] ? tokenInfo[3] : undefined,
    assetContractName: tokenInfo[4],
  }
}
