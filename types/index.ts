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

export interface IAssetInfo {
  tokenName: string
  tokenSymbol: string
  underlyingTokenAddr?: string
  allocPoint?: BigNumberish // default to be 0
  assetContractName?: string // default using Asset
  oracleAddress?: string
  decimalForMockToken?: number // to deploy a mock token, this field is required
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
export type PoolInfo = Record<TokenSymbol, IAssetInfo>
export type NetworkPoolInfo = Record<PoolName, PoolInfo>
