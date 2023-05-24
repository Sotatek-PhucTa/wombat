import { BigNumber } from 'ethers'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import {
  Address,
  Deployment,
  IGovernedPriceFeed,
  IHighCovRatioFeePoolConfig,
  IMockTokenInfo,
  IRewarder,
  IWormholeAdaptorConfig,
  IWormholeConfig,
  Network,
  NetworkPoolInfo,
  PartialRecord,
  PoolName,
  TokenMap,
  Unknown,
} from '../types'
import {
  AnkrBnbAsset,
  AnkrEthAsset,
  AxlUsdcAsset,
  BnbxAsset,
  BnbyAsset,
  BobAsset,
  BtcAsset,
  BusdAsset,
  CusdAsset,
  DaiAsset,
  DaiPlusAsset,
  EthAsset,
  FraxAsset,
  FrxEthAsset,
  HayAsset,
  IusdAsset,
  JusdcAsset,
  MaiAsset,
  MimAsset,
  MwomAsset,
  QwomAsset,
  SfrxEthAsset,
  StkBnbAsset,
  TusdAsset,
  UsdPlusAsset,
  UsdcAsset,
  UsddAsset,
  UsdtAsset,
  UsdtPlusAsset,
  VusdcAsset,
  WbethAsset,
  WbnbAsset,
  WethAsset,
  WmxWomAsset,
  WomAsset,
} from './assets.config'
import { ExternalContract } from './contract'
import { convertTokenPerEpochToTokenPerSec } from './emission'
import { Epochs } from './epoch'
import { Token } from './token'

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
  [Network.OPTIMISM_MAINNET]: '0x4200000000000000000000000000000000000006',
  [Network.OPTIMISM_TESTNET]: ethers.constants.AddressZero,
  [Network.ETHEREUM_MAINNET]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
}) as Record<Network, string>

function defaultRewarder(): IRewarder {
  return {
    lpToken: Unknown(),
    secondsToStart: 60,
    // Use empty reward token here as we expect config to override it.
    rewardTokens: [],
    tokenPerSec: [0],
  }
}

function defaultGovernedPriceFeed(): IGovernedPriceFeed {
  return {
    contract: 'GovernedPriceFeed',
    token: Token.UNKNOWN,
    initialPrice: 0,
    maxDeviation: 0,
  }
}

function sfrxETHGovernedPriceFeed(): IGovernedPriceFeed {
  return {
    ...defaultGovernedPriceFeed(),
    token: Token.sfrxETH,
    // initial price. See pricePerShare() at https://monobase.xyz/address/0xac3E018457B222d93114458476f3E3416Abbe38F#call
    initialPrice: parseEther('1.0342029648225833'),
    maxDeviation: parseEther('0.01'),
  }
}

const oneBips = parseEther('0.0001')
const twentyBips = oneBips.mul(20)
const defaultMainPoolConfig: IHighCovRatioFeePoolConfig = {
  ampFactor: parseEther('0.00025'),
  haircut: oneBips,
  mintFeeThreshold: parseEther('10'),
  startCovRatio: parseEther('5'),
  endCovRatio: parseEther('10'),
  lpDividendRatio: parseEther('0.5'),
  retentionRatio: parseEther('0.5'),
  deploymentNamePrefix: '',
  supportNativeToken: false,
}

const defaultFactoryPoolConfig: IHighCovRatioFeePoolConfig = {
  ampFactor: parseEther('0.00125'),
  haircut: oneBips,
  mintFeeThreshold: parseEther('10'),
  startCovRatio: parseEther('1.5'),
  endCovRatio: parseEther('1.8'),
  lpDividendRatio: parseEther('0.5'),
  retentionRatio: parseEther('0.5'),
  deploymentNamePrefix: 'FactoryPools',
  supportNativeToken: false,
}

const defaultWomPoolConfig: IHighCovRatioFeePoolConfig = {
  ...defaultFactoryPoolConfig,
  ampFactor: parseEther('0.1'),
  haircut: oneBips.mul(20),
  mintFeeThreshold: parseEther('55.5555555556'),
  deploymentNamePrefix: 'WomSidePools',
  startCovRatio: parseEther('2'),
  endCovRatio: parseEther('2.5'),
}

const defaultDynamicPoolConfig: IHighCovRatioFeePoolConfig = {
  ...defaultFactoryPoolConfig,
  ampFactor: parseEther('0.002'),
  haircut: oneBips,
  mintFeeThreshold: parseEther('0.01'),
  deploymentNamePrefix: 'DynamicPools',
}

const defaultVolatilePoolConfig: IHighCovRatioFeePoolConfig = {
  ...defaultFactoryPoolConfig,
  ampFactor: parseEther('0.1'),
  haircut: twentyBips,
  mintFeeThreshold: parseEther('10'),
  deploymentNamePrefix: 'VolatilePools',
}

const defaultCrossChainPoolConfig: IHighCovRatioFeePoolConfig = {
  ampFactor: parseEther('0.00025'),
  haircut: parseEther('0.0001'),
  mintFeeThreshold: parseEther('10'),
  startCovRatio: parseEther('1.5'),
  endCovRatio: parseEther('1.8'),
  lpDividendRatio: parseEther('0.5'),
  retentionRatio: parseEther('0.5'),
  deploymentNamePrefix: 'CrossChainPool',
  supportNativeToken: false,
}

// inject forkNetwork to hardhat and localhost
export function injectForkNetwork<T>(config: PartialRecord<Network, T>): PartialRecord<Network, T> {
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

export const MOCK_TOKEN_MAP: PartialRecord<Network, TokenMap<IMockTokenInfo>> = injectForkNetwork<
  TokenMap<IMockTokenInfo>
>({
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
})

export const FACTORYPOOL_TOKENS_MAP: PartialRecord<
  Network,
  NetworkPoolInfo<IHighCovRatioFeePoolConfig>
> = injectForkNetwork<NetworkPoolInfo<IHighCovRatioFeePoolConfig>>({
  [Network.BSC_MAINNET]: {
    MainPool: {
      setting: {
        ...defaultMainPoolConfig,
      },
      assets: {
        ...BusdAsset(),
        ...UsdtAsset(),
        ...UsdcAsset(),
        ...DaiAsset(),
      },
    },
    stables_01: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
        ...BusdAsset({ allocPoint: 5 }),
        ...TusdAsset(),
        ...FraxAsset(),
      },
    },
    SidePool_01: {
      setting: {
        ...defaultFactoryPoolConfig,
        deploymentNamePrefix: '',
      },
      assets: {
        ...BusdAsset({ allocPoint: 10 }),
        ...HayAsset(),
      },
    },
    HAY_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        deploymentNamePrefix: '',
      },
      assets: {
        ...HayAsset(),
        ...UsdcAsset(),
        ...UsdtAsset(),
      },
    },
    iUSD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        mintFeeThreshold: parseEther('0.25'),
      },
      assets: {
        ...IusdAsset(),
        ...BusdAsset(),
      },
    },
    axlUSDC_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        mintFeeThreshold: parseEther('1'),
      },
      assets: {
        ...AxlUsdcAsset(),
        ...BusdAsset(),
      },
    },
    USDD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        mintFeeThreshold: parseEther('0.02'),
      },
      assets: {
        ...UsddAsset(),
        ...UsdcAsset(),
      },
    },
    BOB_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        mintFeeThreshold: parseEther('0.2'),
      },
      assets: {
        ...BobAsset(),
        ...UsdcAsset(),
      },
    },
    Mixed_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        mintFeeThreshold: parseEther('10'),
        retentionRatio: BigNumber.from(0),
      },
      assets: {
        ...UsdPlusAsset(),
        ...UsdtPlusAsset(),
        ...UsdcAsset(),
        ...CusdAsset(),
        ...HayAsset(),
        ...FraxAsset(),
      },
    },
    MIM_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
        ...MimAsset(),
        ...UsdtAsset(),
      },
    },
    wmxWOMPool: {
      setting: {
        ...defaultWomPoolConfig,
        haircut: parseEther('0.0001'),
      },
      assets: {
        ...WomAsset(),
        ...WmxWomAsset(),
      },
    },
    mWOMPool: {
      setting: {
        ...defaultWomPoolConfig,
        haircut: parseEther('0.0001'),
      },
      assets: {
        ...WomAsset(),
        ...MwomAsset(),
      },
    },
    qWOMPool: {
      setting: {
        ...defaultWomPoolConfig,
        haircut: parseEther('0.0001'),
      },
      assets: {
        ...WomAsset(),
        ...QwomAsset(),
      },
    },
    StandalonePool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {},
    },
  },
  [Network.BSC_TESTNET]: {
    stables_01: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
        ...BusdAsset(),
        ...TusdAsset(),
        ...FraxAsset(),
      },
    },
    SidePool_01: {
      setting: {
        ...defaultFactoryPoolConfig,
        deploymentNamePrefix: '',
      },
      assets: {
        ...BusdAsset({ allocPoint: 10 }),
        ...TusdAsset(),
        ...FraxAsset(),
        ...MimAsset(),
        ...HayAsset(),
      },
    },
    iUSD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
        ...IusdAsset(),
        ...BusdAsset(),
      },
    },
    CUSD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
        ...CusdAsset(),
        ...HayAsset(),
      },
    },
    axlUSDC_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
        ...AxlUsdcAsset(),
        ...BusdAsset(),
      },
    },
    USDD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
        ...UsddAsset(),
        ...UsdcAsset(),
      },
    },
    BOB_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
        ...BobAsset(),
        ...UsdcAsset(),
      },
    },
    wmxWOMPool: {
      setting: {
        ...defaultWomPoolConfig,
      },
      assets: {
        ...WomAsset(),
        ...WmxWomAsset(),
      },
    },
    mWOMPool: {
      setting: {
        ...defaultWomPoolConfig,
      },
      assets: {
        ...WomAsset(),
        ...MwomAsset(),
      },
    },
    qWOMPool: {
      setting: {
        ...defaultWomPoolConfig,
      },
      assets: {
        ...WomAsset(),
        ...QwomAsset(),
      },
    },
  },
  [Network.ARBITRUM_MAINNET]: {
    MainPool: {
      setting: {
        ...defaultMainPoolConfig,
      },
      assets: {
        ...UsdtAsset(),
        ...UsdcAsset(),
        ...DaiAsset(),
      },
    },
    USDPlus_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        retentionRatio: BigNumber.from(0),
      },
      assets: {
        ...UsdPlusAsset(),
        ...DaiPlusAsset(),
        ...UsdcAsset(),
      },
    },
    MIM_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        startCovRatio: parseEther('5'),
        endCovRatio: parseEther('10'),
      },
      assets: {
        ...MimAsset(),
        ...UsdtAsset(),
      },
    },
    FRAX_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        retentionRatio: BigNumber.from(0),
      },
      assets: {
        ...FraxAsset(),
        ...MaiAsset(),
        ...UsdPlusAsset(),
        ...UsdcAsset(),
      },
    },
    BOB_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
        ...BobAsset(),
        ...UsdcAsset(),
      },
    },
    mWOM_Pool: {
      setting: {
        ...defaultWomPoolConfig,
        startCovRatio: parseEther('1.5'),
        endCovRatio: parseEther('1.8'),
      },
      assets: {
        ...MwomAsset(),
        ...WomAsset(),
      },
    },
    wmxWOM_Pool: {
      setting: {
        ...defaultWomPoolConfig,
        startCovRatio: parseEther('1.5'),
        endCovRatio: parseEther('1.8'),
      },
      assets: {
        ...WmxWomAsset(),
        ...WomAsset(),
      },
    },
    qWOM_Pool: {
      setting: {
        ...defaultWomPoolConfig,
        startCovRatio: parseEther('1.5'),
        endCovRatio: parseEther('1.8'),
      },
      assets: {
        ...QwomAsset(),
        ...WomAsset(),
      },
    },
  },
  [Network.OPTIMISM_MAINNET]: {
    Main_Pool: {
      setting: {
        ...defaultMainPoolConfig,
      },
      assets: {
        ...UsdcAsset({ maxSupply: parseUnits('1000000', 6) }),
        ...UsdtAsset({ maxSupply: parseUnits('1000000', 6) }),
      },
    },
  },
  [Network.ETHEREUM_MAINNET]: {
    Main_Pool: {
      setting: {
        ...defaultMainPoolConfig,
      },
      assets: {
        ...UsdcAsset({ maxSupply: parseUnits('1000000', 6) }),
        ...UsdtAsset({ maxSupply: parseUnits('1000000', 6) }),
      },
    },
  },
  [Network.BSC_TESTNET]: {
    MainPool: {
      setting: {
        ...defaultMainPoolConfig,
      },
      assets: {
        ...BusdAsset(),
        ...UsdtAsset(),
        ...UsdcAsset(),
        ...DaiAsset(),
        ...TusdAsset(),
        ...VusdcAsset(),
      },
    },
  },
  [Network.HARDHAT]: {
    MainPool: {
      setting: {
        ...defaultMainPoolConfig,
      },
      assets: {
        ...BusdAsset(),
        ...UsdtAsset(),
        ...UsdcAsset(),
        ...DaiAsset(),
        ...TusdAsset(),
        ...VusdcAsset(),
      },
    },
  },
})

export const DYNAMICPOOL_TOKENS_MAP: PartialRecord<
  Network,
  NetworkPoolInfo<IHighCovRatioFeePoolConfig>
> = injectForkNetwork<NetworkPoolInfo<IHighCovRatioFeePoolConfig>>({
  [Network.BSC_MAINNET]: {
    wBETH_Pool: {
      setting: {
        ...defaultDynamicPoolConfig,
        haircut: parseEther('0.0001'),
      },
      assets: {
        ...WbethAsset({ maxSupply: parseEther('1600') }),
        ...EthAsset({ maxSupply: parseEther('1600') }),
      },
    },
    frxETH_Pool: {
      setting: {
        ...defaultDynamicPoolConfig,
        haircut: parseEther('0.0001'),
      },
      assets: {
        ...SfrxEthAsset({
          priceFeed: sfrxETHGovernedPriceFeed(),
          maxSupply: parseEther('1600'),
        }),
        ...FrxEthAsset(),
        ...EthAsset(),
      },
    },
    ankrETH_Pool: {
      setting: {
        ...defaultDynamicPoolConfig,
        haircut: parseEther('0.0001'),
      },
      assets: {
        ...AnkrEthAsset({ maxSupply: parseEther('1600') }),
        ...EthAsset({ maxSupply: parseEther('1600') }),
      },
    },
    BnbxPool: {
      setting: {
        ...defaultDynamicPoolConfig,
        haircut: parseEther('0.0001'),
        mintFeeThreshold: parseEther('0.00666666666'),
        deploymentNamePrefix: '',
        supportNativeToken: true,
      },
      assets: {
        ...WbnbAsset(),
        ...BnbxAsset(),
      },
    },
    StkBnbPool: {
      setting: {
        ...defaultDynamicPoolConfig,
        haircut: parseEther('0.0001'),
        mintFeeThreshold: parseEther('0.00333333333'),
        deploymentNamePrefix: '',
        supportNativeToken: true,
      },
      assets: {
        ...WbnbAsset(),
        ...StkBnbAsset(),
      },
    },
    AnkrBNBPool: {
      setting: {
        ...defaultDynamicPoolConfig,
        haircut: parseEther('0.0001'),
        mintFeeThreshold: parseEther('0.03'),
        deploymentNamePrefix: '',
        supportNativeToken: true,
      },
      assets: {
        ...WbnbAsset(),
        ...AnkrBnbAsset(),
      },
    },
    BNBy_Pool: {
      setting: {
        ...defaultDynamicPoolConfig,
        haircut: parseEther('0.0001'),
        mintFeeThreshold: parseEther('0.03'),
        deploymentNamePrefix: '',
        supportNativeToken: true,
      },
      assets: {
        ...WbnbAsset({ maxSupply: parseEther('10000') }),
        ...BnbyAsset({ maxSupply: parseEther('10000') }),
      },
    },
  },
  [Network.ARBITRUM_MAINNET]: {
    jUSDC_Pool: {
      setting: {
        ...defaultDynamicPoolConfig,
        haircut: parseEther('0.0001'),
        ampFactor: parseEther('0.0025'),
        mintFeeThreshold: parseEther('10'),
      },
      assets: {
        ...JusdcAsset({
          maxSupply: parseEther('10000000'),
        }),
        ...UsdcAsset({
          tokenName: 'USD Coin (Arb1)',
          assetContractName: 'DynamicAsset',
          maxSupply: parseEther('10000000'),
        }),
      },
    },
    frxETH_Pool: {
      setting: {
        ...defaultDynamicPoolConfig,
        supportNativeToken: true,
      },
      assets: {
        ...FrxEthAsset(),
        ...WethAsset(),
        ...SfrxEthAsset({
          priceFeed: sfrxETHGovernedPriceFeed(),
          maxSupply: parseEther('1600'),
        }),
      },
    },
    ankrETH_Pool: {
      setting: {
        ...defaultDynamicPoolConfig,
        haircut: parseEther('0.0001'),
        supportNativeToken: true,
      },
      assets: {
        ...AnkrEthAsset({ maxSupply: parseEther('1600') }),
        ...WethAsset({ maxSupply: parseEther('1600') }),
      },
    },
  },
})

export const VOLATILEPOOL_TOKENS_MAP: PartialRecord<
  Network,
  NetworkPoolInfo<IHighCovRatioFeePoolConfig>
> = injectForkNetwork<NetworkPoolInfo<IHighCovRatioFeePoolConfig>>({
  [Network.BSC_TESTNET]: {
    'BUSD-ETH-BTC_Pool': {
      // pool with chainlink price feed
      setting: {
        ...defaultVolatilePoolConfig,
      },
      assets: {
        ...BusdAsset({
          assetContractName: 'PriceFeedAsset',
          priceFeed: {
            contract: 'ChainlinkPriceFeed',
          },
          maxSupply: parseEther('1000000'),
        }),
        ...EthAsset({
          assetContractName: 'PriceFeedAsset',
          priceFeed: {
            contract: 'ChainlinkPriceFeed',
          },
          maxSupply: parseEther('1600'),
        }),
        ...BtcAsset({
          assetContractName: 'PriceFeedAsset',
          priceFeed: {
            contract: 'ChainlinkPriceFeed',
          },
          maxSupply: parseEther('500'),
        }),
      },
    },

    // 'USDT-ETH-WBNB_Pool': {
    //   // pool with pyth price feed
    //   setting: {
    //     ...defaultVolatilePoolConfig,
    //   },
    //   assets: {
    //     USDT: {
    //       tokenName: 'Tether USD',
    //       tokenSymbol: 'USDT',
    //       underlyingToken: Token.USDT,
    //       assetContractName: 'PriceFeedAsset',
    //       priceFeed: {
    //         contract: 'PythPriceFeed',
    //       },
    //       maxSupply: parseEther('1000000'),
    //     },
    //     ETH: {
    //       tokenName: 'Binance-Peg Ethereum Token',
    //       tokenSymbol: 'ETH',
    //       underlyingToken: Token.ETH,
    //       assetContractName: 'PriceFeedAsset',
    //       priceFeed: {
    //         contract: 'PythPriceFeed',
    //       },
    //       maxSupply: parseEther('1600'),
    //     },
    //     WBNB: {
    //       tokenName: 'Wrapped BNB',
    //       tokenSymbol: 'WBNB',
    //       underlyingToken: Token.WBNB,
    //       assetContractName: 'PriceFeedAsset',
    //       priceFeed: {
    //         contract: 'PythPriceFeed',
    //       },
    //       maxSupply: parseEther('10000'),
    //     },
    //   },
    // },
  },
})

export const REWARDERS_MAP: PartialRecord<Network, TokenMap<IRewarder>> = injectForkNetwork<TokenMap<IRewarder>>({
  [Network.HARDHAT]: {
    ...createBribeConfigFromDeployedAsset('Asset_MainPool_BUSD', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [parseEther('100')],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_MainPool_USDT', {
      rewardTokens: [Token.USDT, Token.WOM],
      tokenPerSec: [parseEther('12.3'), parseEther('100')],
    }),
  },
  [Network.BSC_MAINNET]: {
    HAY: {
      ...defaultRewarder(),
      lpToken: Address('0x1fa71DF4b344ffa5755726Ea7a9a56fbbEe0D38b'), // HAY-LP
      rewardTokens: [Token.HAY],
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: [parseEther('0.005708').toBigInt()],
    },
    wmxWom: {
      ...defaultRewarder(),
      lpToken: Address('0x3C42E4F84573aB8c88c8E479b7dC38A7e678D688'), // wmxWOM-LP
      rewardTokens: [Token.WMX],
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: [parseEther('0.027').toBigInt()],
    },
    wmxWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xF9BdC872D75f76B946E0770f96851b1f2F653caC'), // WOM-LP
      rewardTokens: [Token.WMX],
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: [parseEther('0.0116').toBigInt()],
    },
    mWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x1f502fF26dB12F8e41B373f36Dc0ABf2D7F6723E'), // mWOM-LP TBD
      rewardTokens: [Token.MGP],
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: [parseEther('0.375').toBigInt()],
    },
    mWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xEABa290B154aF45DE72FDf2a40E56349e4E68AC2'), // mWOMPool_WOM-LP TBD
      rewardTokens: [Token.MGP],
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: [parseEther('0.075').toBigInt()],
    },
    qWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x87073ba87517E7ca981AaE3636754bCA95C120E4'),
      rewardTokens: [Token.QUO],
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: [parseEther('0.13').toBigInt()],
    },
    qWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xB5c9368545A26b91d5f7340205e5d9559f48Bcf8'),
      rewardTokens: [Token.QUO],
      startTimestamp: 1674021600, // 01/18/2023 2pm HKT
      tokenPerSec: [parseEther('0.1').toBigInt()],
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: Address('0x16B37225889A038FAD42efdED462821224A509A7'),
      rewardTokens: [Token.WOM],
    },
    BnbxPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0x0321D1D769cc1e81Ba21a157992b635363740f86'),
      rewardTokens: [Token.WOM],
    },
    stkBnb: {
      ...defaultRewarder(),
      lpToken: Address('0x0E202A0bCad2712d1fdeEB94Ec98C58bEeD0679f'),
      rewardTokens: [Token.WOM],
    },
    StkBnbPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0x6C7B407411b3DB90DfA25DA4aA66605438D378CE'),
      rewardTokens: [Token.WOM],
    },
    frxETH_Pool_ETH: {
      ...defaultRewarder(),
      lpToken: Address('0x4d41E9EDe1783b85756D3f5Bd136C50c4Fb8E67E'),
      rewardTokens: [Token.WOM],
    },
    ...createBribeConfigFromDeployedAsset('Asset_frxETH_Pool_frxETH', {
      rewardTokens: [Token.WOM],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_frxETH_Pool_sfrxETH', {
      rewardTokens: [Token.WOM],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_Mixed_Pool_FRAX', {
      rewardTokens: [Token.WOM],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_qWOMPool_WOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.QUO],
      operator: ExternalContract.QuollBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_qWOMPool_qWOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.QUO],
      operator: ExternalContract.QuollBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_mWOMPool_WOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.MGP],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_mWOMPool_mWOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.MGP],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_wmxWOMPool_WOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.WMX],
      operator: ExternalContract.WombexBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_wmxWOMPool_wmxWom', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.WMX],
      operator: ExternalContract.WombexBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_wBETH_Pool_wBETH', {
      rewardTokens: [Token.WOM],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_wBETH_Pool_ETH', {
      rewardTokens: [Token.WOM],
    }),
  },
  [Network.BSC_TESTNET]: {
    BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0xA1a8d6688A2DEF14d6bD3A76E3AA2bdB5670C567'),
      rewardTokens: [Token.RT1],
      tokenPerSec: [parseEther('0.1').toBigInt()],
    },
    USDC: {
      ...defaultRewarder(),
      lpToken: Address('0x61ABD791773a7E583aD439F558C6c0F157707e7b'),
      rewardTokens: [Token.RT2],
      tokenPerSec: [parseUnits('0.035', 8).toBigInt()],
    },
    FRAX_BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x0d3dBc403d121eB53d14E2FE2a98e78CA3E17c44'),
      rewardTokens: [Token.testFRAX],
      tokenPerSec: [parseUnits('0.035', 8).toBigInt()],
    },
    FRAX: {
      ...defaultRewarder(),
      lpToken: Address('0xc5f2B1df25B9Bfc61444b002121330bEa9460F3e'),
      rewardTokens: [Token.testFRAX],
      tokenPerSec: [parseUnits('0.035', 8).toBigInt()],
    },
    wWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x505b0159871F86Ae0F4512BB52dB5030E31E2459'),
      rewardTokens: [Token.RT1],
      tokenPerSec: [parseUnits('0.00035', 18).toBigInt()],
    },
    qWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x22056C9F7e8033BBea9F32b903a0ECF8a7Ea0bC7'),
      rewardTokens: [Token.QUO],
      tokenPerSec: [parseUnits('0.09', 18).toBigInt()],
    },
    qWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0x82e5314DfdA9aD1a7F594B7D0b5D6b13459f4826'),
      rewardTokens: [Token.QUO],
      tokenPerSec: [parseUnits('0.14', 18).toBigInt()],
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: Address('0xB9207cc7bEaFb74773Cd08C869d6F6f890105564'),
      rewardTokens: [Token.RT1],
    },
    BnbxPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0xC0aFB4E0f2A11E2a74F168904F47178865b728ba'),
      rewardTokens: [Token.RT1],
    },
  },
  [Network.ARBITRUM_MAINNET]: {
    ...createBribeConfigFromDeployedAsset('Asset_FRAX_Pool_USDC', {
      rewardTokens: [Token.WOM],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_USDPlus_Pool_USDC', {
      rewardTokens: [Token.WOM],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_qWOM_Pool_WOM', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.QUO],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('40000'))],
      operator: ExternalContract.QuollBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_qWOM_Pool_qWOM', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.QUO],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('60000'))],
      operator: ExternalContract.QuollBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_mWOM_Pool_WOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.MGP],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_mWOM_Pool_mWOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.MGP],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_wmxWOM_Pool_WOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.WMX],
      operator: ExternalContract.WombexBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_wmxWOM_Pool_wmxWOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.WMX],
      operator: ExternalContract.WombexBribeOperator,
    }),
  },
})

// IBribe reuses the interface of IRewarder
export const BRIBE_MAPS: PartialRecord<Network, TokenMap<IRewarder>> = injectForkNetwork<TokenMap<IRewarder>>({
  [Network.HARDHAT]: {
    ...createBribeConfigFromDeployedAsset('Asset_MainPool_BUSD', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [parseEther('100')],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_MainPool_USDT', {
      rewardTokens: [Token.USDT, Token.BUSD, Token.WOM],
      tokenPerSec: [parseEther('12.3'), parseEther('3.45'), parseEther('100')],
    }),
  },
  [Network.BSC_MAINNET]: {
    HAY: {
      ...defaultRewarder(),
      lpToken: Address('0x1fa71DF4b344ffa5755726Ea7a9a56fbbEe0D38b'), // LP-HAY
      rewardTokens: [Token.HAY],
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: Address('0x16B37225889A038FAD42efdED462821224A509A7'), // LP-BNBx
      rewardTokens: [Token.SD],
    },
    BnbxPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0x0321D1D769cc1e81Ba21a157992b635363740f86'), // LP-BnbxPool_WBNB pid: 16
      rewardTokens: [Token.SD],
    },
    stkBnb: {
      ...defaultRewarder(),
      lpToken: Address('0x0E202A0bCad2712d1fdeEB94Ec98C58bEeD0679f'),
      rewardTokens: [Token.PSTAKE],
    },
    StkBnbPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0x6C7B407411b3DB90DfA25DA4aA66605438D378CE'),
      rewardTokens: [Token.PSTAKE],
    },
    wmxWom: {
      ...defaultRewarder(),
      lpToken: Address('0x3C42E4F84573aB8c88c8E479b7dC38A7e678D688'), // LP-wmxWOM pid:7
      rewardTokens: [Token.WMX],
    },
    wmxWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xF9BdC872D75f76B946E0770f96851b1f2F653caC'), // LP-WOM pid:6
      rewardTokens: [Token.WMX],
    },
    mWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x1f502fF26dB12F8e41B373f36Dc0ABf2D7F6723E'), // LP-mWOM pid:9
      rewardTokens: [Token.MGP],
    },
    mWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xEABa290B154aF45DE72FDf2a40E56349e4E68AC2'), // LP-mWOMPool_WOM pid:8
      rewardTokens: [Token.MGP],
    },
    qWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x87073ba87517E7ca981AaE3636754bCA95C120E4'), // LP-qWOM pid:11
      rewardTokens: [Token.QUO],
    },
    qWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xB5c9368545A26b91d5f7340205e5d9559f48Bcf8'), // LP-qWOMPool_WOM pid:10
      rewardTokens: [Token.QUO],
    },
    IUSDPool_iUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x3A29dF144bB54A8bF3d20357c116befa7adE962d'),
      rewardTokens: [Token.iUSD],
    },
    IUSDPool_BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x7Ff1AEc17ea060BBcB7dF6b8723F6Ea7fc905E8F'),
      rewardTokens: [Token.iUSD],
    },
    AxlUsdcPool_axlUSDC: {
      ...defaultRewarder(),
      lpToken: Address('0x77F645Ee0c6d47380A942B04B8151fD542927391'),
      rewardTokens: [Token.axlUSDC],
    },
    AxlUsdcPool_BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x791b2424df9865994Ad570425278902E2B5D7946'),
      rewardTokens: [Token.axlUSDC],
    },
    BOBPool_BOB: {
      ...defaultRewarder(),
      lpToken: Address('0x4968E21be7Bb0ced1bd3859d3dB993ad3a05d2E6'),
      rewardTokens: [Token.BOB],
    },
    BOBPool_USDC: {
      ...defaultRewarder(),
      lpToken: Address('0x6b98d2B6ed0131338C7945Db8588DA43323d1b8C'),
      rewardTokens: [Token.BOB],
    },
    frxETH: {
      ...defaultRewarder(),
      lpToken: Address('0xd67EdEA100AdC2Aa8ae0b5CEe7bF420ee17E5bB9'),
      rewardTokens: [Token.FXS],
    },
    frxETHPool_WETH: {
      ...defaultRewarder(),
      lpToken: Address('0xb268c3181921747379271B9BFfCE8B16311656e3'),
      rewardTokens: [Token.FXS],
    },
    frxETH_Pool_ETH: {
      ...defaultRewarder(),
      lpToken: Address('0x4d41E9EDe1783b85756D3f5Bd136C50c4Fb8E67E'),
      rewardTokens: [Token.FXS],
    },
    frax: {
      ...defaultRewarder(),
      lpToken: Address('0x47aB513f97e1CC7D7d1a4DB4563F1a0fa5C371EB'),
      rewardTokens: [Token.FXS],
    },
    ...createBribeConfigFromDeployedAsset('Asset_MIM_Pool_MIM', {
      rewardTokens: [Token.SPELL],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_MIM_Pool_USDT', {
      rewardTokens: [Token.SPELL],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_Mixed_Pool_USD+', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseUnits('600', 6))],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_Mixed_Pool_USDT+', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseUnits('600', 6))],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_Mixed_Pool_USDC', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseUnits('300', 6))],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_Mixed_Pool_CUSD', {
      rewardTokens: [Token.WOM],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_Mixed_Pool_HAY', {
      rewardTokens: [Token.WOM],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_Mixed_Pool_FRAX', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.FXS],
      operator: ExternalContract.FraxBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_AnkrBNBPool_WBNB', {
      rewardTokens: [Token.ANKR],
      startTimestamp: Epochs.Apr12,
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_AnkrBNBPool_ankrBNB', {
      rewardTokens: [Token.ANKR],
      startTimestamp: Epochs.Apr12,
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_frxETH_Pool_sfrxETH', {
      startTimestamp: Epochs.Apr19,
      rewardTokens: [Token.FXS],
      operator: ExternalContract.FraxBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_BNBy_Pool_WBNB', {
      startTimestamp: Epochs.Apr19,
      rewardTokens: [Token.TENFI],
      operator: ExternalContract.TenFiBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_BNBy_Pool_BNBy', {
      startTimestamp: Epochs.Apr19,
      rewardTokens: [Token.TENFI],
      operator: ExternalContract.TenFiBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_ankrETH_Pool_ETH', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.ANKR],
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_ankrETH_Pool_ankrETH', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.ANKR],
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_HAY_Pool_HAY', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.HAY],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('1000'))],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_HAY_Pool_USDC', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.HAY],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('1000'))],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_HAY_Pool_USDT', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.HAY],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('1000'))],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_wBETH_Pool_wBETH', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.wBETH],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_wBETH_Pool_ETH', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.wBETH],
    }),
  },
  [Network.BSC_TESTNET]: {
    BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0xA1a8d6688A2DEF14d6bD3A76E3AA2bdB5670C567'),
      rewardTokens: [Token.RT1],
      tokenPerSec: [parseEther('0.1').toBigInt()],
    },
    FRAX_BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x0d3dBc403d121eB53d14E2FE2a98e78CA3E17c44'),
      rewardTokens: [Token.RT1],
      tokenPerSec: [parseEther('0.1').toBigInt()],
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: Address('0xB9207cc7bEaFb74773Cd08C869d6F6f890105564'),
      rewardTokens: [Token.RT1],
    },
  },
  [Network.ARBITRUM_MAINNET]: {
    ...createBribeConfigFromDeployedAsset('Asset_USDPlus_Pool_USD+', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseUnits('6500', 6))],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_USDPlus_Pool_DAI+', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseUnits('3500', 6))],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_USDPlus_Pool_USDC', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_MIM_Pool_MIM', {
      rewardTokens: [Token.SPELL],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_MIM_Pool_USDT', {
      rewardTokens: [Token.SPELL],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_FRAX_Pool_FRAX', {
      rewardTokens: [Token.FXS],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_FRAX_Pool_MAI', {
      rewardTokens: [Token.QI],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_FRAX_Pool_USD+', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseUnits('1000', 6))],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_BOB_Pool_BOB', {
      rewardTokens: [Token.BOB],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_BOB_Pool_USDC', {
      rewardTokens: [Token.BOB],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_mWOM_Pool_mWOM', {
      rewardTokens: [Token.MGP, Token.USDC],
      tokenPerSec: [0n, 0n],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_mWOM_Pool_WOM', {
      rewardTokens: [Token.MGP, Token.USDC],
      tokenPerSec: [0n, 0n],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_wmxWOM_Pool_wmxWOM', {
      rewardTokens: [Token.WMX],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_wmxWOM_Pool_WOM', {
      rewardTokens: [Token.WMX],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_frxETH_Pool_frxETH', {
      rewardTokens: [Token.FXS],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_frxETH_Pool_WETH', {
      rewardTokens: [Token.FXS],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_qWOM_Pool_qWOM', {
      rewardTokens: [Token.QUO],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_qWOM_Pool_WOM', {
      rewardTokens: [Token.QUO],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_frxETH_Pool_sfrxETH', {
      startTimestamp: Epochs.Apr19,
      rewardTokens: [Token.FXS],
      operator: ExternalContract.FraxBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_jUSDC_Pool_jUSDC', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.USDC],
      operator: ExternalContract.JonesDaoBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_jUSDC_Pool_USDC', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.USDC],
      operator: ExternalContract.JonesDaoBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_ankrETH_Pool_WETH', {
      startTimestamp: Epochs.May17,
      rewardTokens: [Token.ANKR],
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_ankrETH_Pool_ankrETH', {
      startTimestamp: Epochs.May17,
      rewardTokens: [Token.ANKR],
      operator: ExternalContract.AnkrBribeOperator,
    }),
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

export const CROSS_CHAIN_POOL_TOKENS_MAP: PartialRecord<
  Network,
  NetworkPoolInfo<IHighCovRatioFeePoolConfig>
> = injectForkNetwork<NetworkPoolInfo<IHighCovRatioFeePoolConfig>>({
  [Network.BSC_TESTNET]: {
    stablecoinPool: {
      setting: {
        ...defaultCrossChainPoolConfig,
      },
      assets: {
        ...BusdAsset(),
        ...VusdcAsset(),
      },
    },
  },
  [Network.AVALANCHE_TESTNET]: {
    stablecoinPool: {
      setting: {
        ...defaultCrossChainPoolConfig,
      },
      assets: {
        ...BusdAsset(),
        ...VusdcAsset(),
      },
    },
  },
})

export const WORMHOLE_ADAPTOR_CONFIG_MAP: PartialRecord<
  Network,
  Record<PoolName, IWormholeAdaptorConfig>
> = injectForkNetwork<Record<PoolName, IWormholeAdaptorConfig>>({
  [Network.BSC_TESTNET]: {
    stablecoinPool: {
      adaptorAddr: Deployment('WormholeAdaptor_stablecoinPool_Proxy'),
      tokens: [Token.BUSD, Token.vUSDC],
    },
  },
  [Network.AVALANCHE_TESTNET]: {
    stablecoinPool: {
      adaptorAddr: Deployment('WormholeAdaptor_stablecoinPool_Proxy'),
      tokens: [Token.BUSD, Token.vUSDC],
    },
  },
})

/**
 * Helper Functions
 */

function createBribeConfigFromDeployedAsset(deploymentName: string, config: Partial<IRewarder>): TokenMap<IRewarder> {
  return {
    [deploymentName]: {
      ...defaultRewarder(),
      lpToken: Deployment(deploymentName),
      ...config,
    },
  }
}
