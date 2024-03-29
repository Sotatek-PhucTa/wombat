import { BigNumber } from 'ethers'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import {
  IAssetInfo,
  ICrossChainPoolConfig,
  IGovernedPriceFeed,
  IHighCovRatioFeePoolConfig,
  Network,
  NetworkPoolInfo,
  PartialRecord,
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
  DolaAsset,
  EthAsset,
  FraxAsset,
  FrxEthAsset,
  FUsdcAsset,
  HayAsset,
  IusdAsset,
  JusdcAsset,
  MaiAsset,
  MimAsset,
  MpendleAsset,
  MwomAsset,
  PendleAsset,
  QwomAsset,
  SfrxEthAsset,
  StkBnbAsset,
  TusdAsset,
  UsdPlusAsset,
  UsdcAsset,
  UsdceAsset,
  UsddAsset,
  UsdsAsset,
  UsdtAsset,
  UsdtPlusAsset,
  UsdvAsset,
  VusdcAsset,
  WbethAsset,
  WbnbAsset,
  WethAsset,
  WmxWomAsset,
  WomAsset,
  WstETHAsset,
  EPendleAsset,
  SnBNBAsset,
  RBnbAsset,
  EthxAsset,
  EuroCAsset,
  AgEURAsset,
  EureAsset,
  zBNBAsset,
  zUSDAsset,
  UsdbcAsset,
  WxdaiAsset,
  WavaxAsset,
  SavaxAsset,
} from './assets.config'
import { Token } from './token'
import { getCurrentNetwork, isForkNetwork } from '../types/network'
import { ExternalContract } from './contract'

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
    // TODO: fetch initial price from on-chain similar to updateSfrxEthPrice srcipt. However, we need to handle async
    // initial price. See pricePerShare() at https://monobase.xyz/address/0xac3E018457B222d93114458476f3E3416Abbe38F#call
    initialPrice: parseEther('1.064824882536441618'),
    maxDeviation: parseEther('0.01'),
  }
}

const oneBips = parseEther('0.0001')
const oneFifthBips = oneBips.div(5)
const twentyBips = oneBips.mul(20)
export function defaultMainPoolConfig(): IHighCovRatioFeePoolConfig {
  return {
    ampFactor: parseEther('0.00025'),
    haircut: oneFifthBips,
    mintFeeThreshold: parseEther('10'),
    startCovRatio: parseEther('5'),
    endCovRatio: parseEther('10'),
    lpDividendRatio: parseEther('0.5'),
    retentionRatio: parseEther('0.5'),
    deploymentNamePrefix: '',
    supportNativeToken: false,
  }
}

export function defaultFactoryPoolConfig(): IHighCovRatioFeePoolConfig {
  return {
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
}

function defaultWomPoolConfig(): IHighCovRatioFeePoolConfig {
  return {
    ...defaultFactoryPoolConfig(),
    ampFactor: parseEther('0.1'),
    haircut: oneBips.mul(20),
    mintFeeThreshold: parseEther('55.5555555556'),
    deploymentNamePrefix: 'WomSidePools',
    startCovRatio: parseEther('5'),
    endCovRatio: parseEther('10'),
  }
}

function defaultPendlePoolConfig(): IHighCovRatioFeePoolConfig {
  return {
    ...defaultWomPoolConfig(),
    deploymentNamePrefix: 'PendleSidePools',
  }
}

export function defaultDynamicPoolConfig(): IHighCovRatioFeePoolConfig {
  return {
    ...defaultFactoryPoolConfig(),
    ampFactor: parseEther('0.002'),
    haircut: oneBips,
    mintFeeThreshold: parseEther('0.01'),
    deploymentNamePrefix: 'DynamicPools',
  }
}

const defaultVolatilePoolConfig: IHighCovRatioFeePoolConfig = {
  ...defaultFactoryPoolConfig(),
  ampFactor: parseEther('0.1'),
  haircut: twentyBips,
  mintFeeThreshold: parseEther('10'),
  deploymentNamePrefix: 'VolatilePools',
}

const defaultCrossChainPoolConfig: ICrossChainPoolConfig = {
  ...defaultMainPoolConfig(),
  tokensForCreditHaircut: oneBips.mul(3),
  creditForTokensHaircut: oneBips.mul(3),
  maximumInboundCredit: parseEther('100000'),
  maximumOutboundCredit: parseEther('100000'),
  startCovRatio: parseEther('1.5'),
  endCovRatio: parseEther('1.8'),
  deploymentNamePrefix: 'CrossChainPool',
  swapCreditForTokensEnabled: true,
  swapTokensForCreditEnabled: true,
}

function disableCrossChainSwap(config: ICrossChainPoolConfig): ICrossChainPoolConfig {
  return {
    ...config,
    swapCreditForTokensEnabled: false,
    swapTokensForCreditEnabled: false,
  }
}

// @deprecated: Please expose the value type directly using getCurrentNetwork().
// inject forkNetwork to hardhat and localhost
export function injectForkNetwork<T>(config: PartialRecord<Network, T>): PartialRecord<Network, T> {
  if (isForkNetwork()) {
    return config
  }

  const forkNetwork = getCurrentNetwork()
  return Object.assign(config, {
    [Network.HARDHAT]: config[forkNetwork as Network],
    [Network.LOCALHOST]: config[forkNetwork as Network],
  })
}

export const FACTORYPOOL_TOKENS_MAP: PartialRecord<
  Network,
  NetworkPoolInfo<IHighCovRatioFeePoolConfig>
> = injectForkNetwork<NetworkPoolInfo<IHighCovRatioFeePoolConfig>>({
  [Network.BSC_MAINNET]: {
    MainPool: {
      setting: {
        ...defaultMainPoolConfig(),
        haircut: parseEther('0.00002'), // 0.002%
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
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...BusdAsset({ allocPoint: 5 }),
        ...TusdAsset(),
        ...FraxAsset(),
        ...UsdtAsset(),
      },
    },
    SidePool_01: {
      // Smart HAY pool
      setting: {
        ...defaultFactoryPoolConfig(),
        haircut: parseEther('0.00002'), // 0.002%
        deploymentNamePrefix: '',
      },
      assets: {
        ...BusdAsset({ allocPoint: 10 }),
        ...HayAsset(),
      },
    },
    HAY_Pool: {
      // deprecated
      setting: {
        ...defaultFactoryPoolConfig(),
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
        ...defaultFactoryPoolConfig(),
        mintFeeThreshold: parseEther('0.25'),
      },
      assets: {
        ...IusdAsset(),
        ...BusdAsset(),
      },
    },
    axlUSDC_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
        mintFeeThreshold: parseEther('1'),
      },
      assets: {
        ...AxlUsdcAsset(),
        ...BusdAsset(),
      },
    },
    USDD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
        mintFeeThreshold: parseEther('0.02'),
      },
      assets: {
        ...UsddAsset(),
        ...UsdcAsset(),
      },
    },
    BOB_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
        mintFeeThreshold: parseEther('0.2'),
      },
      assets: {
        ...BobAsset(),
        ...UsdcAsset(),
      },
    },
    Mixed_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
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
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...MimAsset(),
        ...UsdtAsset(),
      },
    },
    wmxWOMPool: {
      setting: {
        ...defaultWomPoolConfig(),
        haircut: parseEther('0.0001'),
      },
      assets: {
        ...WomAsset(),
        ...WmxWomAsset(),
      },
    },
    mWOMPool: {
      setting: {
        ...defaultWomPoolConfig(),
        haircut: parseEther('0.0001'),
      },
      assets: {
        ...WomAsset(),
        ...MwomAsset(),
      },
    },
    qWOMPool: {
      setting: {
        ...defaultWomPoolConfig(),
        haircut: parseEther('0.0001'),
      },
      assets: {
        ...WomAsset(),
        ...QwomAsset(),
      },
    },
    USDS_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
        deploymentNamePrefix: '',
      },
      assets: {
        ...UsdsAsset(),
        ...UsdtAsset(),
      },
    },
    zBNB_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
        ampFactor: parseEther('0.002'), // same as dynamic pool
        mintFeeThreshold: parseEther('0.03'),
        deploymentNamePrefix: '',
        supportNativeToken: true,
      },
      assets: {
        ...zBNBAsset(defaultSmallCapBNBMaxSupply()),
        ...WbnbAsset(defaultSmallCapBNBMaxSupply()),
      },
    },
    zUSD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
        ampFactor: parseEther('0.002'), // same as dynamic pool
        deploymentNamePrefix: '',
      },
      assets: {
        ...zUSDAsset(defaultSmallCapUSDMaxSupply()),
        ...UsdcAsset(defaultSmallCapUSDMaxSupply()),
      },
    },
    StandalonePool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {},
    },
    StandalonePool2: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {},
    },
    USDV_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...UsdvAsset(defaultLargeCapUSDMaxSupply()),
        ...UsdtAsset(defaultLargeCapUSDMaxSupply()),
      },
    },
  },
  [Network.BSC_TESTNET]: {
    MainPool: {
      setting: {
        ...defaultMainPoolConfig(),
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
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...BusdAsset(),
        ...TusdAsset(),
        ...FraxAsset(),
      },
    },
    SidePool_01: {
      setting: {
        ...defaultFactoryPoolConfig(),
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
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...IusdAsset(),
        ...BusdAsset(),
      },
    },
    CUSD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...CusdAsset(),
        ...HayAsset(),
      },
    },
    axlUSDC_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...AxlUsdcAsset(),
        ...BusdAsset(),
      },
    },
    USDD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...UsddAsset(),
        ...UsdcAsset(),
      },
    },
    BOB_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...BobAsset(),
        ...UsdcAsset(),
      },
    },
    wmxWOMPool: {
      setting: {
        ...defaultWomPoolConfig(),
      },
      assets: {
        ...WomAsset(),
        ...WmxWomAsset(),
      },
    },
    mWOMPool: {
      setting: {
        ...defaultWomPoolConfig(),
      },
      assets: {
        ...WomAsset(),
        ...MwomAsset(),
      },
    },
    qWOMPool: {
      setting: {
        ...defaultWomPoolConfig(),
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
        ...defaultMainPoolConfig(),
        haircut: parseEther('0.00002'), // 0.002%
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
        ...defaultFactoryPoolConfig(),
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
        ...defaultFactoryPoolConfig(),
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
        ...defaultFactoryPoolConfig(),
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
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...BobAsset(),
        ...UsdceAsset(),
      },
    },
    mWOM_Pool: {
      setting: {
        ...defaultWomPoolConfig(),
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
        ...defaultWomPoolConfig(),
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
        ...defaultWomPoolConfig(),
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
        ...defaultFactoryPoolConfig(),
      },
      assets: {},
    },
    mPendle_Pool: {
      setting: {
        ...defaultPendlePoolConfig(),
      },
      assets: {
        ...PendleAsset(),
        ...MpendleAsset(),
      },
    },
    fUSDC_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...FUsdcAsset(),
        ...UsdceAsset(),
      },
    },
    ePendle_Pool: {
      setting: {
        ...defaultPendlePoolConfig(),
      },
      assets: {
        ...PendleAsset(),
        ...EPendleAsset(),
      },
    },
    USDV_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...UsdvAsset(defaultLargeCapUSDMaxSupply()),
        ...UsdtAsset(defaultLargeCapUSDMaxSupply()),
      },
    },
  },
  [Network.ETHEREUM_MAINNET]: {
    FRAX_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...FraxAsset({ maxSupply: parseEther('20000000') }),
        ...UsdtAsset({ maxSupply: parseUnits('20000000', 6) }),
      },
    },
    agEUR_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
        ampFactor: parseEther('0.0025'),
      },
      assets: {
        ...AgEURAsset({ maxSupply: parseEther('20000000') }),
        ...EureAsset({ maxSupply: parseEther('20000000') }),
      },
    },
    wmxWOMPool: {
      setting: {
        ...defaultWomPoolConfig(),
      },
      assets: {
        ...WomAsset(),
        ...WmxWomAsset(),
      },
    },
    mWOMPool: {
      setting: {
        ...defaultWomPoolConfig(),
      },
      assets: {
        ...WomAsset(),
        ...MwomAsset(),
      },
    },
    USDV_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...UsdvAsset(defaultLargeCapUSDMaxSupply()),
        ...UsdtAsset(defaultLargeCapUSDMaxSupply()),
      },
    },
  },
  [Network.HARDHAT]: {
    MainPool: {
      setting: {
        ...defaultMainPoolConfig(),
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
  [Network.SKALE_TESTNET]: {
    MainPool: {
      setting: {
        ...defaultMainPoolConfig(),
      },
      assets: {
        ...UsdtAsset(),
        ...UsdcAsset(),
      },
    },
  },
  [Network.SCROLL_TESTNET]: {
    MainPool: {
      setting: {
        ...defaultMainPoolConfig(),
      },
      assets: {
        ...UsdtAsset(),
        ...UsdcAsset(),
      },
    },
  },
  [Network.ZKSYNC_TESTNET]: {
    MainPool: {
      setting: {
        ...defaultMainPoolConfig(),
      },
      assets: {
        ...UsdtAsset(),
        ...UsdcAsset(),
      },
    },
  },
  [Network.GNOSIS_MAINNET]: {
    MainPool: {
      setting: {
        ...defaultMainPoolConfig(),
      },
      assets: {
        ...UsdtAsset(),
        ...UsdcAsset(),
        ...WxdaiAsset(),
      },
    },
  },
  [Network.ZKSYNC_MAINNET]: {
    MainPool: {
      setting: {
        ...defaultMainPoolConfig(),
      },
      assets: {
        ...UsdtAsset(),
        ...UsdcAsset(),
        ...BusdAsset(),
      },
    },
  },
  [Network.POLYGON_ZKEVM_MAINNET]: {
    MainPool: {
      setting: {
        ...defaultMainPoolConfig(),
      },
      assets: {
        ...UsdtAsset(),
        ...UsdcAsset(),
        ...DaiAsset(),
      },
    },
  },
  [Network.OPTIMISM_MAINNET]: {
    Frax_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...FraxAsset(defaultLargeCapUSDMaxSupply()),
        ...UsdcAsset(defaultLargeCapUSDMaxSupply()),
      },
    },
    USDV_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...UsdvAsset(defaultLargeCapUSDMaxSupply()),
        ...UsdtAsset(defaultLargeCapUSDMaxSupply()),
      },
    },
    Dola_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...UsdceAsset({
          ...defaultLargeCapUSDMaxSupply(),
          tokenName: 'USD Coin (Bridged from Ethereum)',
        }),
        ...DolaAsset(defaultLargeCapUSDMaxSupply()),
      },
    },
    StandalonePool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {},
    },
  },
  [Network.AVALANCHE_MAINNET]: {
    USDV_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...UsdvAsset(defaultLargeCapUSDMaxSupply()),
        ...UsdtAsset(defaultLargeCapUSDMaxSupply()),
      },
    },
  },
  [Network.POLYGON_MAINNET]: {
    StandalonePool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {},
    },
  },
  [Network.BASE_MAINNET]: {
    USDS_Pool: {
      setting: {
        ...defaultFactoryPoolConfig(),
      },
      assets: {
        ...UsdsAsset(defaultSmallCapUSDMaxSupply()),
        ...UsdbcAsset(defaultSmallCapUSDMaxSupply()),
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
        ...defaultDynamicPoolConfig(),
        haircut: parseEther('0.0001'),
      },
      assets: {
        ...WbethAsset({ maxSupply: parseEther('1600') }),
        ...EthAsset({ maxSupply: parseEther('1600') }),
      },
    },
    frxETH_Pool: {
      setting: {
        ...defaultDynamicPoolConfig(),
        haircut: parseEther('0.0001'),
      },
      assets: {
        ...SfrxEthAsset({
          assetContractName: 'PriceFeedAsset',
          priceFeed: sfrxETHGovernedPriceFeed(),
          maxSupply: parseEther('1600'),
        }),
        ...FrxEthAsset(),
        ...EthAsset(),
      },
    },
    ankrETH_Pool: {
      setting: {
        ...defaultDynamicPoolConfig(),
        haircut: parseEther('0.0001'),
      },
      assets: {
        ...AnkrEthAsset({ maxSupply: parseEther('1600') }),
        ...EthAsset({ maxSupply: parseEther('1600') }),
      },
    },
    BnbxPool: {
      setting: {
        ...defaultDynamicPoolConfig(),
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
        ...defaultDynamicPoolConfig(),
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
        ...defaultDynamicPoolConfig(),
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
        ...defaultDynamicPoolConfig(),
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
    SnBNB_Pool: {
      setting: {
        ...defaultDynamicPoolConfig(),
        mintFeeThreshold: parseEther('0.03'),
        deploymentNamePrefix: '',
        supportNativeToken: true,
      },
      assets: {
        ...WbnbAsset({ maxSupply: parseEther('10000') }),
        ...SnBNBAsset({ maxSupply: parseEther('10000') }),
      },
    },
    rBNB_Pool: {
      setting: {
        ...defaultDynamicPoolConfig(),
        mintFeeThreshold: parseEther('0.03'),
        deploymentNamePrefix: '',
        supportNativeToken: true,
      },
      assets: {
        ...WbnbAsset({ maxSupply: parseEther('10000') }),
        ...RBnbAsset({ maxSupply: parseEther('10000') }),
      },
    },
  },
  [Network.ARBITRUM_MAINNET]: {
    jUSDC_Pool: {
      setting: {
        ...defaultDynamicPoolConfig(),
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
        ...defaultDynamicPoolConfig(),
        supportNativeToken: true,
      },
      assets: {
        ...FrxEthAsset(),
        ...WethAsset(),
        ...SfrxEthAsset({
          assetContractName: 'PriceFeedAsset',
          priceFeed: sfrxETHGovernedPriceFeed(),
          maxSupply: parseEther('1600'),
        }),
      },
    },
    ankrETH_Pool: {
      setting: {
        ...defaultDynamicPoolConfig(),
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
        ...defaultDynamicPoolConfig(),
        haircut: parseEther('0.0001'),
        supportNativeToken: true,
      },
      assets: {
        ...WstETHAsset({ maxSupply: parseEther('1600') }),
        ...WethAsset({ maxSupply: parseEther('1600') }),
      },
    },
  },
  [Network.ETHEREUM_MAINNET]: {
    frxETH_Pool: {
      setting: {
        ...defaultDynamicPoolConfig(),
        supportNativeToken: true,
      },
      assets: {
        ...WethAsset({ maxSupply: parseEther('11000') }),
        ...FrxEthAsset({
          maxSupply: parseEther('11000'),
        }),
        ...SfrxEthAsset({
          assetContractName: 'ERC4626Asset',
          oracle: ExternalContract.sfrxETHStakingManager,
          maxSupply: parseEther('11000'),
        }),
      },
    },
    wstETH_Pool: {
      setting: {
        ...defaultDynamicPoolConfig(),
        supportNativeToken: true,
      },
      assets: {
        ...WstETHAsset({
          assetContractName: 'WstETHAsset_Mainnet',
          maxSupply: parseEther('11000'),
        }),
        ...WethAsset({ maxSupply: parseEther('11000') }),
      },
    },
    ETHx_Pool: {
      setting: {
        ...defaultDynamicPoolConfig(),
        supportNativeToken: true,
      },
      assets: {
        ...EthxAsset({ maxSupply: parseEther('11000') }),
        ...WethAsset({ maxSupply: parseEther('11000') }),
      },
    },
  },
  [Network.AVALANCHE_MAINNET]: {
    sAVAX_Pool: {
      setting: {
        ...defaultDynamicPoolConfig(),
        supportNativeToken: true,
      },
      assets: {
        ...WavaxAsset(defaultLargeCapAVAXMaxSupply()),
        ...SavaxAsset(defaultLargeCapAVAXMaxSupply()),
      },
    },
  },
  [Network.OPTIMISM_MAINNET]: {
    frxETH_Pool: {
      setting: {
        ...defaultDynamicPoolConfig(),
        supportNativeToken: true,
      },
      assets: {
        ...FrxEthAsset(defaultLargeCapETHMaxSupply()),
        ...WethAsset(defaultLargeCapETHMaxSupply()),
        ...SfrxEthAsset({
          ...defaultLargeCapETHMaxSupply(),
          assetContractName: 'PriceFeedAsset',
          priceFeed: sfrxETHGovernedPriceFeed(),
        }),
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

export const CROSS_CHAIN_POOL_TOKENS_MAP: PartialRecord<
  Network,
  NetworkPoolInfo<ICrossChainPoolConfig>
> = injectForkNetwork<NetworkPoolInfo<ICrossChainPoolConfig>>({
  [Network.HARDHAT]: {
    Stablecoin_Pool: {
      setting: {
        ...defaultCrossChainPoolConfig,
      },
      assets: {
        ...BusdAsset(),
        ...VusdcAsset(),
      },
    },
    LayerZero_Stablecoin_Pool: {
      setting: {
        ...defaultCrossChainPoolConfig,
      },
      assets: {
        ...BusdAsset(),
        ...VusdcAsset(),
      },
    },
  },
  [Network.BSC_TESTNET]: {
    Stablecoin_Pool: {
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
    Stablecoin_Pool: {
      setting: {
        ...defaultCrossChainPoolConfig,
      },
      assets: {
        ...BusdAsset(),
        ...VusdcAsset(),
      },
    },
  },
  [Network.POLYGON_TESTNET]: {
    Stablecoin_Pool: {
      setting: {
        ...defaultCrossChainPoolConfig,
      },
      assets: {
        ...UsdcAsset(),
        ...UsdtAsset(),
        ...AxlUsdcAsset(),
      },
    },
  },
  [Network.BSC_MAINNET]: {
    Stablecoin_Pool: {
      setting: {
        ...defaultCrossChainPoolConfig,
      },
      assets: {
        ...UsdcAsset(defaultLargeCapUSDMaxSupply()),
        ...UsdtAsset(defaultLargeCapUSDMaxSupply()),
      },
    },
  },
  [Network.ETHEREUM_MAINNET]: {
    Stablecoin_Pool: {
      setting: {
        ...defaultCrossChainPoolConfig,
      },
      assets: {
        ...UsdcAsset(defaultLargeCapUSDMaxSupply()),
        ...UsdtAsset(defaultLargeCapUSDMaxSupply()),
      },
    },
  },
  [Network.ARBITRUM_MAINNET]: {
    Stablecoin_Pool: {
      setting: {
        ...defaultCrossChainPoolConfig,
      },
      assets: {
        ...UsdcAsset(defaultLargeCapUSDMaxSupply()),
        ...UsdtAsset(defaultLargeCapUSDMaxSupply()),
      },
    },
  },
  [Network.OPTIMISM_MAINNET]: {
    Stablecoin_Pool: {
      setting: {
        ...defaultCrossChainPoolConfig,
      },
      assets: {
        ...UsdcAsset(defaultLargeCapUSDMaxSupply()),
        ...UsdtAsset(defaultLargeCapUSDMaxSupply()),
        ...UsdceAsset({
          ...defaultLargeCapUSDMaxSupply(),
          tokenName: 'USD Coin (Bridged from Ethereum)',
        }),
      },
    },
  },
  [Network.BASE_MAINNET]: {
    Stablecoin_Pool: {
      setting: {
        ...defaultCrossChainPoolConfig,
      },
      assets: {
        ...UsdcAsset(defaultLargeCapUSDMaxSupply()),
        ...UsdbcAsset(defaultLargeCapUSDMaxSupply()),
      },
    },
  },
  [Network.POLYGON_MAINNET]: {
    Stablecoin_Pool: {
      setting: disableCrossChainSwap(defaultCrossChainPoolConfig),
      assets: {
        ...UsdceAsset({
          maxSupply: parseEther('100000'),
          tokenName: 'USD Coin (PoS)',
        }),
        ...UsdtAsset({ maxSupply: parseEther('100000') }),
      },
    },
  },
  [Network.AVALANCHE_MAINNET]: {
    Stablecoin_Pool: {
      setting: {
        ...defaultCrossChainPoolConfig,
      },
      assets: {
        ...UsdcAsset(defaultLargeCapUSDMaxSupply()),
        ...UsdtAsset(defaultLargeCapUSDMaxSupply()),
      },
    },
  },
  [Network.SCROLL_MAINNET]: {
    Stablecoin_Pool: {
      setting: disableCrossChainSwap(defaultCrossChainPoolConfig),
      assets: {
        ...UsdcAsset(defaultLargeCapUSDMaxSupply()),
        ...UsdtAsset(defaultLargeCapUSDMaxSupply()),
      },
    },
  },
})

function defaultLargeCapUSDMaxSupply(): Partial<IAssetInfo> {
  return {
    maxSupply: parseEther('3000000'),
  }
}

function defaultSmallCapUSDMaxSupply(): Partial<IAssetInfo> {
  return {
    maxSupply: parseEther('300000'),
  }
}

function defaultSmallCapBNBMaxSupply(): Partial<IAssetInfo> {
  return {
    maxSupply: parseEther('1500'),
  }
}

function defaultSmallCapAVAXMaxSupply(): Partial<IAssetInfo> {
  return {
    maxSupply: parseEther('30000'),
  }
}

function defaultLargeCapAVAXMaxSupply(): Partial<IAssetInfo> {
  return {
    maxSupply: parseEther('300000'),
  }
}

function defaultLargeCapETHMaxSupply(): Partial<IAssetInfo> {
  return {
    maxSupply: parseEther('1600'),
  }
}
