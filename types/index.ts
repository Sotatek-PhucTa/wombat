import { assert } from 'chai'
import { BigNumber, BigNumberish, Contract, ethers } from 'ethers'
import { Token } from '../config/token'
import { DeployResult } from 'hardhat-deploy/types'

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

export interface DeploymentResult {
  deployResult: DeployResult
  contract: Contract
}

export function Deployment(deployment: string): DeploymentOrAddress {
  return { deploymentOrAddress: deployment }
}

export function Address(address: string): DeploymentOrAddress {
  assert(ethers.utils.isAddress(address))
  return { deploymentOrAddress: address }
}

// Use for error checking
export function Unknown(): DeploymentOrAddress {
  return { deploymentOrAddress: 'unknown' }
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
  lpToken: DeploymentOrAddress
  rewardTokens: Token[]
  startTimestamp?: number
  secondsToStart?: number
  tokenPerSec: bigint[]
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

export interface IPoolConfig {
  ampFactor: BigNumber
  haircut: BigNumber
  mintFeeThreshold: BigNumber
  lpDividendRatio: BigNumber
  retentionRatio: BigNumber
  deploymentNamePrefix: string
}

export interface IHighCovRatioFeePoolConfig extends IPoolConfig {
  startCovRatio: BigNumber
  endCovRatio: BigNumber
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
export interface PoolInfo<T extends IPoolConfig> {
  setting: T
  assets: TokenMap<IAssetInfo>
}
export type NetworkPoolInfo<T extends IPoolConfig> = Record<PoolName, PoolInfo<T>>
