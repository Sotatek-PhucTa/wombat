import { BigNumber } from 'ethers'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import {
  Address,
  Deployment,
  DeploymentOrAddress,
  IHighCovRatioFeePoolConfig,
  IMockTokenInfo,
  IRewarder,
  ITokens,
  ITokensInfo,
  IWormholeAdaptorConfig,
  IWormholeConfig,
  Network,
  NetworkPoolInfo,
  PartialRecord,
  PoolName,
  TokenMap,
  Unknown,
} from '../types'
import { Token } from './token'
import { ExternalContract } from './contract'
import { Epochs } from './epoch'

// To resolve DeploymentOrAddress, use getAddress in utils/index.ts
export const WOMBAT_TOKEN: Record<Network, DeploymentOrAddress> = injectForkNetwork({
  [Network.HARDHAT]: Deployment('WombatToken'),
  [Network.LOCALHOST]: Deployment('WombatToken'),
  [Network.BSC_MAINNET]: Deployment('WombatToken'),
  [Network.BSC_TESTNET]: Deployment('WombatToken'),
  [Network.ARBITRUM_MAINNET]: Address('0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96'),
  [Network.ARBITRUM_TESTNET]: Unknown(),
  [Network.POLYGON_MAINNET]: Unknown(),
  [Network.POLYGON_TESTNET]: Unknown(),
  [Network.AVALANCHE_TESTNET]: Address('0xa15E4544D141aa98C4581a1EA10Eb9048c3b3382'),
}) as Record<Network, DeploymentOrAddress>

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

function defaultRewarder(): IRewarder {
  return {
    lpToken: Unknown(),
    secondsToStart: 60,
    // Use empty reward token here as we expect config to override it.
    rewardTokens: [],
    tokenPerSec: [0],
  }
}

const defaultFactoryPoolConfig: IHighCovRatioFeePoolConfig = {
  ampFactor: parseEther('0.005'),
  haircut: parseEther('0.0004'),
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
  haircut: parseEther('0.0025'),
  mintFeeThreshold: parseEther('55.5555555556'),
  deploymentNamePrefix: 'WomSidePools',
}

const defaultDynamicPoolConfig: IHighCovRatioFeePoolConfig = {
  ...defaultFactoryPoolConfig,
  ampFactor: parseEther('0.02'),
  haircut: parseEther('0.001'),
  mintFeeThreshold: parseEther('0.01'),
  deploymentNamePrefix: 'DynamicPools',
}

const defaultCrossChainPoolConfig: IHighCovRatioFeePoolConfig = {
  ampFactor: parseEther('0.005'),
  haircut: parseEther('0.0004'),
  mintFeeThreshold: parseEther('10'),
  startCovRatio: parseEther('1.5'),
  endCovRatio: parseEther('1.8'),
  lpDividendRatio: parseEther('0.5'),
  retentionRatio: parseEther('0.5'),
  deploymentNamePrefix: 'CrossChainPool',
  supportNativeToken: false,
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
  [Network.BSC_MAINNET]: {
    BUSD: ['Binance USD', 'BUSD', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 220], // last item is pool alloc point
    USDC: ['USD Coin', 'USDC', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 220],
    USDT: ['Tether USD', 'USDT', '0x55d398326f99059ff775485246999027b3197955', 220],
    DAI: ['Dai Stablecoin', 'DAI', '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', 75],
  },
  [Network.BSC_TESTNET]: {
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
  [Network.LOCALHOST]: {
    BUSD: ['Binance USD', 'BUSD', '18', 0, 240], // 0 tokens minted to msg.sender initially
    USDC: ['USD Coin', 'USDC', '18', 0, 240],
    USDT: ['Tether USD', 'USDT', '18', 0, 240],
    TUSD: ['TrueUSD', 'TUSD', '18', 0, 240],
    DAI: ['Dai Stablecoin', 'DAI', '18', 0, 240],
    vUSDC: ['Venus USDC', 'vUSDC', '8', 0, 240],
  },
  [Network.HARDHAT]: {
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

export const MOCK_TOKEN_MAP: PartialRecord<Network, TokenMap<IMockTokenInfo>> = injectForkNetwork<
  TokenMap<IMockTokenInfo>
>({
  [Network.HARDHAT]: {
    axlUSDC: {
      tokenName: 'Axelar Wrapped USDC',
      tokenSymbol: 'axlUSDC',
      decimalForMockToken: 6,
    },
  },
  [Network.BSC_TESTNET]: {
    BUSD: {
      tokenName: 'Binance USD',
      tokenSymbol: 'BUSD',
      decimalForMockToken: 18,
    },
    USDC: {
      tokenName: 'USD Coin',
      tokenSymbol: 'USDC',
      decimalForMockToken: 18,
    },
    USDT: {
      tokenName: 'Tether USD',
      tokenSymbol: 'USDT',
      decimalForMockToken: 18,
    },
    DAI: {
      tokenName: 'Dai Stablecoin',
      tokenSymbol: 'DAI',
      decimalForMockToken: 18,
    },
    vUSDC: {
      tokenName: 'Venus USDC',
      tokenSymbol: 'vUSDC',
      decimalForMockToken: 8,
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
    MIM: {
      tokenName: 'Magic Internet Money',
      tokenSymbol: 'MIM',
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
  [Network.LOCALHOST]: {
    BUSD: {
      tokenName: 'Binance USD',
      tokenSymbol: 'BUSD',
      decimalForMockToken: 18,
    },
    USDC: {
      tokenName: 'USD Coin',
      tokenSymbol: 'USDC',
      decimalForMockToken: 18,
    },
    USDT: {
      tokenName: 'Tether USD',
      tokenSymbol: 'USDT',
      decimalForMockToken: 18,
    },
    DAI: {
      tokenName: 'Dai Stablecoin',
      tokenSymbol: 'DAI',
      decimalForMockToken: 18,
    },
    vUSDC: {
      tokenName: 'Venus USDC',
      tokenSymbol: 'vUSDC',
      decimalForMockToken: 8,
    },
  },
})

export const FACTORYPOOL_TOKENS_MAP: PartialRecord<
  Network,
  NetworkPoolInfo<IHighCovRatioFeePoolConfig>
> = injectForkNetwork<NetworkPoolInfo<IHighCovRatioFeePoolConfig>>({
  [Network.BSC_MAINNET]: {
    stables_01: {
      setting: {
        ...defaultFactoryPoolConfig,
        haircut: parseEther('0.0003'),
        mintFeeThreshold: parseEther('0.6'),
      },
      assets: {
        BUSD: {
          tokenName: 'Binance USD',
          tokenSymbol: 'BUSD',
          underlyingTokenAddr: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
          allocPoint: 5,
        },
        TUSD: {
          tokenName: 'TrueUSD',
          tokenSymbol: 'TUSD',
          underlyingTokenAddr: '0x14016E85a25aeb13065688cAFB43044C2ef86784',
        },
        FRAX: {
          tokenName: 'Frax',
          tokenSymbol: 'FRAX',
          underlyingTokenAddr: '0x90C97F71E18723b0Cf0dfa30ee176Ab653E89F40',
        },
      },
    },
    SidePool_01: {
      setting: {
        ...defaultFactoryPoolConfig,
        haircut: parseEther('0.0002'),
        deploymentNamePrefix: '',
        mintFeeThreshold: parseEther('0.45'),
      },
      assets: {
        BUSD: {
          tokenName: 'Binance USD',
          tokenSymbol: 'BUSD',
          underlyingTokenAddr: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
          allocPoint: 10,
        },
        HAY: {
          tokenName: 'Hay Stablecoin',
          tokenSymbol: 'HAY',
          underlyingTokenAddr: '0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5',
          allocPoint: 0,
        },
      },
    },
    iUSD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        mintFeeThreshold: parseEther('0.25'),
      },
      assets: {
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
    },
    CUSD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        mintFeeThreshold: parseEther('0.25'),
      },
      assets: {
        CUSD: {
          tokenName: 'Coin98 Dollar',
          tokenSymbol: 'CUSD',
          underlyingTokenAddr: '0xFa4BA88Cf97e282c505BEa095297786c16070129',
        },
        HAY: {
          tokenName: 'Hay Destablecoin',
          tokenSymbol: 'HAY',
          underlyingTokenAddr: '0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5',
        },
      },
    },
    axlUSDC_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        mintFeeThreshold: parseEther('1'),
      },
      assets: {
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
    },
    USDD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        mintFeeThreshold: parseEther('0.02'),
      },
      assets: {
        USDD: {
          tokenName: 'Decentralized USD',
          tokenSymbol: 'USDD',
          underlyingTokenAddr: '0xd17479997F34dd9156Deef8F95A52D81D265be9c',
        },
        USDC: {
          tokenName: 'USD Coin',
          tokenSymbol: 'USDC',
          underlyingTokenAddr: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        },
      },
    },
    BOB_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        mintFeeThreshold: parseEther('0.2'),
      },
      assets: {
        BOB: {
          tokenName: 'BOB',
          tokenSymbol: 'BOB',
          underlyingTokenAddr: '0xB0B195aEFA3650A6908f15CdaC7D92F8a5791B0B',
        },
        USDC: {
          tokenName: 'USD Coin',
          tokenSymbol: 'USDC',
          underlyingTokenAddr: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        },
      },
    },
    USDPlus_Pool: {
      // Skim admin: 0xD9fCDFFEd5cA34Ef21661Ec6Fe3AEb742db6331e
      setting: {
        ...defaultFactoryPoolConfig,
        mintFeeThreshold: parseEther('10'),
        retentionRatio: BigNumber.from(0),
      },
      assets: {
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
    MIM_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        mintFeeThreshold: parseEther('10'),
      },
      assets: {
        MIM: {
          tokenName: 'Magic Internet Money',
          tokenSymbol: 'MIM',
          underlyingTokenAddr: '0xfE19F0B51438fd612f6FD59C1dbB3eA319f433Ba',
        },
        USDT: {
          tokenName: 'Tether USD',
          tokenSymbol: 'USDT',
          underlyingTokenAddr: '0x55d398326f99059fF775485246999027B3197955',
        },
      },
    },
    wmxWOMPool: {
      setting: {
        ...defaultWomPoolConfig,
      },
      assets: {
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
    },
    mWOMPool: {
      setting: {
        ...defaultWomPoolConfig,
      },
      assets: {
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
    },
    qWOMPool: {
      setting: {
        ...defaultWomPoolConfig,
      },
      assets: {
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
  },
  [Network.BSC_TESTNET]: {
    stables_01: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
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
    },
    SidePool_01: {
      setting: {
        ...defaultFactoryPoolConfig,
        haircut: parseEther('0.0003'),
        deploymentNamePrefix: '',
      },
      assets: {
        BUSD: {
          tokenName: 'Binance USD',
          tokenSymbol: 'BUSD',
          useMockToken: true,
          allocPoint: 10,
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
        MIM: {
          tokenName: 'Magic Internet Money',
          tokenSymbol: 'MIM',
          useMockToken: true,
        },
        HAY: {
          tokenName: 'Hay Stablecoin',
          tokenSymbol: 'HAY',
          useMockToken: true,
        },
      },
    },
    iUSD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
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
    },
    CUSD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
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
    },
    axlUSDC_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
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
    },
    USDD_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
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
    },
    BOB_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
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
    wmxWOMPool: {
      setting: {
        ...defaultWomPoolConfig,
      },
      assets: {
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
    },
    mWOMPool: {
      setting: {
        ...defaultWomPoolConfig,
      },
      assets: {
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
    },
    qWOMPool: {
      setting: {
        ...defaultWomPoolConfig,
      },
      assets: {
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
  },
  [Network.ARBITRUM_MAINNET]: {
    USDPlus_Pool: {
      // Skim admin: 0x145F2a1aa70098031629606d856591dA0C717554
      setting: {
        ...defaultFactoryPoolConfig,
        retentionRatio: BigNumber.from(0),
      },
      assets: {
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
    },
    MIM_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
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
    },
    FRAX_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
        retentionRatio: BigNumber.from(0),
      },
      assets: {
        FRAX: {
          tokenName: 'Frax',
          tokenSymbol: 'FRAX',
          underlyingTokenAddr: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
        },
        MAI: {
          tokenName: 'Mai Stablecoin',
          tokenSymbol: 'MAI',
          underlyingTokenAddr: '0x3F56e0c36d275367b8C502090EDF38289b3dEa0d',
        },
        'USD+': {
          tokenName: 'USD+',
          tokenSymbol: 'USD+',
          underlyingTokenAddr: '0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65',
          assetContractName: 'SkimmableAsset',
        },
        USDC: {
          tokenName: 'USD Coin',
          tokenSymbol: 'USDC',
          underlyingTokenAddr: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        },
      },
    },
    BOB_Pool: {
      setting: {
        ...defaultFactoryPoolConfig,
      },
      assets: {
        BOB: {
          tokenName: 'BOB',
          tokenSymbol: 'BOB',
          underlyingTokenAddr: '0xB0B195aEFA3650A6908f15CdaC7D92F8a5791B0B',
        },
        USDC: {
          tokenName: 'USD Coin',
          tokenSymbol: 'USDC',
          underlyingTokenAddr: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        },
      },
    },
    mWOM_Pool: {
      setting: {
        ...defaultWomPoolConfig,
      },
      assets: {
        mWOM: {
          tokenName: 'mWOM',
          tokenSymbol: 'mWOM',
          underlyingTokenAddr: '0x509FD25EE2AC7833a017f17Ee8A6Fb4aAf947876',
        },
        WOM: {
          tokenName: 'Wombat Token',
          tokenSymbol: 'WOM',
          underlyingTokenAddr: '0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96',
        },
      },
    },
    wmxWOM_Pool: {
      setting: {
        ...defaultWomPoolConfig,
      },
      assets: {
        wmxWOM: {
          tokenName: 'Wombex WOM',
          tokenSymbol: 'wmxWOM',
          underlyingTokenAddr: '0xEfF2B1353Cdcaa2C3279C2bfdE72120c7FfB5E24',
        },
        WOM: {
          tokenName: 'Wombat Token',
          tokenSymbol: 'WOM',
          underlyingTokenAddr: '0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96',
        },
      },
    },
    qWOM_Pool: {
      setting: {
        ...defaultWomPoolConfig,
      },
      assets: {
        qWOM: {
          tokenName: 'Quoll WOM',
          tokenSymbol: 'qWOM',
          underlyingTokenAddr: '0x388D157F0BFdc1d30357AF63a8be10BfF8474f4e',
        },
        WOM: {
          tokenName: 'Wombat Token',
          tokenSymbol: 'WOM',
          underlyingTokenAddr: '0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96',
        },
      },
    },
  },
})

export const DYNAMICPOOL_TOKENS_MAP: PartialRecord<
  Network,
  NetworkPoolInfo<IHighCovRatioFeePoolConfig>
> = injectForkNetwork<NetworkPoolInfo<IHighCovRatioFeePoolConfig>>({
  [Network.BSC_MAINNET]: {
    frxETH_Pool: {
      setting: {
        ...defaultDynamicPoolConfig,
      },
      assets: {
        // sfrxETH: {
        //   tokenName: 'Staked Frax Ether',
        //   tokenSymbol: 'sfrxETH',
        //   underlyingTokenAddr: '0x3Cd55356433C89E50DC51aB07EE0fa0A95623D53',
        //   assetContractName: 'PriceFeedAsset',
        //   priceFeed: {
        //     priceFeedContract: 'GovernedPriceFeed',
        //     deployArgs: [
        //       '0x3Cd55356433C89E50DC51aB07EE0fa0A95623D53',
        //       parseEther('1.029'), // The initial value could be read from convertToAssets at https://etherscan.io/token/0xac3e018457b222d93114458476f3e3416abbe38f#readContract
        //       parseEther('0.01'),
        //     ],
        //   },
        // },
        frxETH: {
          tokenName: 'Frax Ether',
          tokenSymbol: 'frxETH',
          underlyingTokenAddr: '0x64048A7eEcF3a2F1BA9e144aAc3D7dB6e58F555e',
          assetContractName: 'DynamicAsset',
        },
        ETH: {
          tokenName: 'Binance-Peg Ethereum Token',
          tokenSymbol: 'ETH',
          underlyingTokenAddr: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
          assetContractName: 'DynamicAsset',
        },
      },
    },
    BnbxPool: {
      setting: {
        ...defaultDynamicPoolConfig,
        mintFeeThreshold: parseEther('0.00666666666'),
        deploymentNamePrefix: '',
        supportNativeToken: true,
      },
      assets: {
        WBNB: {
          tokenName: 'Wrapped BNB',
          tokenSymbol: 'WBNB',
          underlyingTokenAddr: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
          assetContractName: 'DynamicAsset',
        },
        BNBx: {
          tokenName: 'Liquid Staking BNB',
          tokenSymbol: 'BNBx',
          underlyingTokenAddr: '0x1bdd3Cf7F79cfB8EdbB955f20ad99211551BA275',
          oracleAddress: '0x7276241a669489E4BBB76f63d2A43Bfe63080F2F',
          assetContractName: 'BnbxAsset',
        },
      },
    },
    StkBnbPool: {
      setting: {
        ...defaultDynamicPoolConfig,
        mintFeeThreshold: parseEther('0.00333333333'),
        deploymentNamePrefix: '',
        supportNativeToken: true,
      },
      assets: {
        WBNB: {
          tokenName: 'Wrapped BNB',
          tokenSymbol: 'WBNB',
          underlyingTokenAddr: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
          assetContractName: 'DynamicAsset',
        },
        stkBNB: {
          tokenName: 'Staked BNB',
          tokenSymbol: 'stkBNB',
          underlyingTokenAddr: '0xc2E9d07F66A89c44062459A47a0D2Dc038E4fb16',
          oracleAddress: '0xC228CefDF841dEfDbD5B3a18dFD414cC0dbfa0D8',
          assetContractName: 'StkbnbAsset',
        },
      },
    },
    AnkrBNBPool: {
      setting: {
        ...defaultDynamicPoolConfig,
        mintFeeThreshold: parseEther('0.03'),
        deploymentNamePrefix: '',
        supportNativeToken: true,
      },
      assets: {
        WBNB: {
          tokenName: 'Wrapped BNB',
          tokenSymbol: 'WBNB',
          underlyingToken: Token.WBNB,
          assetContractName: 'DynamicAsset',
        },
        ankrBNB: {
          tokenName: 'Ankr Staked BNB',
          tokenSymbol: 'ankrBNB',
          underlyingToken: Token.ankrBNB,
          oracleAddress: '0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827',
          assetContractName: 'ABnbcAsset',
        },
      },
    },
  },
  [Network.ARBITRUM_MAINNET]: {
    frxETH_Pool: {
      setting: {
        ...defaultDynamicPoolConfig,
        supportNativeToken: true,
      },
      assets: {
        frxETH: {
          tokenName: 'Frax Ether',
          tokenSymbol: 'frxETH',
          underlyingTokenAddr: '0x178412e79c25968a32e89b11f63b33f733770c2a',
          assetContractName: 'DynamicAsset',
        },
        WETH: {
          tokenName: 'Wrapped Ether',
          tokenSymbol: 'WETH',
          underlyingTokenAddr: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          assetContractName: 'DynamicAsset',
        },
      },
    },
  },
})

export const REWARDERS_MAP: PartialRecord<Network, TokenMap<IRewarder>> = injectForkNetwork<TokenMap<IRewarder>>({
  bsc_mainnet: {
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
  },
  bsc_testnet: {
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
  },
})

// IBribe reuses the interface of IRewarder
export const BRIBE_MAPS: PartialRecord<Network, TokenMap<IRewarder>> = injectForkNetwork<TokenMap<IRewarder>>({
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
    CUSDPool_CUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x3ac762C607ed6Dba156cBcF11efF96340e86b490'),
      rewardTokens: [Token.WOM],
    },
    CUSDPool_HAY: {
      ...defaultRewarder(),
      lpToken: Address('0xa6eF6C45EbFDBc13f6D032fbDFeC9b389C1603E5'),
      rewardTokens: [Token.WOM],
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
    ...createBribeConfigFromDeployedAsset('Asset_USDPlus_Pool_USD+', {
      rewardTokens: [Token.USDPlus],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_USDPlus_Pool_USDT+', {
      rewardTokens: [Token.USDPlus],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_USDPlus_Pool_USDC', {
      rewardTokens: [Token.USDPlus],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_AnkrBNBPool_WBNB', {
      rewardTokens: [Token.ANKR],
      // TODO: configure tokenPerSec
      startTimestamp: Epochs.Apr12,
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createBribeConfigFromDeployedAsset('Asset_AnkrBNBPool_ankrBNB', {
      rewardTokens: [Token.ANKR],
      // TODO: configure tokenPerSec
      startTimestamp: Epochs.Apr12,
      operator: ExternalContract.AnkrBribeOperator,
    }),
  },
  bsc_testnet: {
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
      rewardTokens: [Token.USDPlus],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_USDPlus_Pool_DAI+', {
      rewardTokens: [Token.USDPlus],
    }),
    ...createBribeConfigFromDeployedAsset('Asset_USDPlus_Pool_USDC', {
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
      rewardTokens: [Token.USDPlus],
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
        BUSD: {
          tokenName: 'Binance USD',
          tokenSymbol: 'BUSD',
          useMockToken: true,
        },
        vUSDC: { tokenName: 'Venus USDC', tokenSymbol: 'vUSDC', useMockToken: true },
      },
    },
  },
  [Network.AVALANCHE_TESTNET]: {
    stablecoinPool: {
      setting: {
        ...defaultCrossChainPoolConfig,
      },
      assets: {
        BUSD: {
          tokenName: 'Binance USD',
          tokenSymbol: 'BUSD',
          useMockToken: true,
        },
        vUSDC: { tokenName: 'Venus USDC', tokenSymbol: 'vUSDC', useMockToken: true },
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

function createBribeConfigFromDeployedAsset(deploymentName: string, config: Partial<IRewarder>): TokenMap<IRewarder> {
  return {
    [deploymentName]: {
      ...defaultRewarder(),
      lpToken: Deployment(deploymentName),
      ...config,
    },
  }
}
