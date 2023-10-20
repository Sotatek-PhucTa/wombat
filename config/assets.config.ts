import { IAssetInfo, TokenMap } from '../types'
import { ExternalContract } from './contract'
import { Token } from './token'

export function BusdAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    BUSD: {
      tokenName: 'Binance USD',
      tokenSymbol: 'BUSD',
      underlyingToken: Token.BUSD,
      ...partial,
    },
  }
}

export function HayAsset(): TokenMap<IAssetInfo> {
  return {
    HAY: {
      tokenName: 'Hay Stablecoin',
      tokenSymbol: 'HAY',
      underlyingToken: Token.HAY,
    },
  }
}

export function UsdcAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    USDC: {
      tokenName: 'USD Coin',
      tokenSymbol: 'USDC',
      underlyingToken: Token.USDC,
      ...partial,
    },
  }
}

export function UsdbcAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    USDbC: {
      tokenName: 'USD Base Coin',
      tokenSymbol: 'USDbC',
      underlyingToken: Token.USDbC,
      ...partial,
    },
  }
}

export function UsdceAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    'USDC.e': {
      tokenName: 'Bridged USDC',
      tokenSymbol: 'USDC.e',
      underlyingToken: Token.USDCe,
      ...partial,
    },
  }
}

export function UsdsAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    USDS: {
      tokenName: 'USDS',
      tokenSymbol: 'USDS',
      underlyingToken: Token.USDS,
      ...partial,
    },
  }
}

export function UsdtAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    USDT: {
      tokenName: 'Tether USD',
      tokenSymbol: 'USDT',
      underlyingToken: Token.USDT,
      ...partial,
    },
  }
}

export function DaiAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    DAI: {
      tokenName: 'Dai Stablecoin',
      tokenSymbol: 'DAI',
      underlyingToken: Token.DAI,
      ...partial,
    },
  }
}

export function CusdAsset(): TokenMap<IAssetInfo> {
  return {
    CUSD: {
      tokenName: 'Coin98 Dollar',
      tokenSymbol: 'CUSD',
      underlyingToken: Token.CUSD,
    },
  }
}

export function UsdPlusAsset(): TokenMap<IAssetInfo> {
  return {
    'USD+': {
      tokenName: 'USD+',
      tokenSymbol: 'USD+',
      underlyingToken: Token.USDPlus,
      assetContractName: 'SkimmableAsset',
    },
  }
}

export function UsdtPlusAsset(): TokenMap<IAssetInfo> {
  return {
    'USDT+': {
      tokenName: 'USDT+',
      tokenSymbol: 'USDT+',
      underlyingToken: Token.USDTPlus,
      assetContractName: 'SkimmableAsset',
    },
  }
}

export function DaiPlusAsset(): TokenMap<IAssetInfo> {
  return {
    'DAI+': {
      tokenName: 'DAI+',
      tokenSymbol: 'DAI+',
      underlyingToken: Token.DAIPlus,
      assetContractName: 'SkimmableAsset',
    },
  }
}

export function FraxAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    FRAX: {
      tokenName: 'Frax',
      tokenSymbol: 'FRAX',
      underlyingToken: Token.FRAX,
      ...partial,
    },
  }
}

export function TusdAsset(): TokenMap<IAssetInfo> {
  return {
    TUSD: {
      tokenName: 'TrueUSD',
      tokenSymbol: 'TUSD',
      underlyingToken: Token.TUSD,
    },
  }
}

export function IusdAsset(): TokenMap<IAssetInfo> {
  return {
    iUSD: {
      tokenName: 'iZUMi Bond USD',
      tokenSymbol: 'iUSD',
      underlyingToken: Token.iUSD,
    },
  }
}

export function AxlUsdcAsset(): TokenMap<IAssetInfo> {
  return {
    axlUSDC: {
      tokenName: 'Axelar Wrapped USDC',
      tokenSymbol: 'axlUSDC',
      underlyingToken: Token.axlUSDC,
    },
  }
}

export function UsddAsset(): TokenMap<IAssetInfo> {
  return {
    USDD: {
      tokenName: 'Decentralized USD',
      tokenSymbol: 'USDD',
      underlyingToken: Token.USDD,
    },
  }
}

export function WxdaiAsset(): TokenMap<IAssetInfo> {
  return {
    WXDAI: {
      tokenName: 'Wrapped XDAI',
      tokenSymbol: 'WXDAI',
      underlyingToken: Token.WXDAI,
    },
  }
}

export function BobAsset(): TokenMap<IAssetInfo> {
  return {
    BOB: {
      tokenName: 'BOB',
      tokenSymbol: 'BOB',
      underlyingToken: Token.BOB,
    },
  }
}

export function MimAsset(): TokenMap<IAssetInfo> {
  return {
    MIM: {
      tokenName: 'Magic Internet Money',
      tokenSymbol: 'MIM',
      underlyingToken: Token.MIM,
    },
  }
}

export function WomAsset(): TokenMap<IAssetInfo> {
  return {
    WOM: {
      tokenName: 'Wombat Token',
      tokenSymbol: 'WOM',
      underlyingToken: Token.WOM,
    },
  }
}

export function MwomAsset(): TokenMap<IAssetInfo> {
  return {
    mWOM: {
      tokenName: 'mWOM',
      tokenSymbol: 'mWOM',
      underlyingToken: Token.mWOM,
    },
  }
}

export function QwomAsset(): TokenMap<IAssetInfo> {
  return {
    qWOM: {
      tokenName: 'Quoll WOM',
      tokenSymbol: 'qWOM',
      underlyingToken: Token.qWOM,
    },
  }
}

export function WmxWomAsset(): TokenMap<IAssetInfo> {
  return {
    wmxWOM: {
      tokenName: 'Wombex WOM',
      tokenSymbol: 'wmxWOM',
      underlyingToken: Token.wmxWOM,
    },
  }
}

export function MaiAsset(): TokenMap<IAssetInfo> {
  return {
    MAI: {
      tokenName: 'Mai Stablecoin',
      tokenSymbol: 'MAI',
      underlyingToken: Token.MAI,
    },
  }
}

export function WbnbAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    WBNB: {
      tokenName: 'Wrapped BNB',
      tokenSymbol: 'WBNB',
      underlyingToken: Token.WBNB,
      assetContractName: 'DynamicAsset',
      ...partial,
    },
  }
}

export function BnbxAsset(): TokenMap<IAssetInfo> {
  return {
    BNBx: {
      tokenName: 'Liquid Staking BNB',
      tokenSymbol: 'BNBx',
      underlyingToken: Token.BNBx,
      oracle: ExternalContract.BNBxOracle,
      assetContractName: 'BnbxAsset',
    },
  }
}

export function BnbyAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    BNBy: {
      tokenName: 'BNB Yield',
      tokenSymbol: 'BNBy',
      underlyingToken: Token.BNBy,
      oracle: ExternalContract.BNByOracle,
      assetContractName: 'BnbxAsset',
      ...partial,
    },
  }
}

export function SnBNBAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    SnBNB: {
      tokenName: 'Synclub Staked BNB',
      tokenSymbol: 'SnBNB',
      underlyingToken: Token.SnBNB,
      oracle: ExternalContract.SnBNBOracle,
      assetContractName: 'SnBNBAsset',
      ...partial,
    },
  }
}

export function zBNBAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    zBNB: {
      tokenName: 'Zasset zBNB',
      tokenSymbol: 'zBNB',
      underlyingToken: Token.zBNB,
      ...partial,
    },
  }
}

export function zUSDAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    zUSD: {
      tokenName: 'Zasset zUSD',
      tokenSymbol: 'zUSD',
      underlyingToken: Token.zUSD,
      ...partial,
    },
  }
}

export function JusdcAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    jUSDC: {
      tokenName: 'Jones USDC',
      tokenSymbol: 'jUSDC',
      underlyingToken: Token.jUSDC,
      assetContractName: 'jUsdcAsset',
      oracle: ExternalContract.jUSDCOracle,
      ...partial,
    },
  }
}

export function StkBnbAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    stkBNB: {
      tokenName: 'Staked BNB',
      tokenSymbol: 'stkBNB',
      underlyingToken: Token.stkBNB,
      oracle: ExternalContract.StkBNBOracle,
      assetContractName: 'StkbnbAsset',
      ...partial,
    },
  }
}

export function AnkrBnbAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    ankrBNB: {
      tokenName: 'Ankr Staked BNB',
      tokenSymbol: 'ankrBNB',
      underlyingToken: Token.ankrBNB,
      oracle: ExternalContract.AnkrBNBOracle,
      assetContractName: 'AnkrStakingAsset',
      ...partial,
    },
  }
}

export function AnkrEthAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    ankrETH: {
      tokenName: 'Ankr Staked ETH',
      tokenSymbol: 'ankrETH',
      underlyingToken: Token.ankrETH,
      assetContractName: 'AnkrStakingAsset',
      oracle: ExternalContract.AnkrETHOracle,
      ...partial,
    },
  }
}

export function WstETHAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    wstETH: {
      tokenName: 'Wrapped liquid staked Ether 2.0',
      tokenSymbol: 'wstETH',
      underlyingToken: Token.wstETH,
      assetContractName: 'WstETHAsset',
      oracle: ExternalContract.ChainlinkOracleWstETH,
      ...partial,
    },
  }
}

export function EthAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    ETH: {
      tokenName: 'Binance-Peg Ethereum Token',
      tokenSymbol: 'ETH',
      underlyingToken: Token.ETH,
      assetContractName: 'DynamicAsset',
      ...partial,
    },
  }
}

export function FrxEthAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    frxETH: {
      tokenName: 'Frax Ether',
      tokenSymbol: 'frxETH',
      underlyingToken: Token.frxETH,
      assetContractName: 'DynamicAsset',
      ...partial,
    },
  }
}

export function SfrxEthAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    sfrxETH: {
      tokenName: 'Staked Frax Ether',
      tokenSymbol: 'sfrxETH',
      underlyingToken: Token.sfrxETH,
      ...partial,
    },
  }
}

export function WbethAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    wBETH: {
      tokenName: 'Wrapped Binance Beacon ETH (wBETH)',
      tokenSymbol: 'wBETH',
      underlyingToken: Token.wBETH,
      assetContractName: 'WBETHAsset',
      oracle: ExternalContract.wBETHOracle,
      ...partial,
    },
  }
}

export function WethAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    WETH: {
      tokenName: 'Wrapped Ether',
      tokenSymbol: 'WETH',
      underlyingToken: Token.WETH,
      assetContractName: 'DynamicAsset',
      ...partial,
    },
  }
}

export function BtcAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    BTC: {
      tokenName: 'Binance-Peg BTCB Token',
      tokenSymbol: 'BTCB',
      underlyingToken: Token.BTC,
      ...partial,
    },
  }
}

export function VusdcAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    vUSDC: {
      tokenName: 'Venus USDC',
      tokenSymbol: 'vUSDC',
      underlyingToken: Token.vUSDC,
      ...partial,
    },
  }
}

export function PendleAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    PENDLE: {
      tokenName: 'Pendle',
      tokenSymbol: 'PENDLE',
      underlyingToken: Token.PENDLE,
      ...partial,
    },
  }
}

export function MpendleAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    mPendle: {
      tokenName: 'mPendle',
      tokenSymbol: 'mPendle',
      underlyingToken: Token.mPendle,
      ...partial,
    },
  }
}

export function FUsdcAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    fUSDC: {
      tokenName: 'Fluid USDC',
      tokenSymbol: 'fUSDC',
      underlyingToken: Token.fUSDC,
      ...partial,
    },
  }
}

export function EPendleAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    ePendle: {
      tokenName: 'Equilibria Pendle',
      tokenSymbol: 'ePendle',
      underlyingToken: Token.ePendle,
      ...partial,
    },
  }
}

export function XEqbAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    xEQB: {
      tokenName: 'max EQB',
      tokenSymbol: 'xEQB',
      underlyingToken: Token.xEQB,
      ...partial,
    },
  }
}

export function RBnbAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    rBNB: {
      tokenName: 'StaFi rBNB',
      tokenSymbol: 'rBNB',
      underlyingToken: Token.rBNB,
      oracle: ExternalContract.rBNBOracle,
      assetContractName: 'rBNBAsset',
      ...partial,
    },
  }
}

export function EthxAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    ETHx: {
      tokenName: 'ETHx',
      tokenSymbol: 'ETHx',
      underlyingToken: Token.ETHx,
      assetContractName: 'ERC4626Asset',
      oracle: ExternalContract.StaderETHxStakingManager,
      ...partial,
    },
  }
}

export function AgEURAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    agEUR: {
      tokenName: 'agEUR',
      tokenSymbol: 'agEUR',
      underlyingToken: Token.agEUR,
      ...partial,
    },
  }
}

export function EuroCAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    EUROC: {
      tokenName: 'Euro Coin',
      tokenSymbol: 'EUROC',
      underlyingToken: Token.EUROC,
      ...partial,
    },
  }
}

export function EureAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    EURe: {
      tokenName: 'Monerium EUR emoney',
      tokenSymbol: 'EURe',
      underlyingToken: Token.EURe,
      ...partial,
    },
  }
}

export function WavaxAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    WAVAX: {
      tokenName: 'Wrapped AVAX',
      tokenSymbol: 'WAVAX',
      underlyingToken: Token.WAVAX,
      assetContractName: 'DynamicAsset',
      ...partial,
    },
  }
}

export function SavaxAsset(partial?: Partial<IAssetInfo>): TokenMap<IAssetInfo> {
  return {
    sAVAX: {
      tokenName: 'Staked AVAX',
      tokenSymbol: 'sAVAX',
      underlyingToken: Token.sAVAX,
      oracle: ExternalContract.sAVAXOracle,
      assetContractName: 'sAVAXAsset',
      ...partial,
    },
  }
}
