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
