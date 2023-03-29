import { BigNumberish } from 'ethers'

export enum Network {
  HARDHAT = 'hardhat',
  LOCALHOST = 'localhost',
  BSC_MAINNET = 'bsc_mainnet',
  BSC_TESTNET = 'bsc_testnet',
  POLYGON_MAINNET = 'polygon_mainnet',
  POLYGON_TESTNET = 'polygon_testnet',
  AVALANCHE_TESTNET = 'avax_testnet',
  ARBITRUM_MAINNET = 'arbitrum_mainnet',
  ARBITRUM_TESTNET = 'arbitrum_testnet',
}

export interface DeploymentOrAddress {
  deploymentOrAddress: string
}

/**
 * @deprecated use PartialRecord<Network, NetworkPoolInfo>
 */
export interface ITokens<T> {
  [network: string]: T
}

/**
 * @deprecated use PoolInfo
 */
export interface ITokensInfo {
  [token: string]: unknown[]
}

export interface IRewarder {
  lpToken: string
  rewardToken: string
  startTimestamp?: number
  secondsToStart?: number
  tokenPerSec: BigNumberish
}

export interface IMockTokenInfo {
  tokenName: string
  tokenSymbol: string
  decimalForMockToken: number
}

export interface IWormholeConfig {
  relayer: string
  wormholeBridge: string
  consistencyLevel: number
}

export interface IWormholeAdaptorConfig {
  adaptorAddr: string
  tokens: string[]
}

// TODO: verify mock tokens exist in MOCK_TOKEN_MAP before deployment
export interface IAssetInfo {
  tokenName: string
  tokenSymbol: string
  underlyingTokenAddr?: string
  allocPoint?: BigNumberish // default to be 0
  assetContractName?: string // default using Asset
  oracleAddress?: string
  useMockToken?: boolean // to deploy a mock token, this field is required
  priceFeed?: {
    priceFeedContract: string
    deployArgs: unknown[]
  } // to be used by PriceFeedAsset
}

export type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T
}

export type PoolName = string
export type TokenSymbol = string
export type TokenMap<T> = Record<TokenSymbol, T>
export type PoolInfo = TokenMap<IAssetInfo>
export type NetworkPoolInfo = Record<PoolName, PoolInfo>
