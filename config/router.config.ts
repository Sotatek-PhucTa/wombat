import { Network } from '../types'
import { getCurrentNetwork } from '../types/network'
import { Token } from './token'

export function getWrappedNativeToken(): Token {
  const network = getCurrentNetwork()
  return WRAPPED_NATIVE_TOKENS_MAP[network]
}

const WRAPPED_NATIVE_TOKENS_MAP: Record<Network, Token> = {
  [Network.HARDHAT]: Token.BUSD,
  [Network.LOCALHOST]: Token.BUSD,
  [Network.BSC_MAINNET]: Token.WBNB,
  [Network.BSC_TESTNET]: Token.WBNB,
  [Network.POLYGON_MAINNET]: Token.WMATIC,
  [Network.POLYGON_TESTNET]: Token.WMATIC,
  [Network.AVALANCHE_TESTNET]: Token.WAVAX,
  [Network.ARBITRUM_MAINNET]: Token.WETH,
  [Network.ARBITRUM_TESTNET]: Token.UNKNOWN,
  [Network.OPTIMISM_MAINNET]: Token.WETH,
  [Network.OPTIMISM_TESTNET]: Token.UNKNOWN,
  [Network.ETHEREUM_MAINNET]: Token.WETH,
}
