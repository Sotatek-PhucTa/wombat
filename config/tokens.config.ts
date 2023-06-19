import { BigNumber } from 'ethers'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import {
  Deployment,
  IGovernedPriceFeed,
  IHighCovRatioFeePoolConfig,
  IMockTokenInfo,
  IWormholeAdaptorConfig,
  IWormholeConfig,
  Network,
  NetworkPoolInfo,
  PartialRecord,
  PoolName,
  TokenMap,
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
  UsdceAsset,
  UsddAsset,
  UsdtAsset,
  UsdtPlusAsset,
  VusdcAsset,
  WbethAsset,
  WbnbAsset,
  WethAsset,
  WmxWomAsset,
  WomAsset,
  WstETHAsset,
} from './assets.config'
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
        ...UsdceAsset(),
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
        ...UsdceAsset(),
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
        ...UsdceAsset(),
      },
    },
    BOB_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
        ...BobAsset(),
        ...UsdceAsset(),
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
    StandalonePool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {},
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
        ...UsdceAsset({
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
    WstETH_Pool: {
      setting: {
        ...defaultDynamicPoolConfig,
        haircut: parseEther('0.0001'),
        supportNativeToken: true,
      },
      assets: {
        ...WstETHAsset({ maxSupply: parseEther('1600') }),
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
