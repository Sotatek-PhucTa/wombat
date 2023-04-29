import { assert } from 'chai'
import { BigNumber, BigNumberish, Contract, ethers } from 'ethers'
import { DeployResult } from 'hardhat-deploy/types'
import { ExternalContract } from '../config/contract'
import { Token } from '../config/token'

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
  OPTIMISM_MAINNET = 'opt_mainnet',
  OPTIMISM_TESTNET = 'opt_testnet',
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
  // ether6 uses bigint. However, hardhat-deploy uses JSON.stringify which does not know how to serialize bigint.
  // see https://github.com/wighawag/hardhat-deploy/issues/439
  tokenPerSec: BigNumberish[]
  operator?: ExternalContract
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
  supportNativeToken: boolean
}

export interface IHighCovRatioFeePoolConfig extends IPoolConfig {
  startCovRatio: BigNumber
  endCovRatio: BigNumber
}

export interface GovernedPriceFeed {
  contract: string
  token: Token
  initialPrice: BigNumberish
  maxDeviation: BigNumberish
}

// TODO: verify mock tokens exist in MOCK_TOKEN_MAP before deployment
export interface IAssetInfo {
  tokenName: string
  tokenSymbol: string
  // TODO: make this required once we separate mock token deployment
  underlyingToken?: Token
  // TODO: migrate underlyingTokenAddr to underlyingToken
  underlyingTokenAddr?: string
  allocPoint?: BigNumberish // default to be 0
  assetContractName?: string // default using Asset
  // TODO: migrate oracleAddress to oracle
  oracle?: ExternalContract
  oracleAddress?: string
  // TODO: separate mock token deployment from asset
  useMockToken?: boolean // to deploy a mock token, this field is required
  priceFeed?: GovernedPriceFeed
  maxSupply?: BigNumberish
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
