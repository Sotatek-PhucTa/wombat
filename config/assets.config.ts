import { IAssetInfo, TokenMap } from '../types'
import { Token } from './token'

export function HayAsset(): TokenMap<IAssetInfo> {
  return {
    HAY: {
      tokenName: 'Hay Stablecoin',
      tokenSymbol: 'HAY',
      underlyingToken: Token.HAY,
    },
  }
}

export function UsdcAsset(): TokenMap<IAssetInfo> {
  return {
    USDC: {
      tokenName: 'USD Coin',
      tokenSymbol: 'USDC',
      underlyingToken: Token.USDC,
    },
  }
}

export function UsdtAsset(): TokenMap<IAssetInfo> {
  return {
    USDT: {
      tokenName: 'Tether USD',
      tokenSymbol: 'USDT',
      underlyingToken: Token.USDT,
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

export function FraxAsset(): TokenMap<IAssetInfo> {
  return {
    FRAX: {
      tokenName: 'Frax',
      tokenSymbol: 'FRAX',
      underlyingToken: Token.FRAX,
    },
  }
}
