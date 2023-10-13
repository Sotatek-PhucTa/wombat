import { assert } from 'chai'
import { BigNumber, BigNumberish, Contract } from 'ethers'
import { DeployResult } from 'hardhat-deploy/types'
import { ExternalContract } from '../config/contract'
import { Token } from '../config/token'
import { isChecksumAddress, toChecksumAddress } from '../utils/addresses'

export enum Network {
  HARDHAT = 'hardhat',
  LOCALHOST = 'localhost',
  BSC_MAINNET = 'bsc_mainnet',
  BSC_TESTNET = 'bsc_testnet',
  POLYGON_MAINNET = 'polygon_mainnet',
  POLYGON_TESTNET = 'polygon_testnet',
  AVALANCHE_MAINNET = 'avax_mainnet',
  AVALANCHE_TESTNET = 'avax_testnet',
  ARBITRUM_MAINNET = 'arb_mainnet',
  ARBITRUM_TESTNET = 'arb_testnet',
  OPTIMISM_MAINNET = 'opt_mainnet',
  OPTIMISM_TESTNET = 'opt_testnet',
  ETHEREUM_MAINNET = 'eth_mainnet',
  BASE_MAINNET = 'base_mainnet',
  SCROLL_MAINNET = 'scroll_mainnet',
  SCROLL_TESTNET = 'scroll_testnet',
  SKALE_TESTNET = 'skale_testnet',
  // GOERLI as L1 of ZKSYNC Testnet
  // We need it to config zksync https://era.zksync.io/docs/tools/hardhat/getting-started.html#hardhat-configuration
  GOERLI = 'goerli',
  ZKSYNC_TESTNET = 'zksync_testnet',
}

export interface DeploymentResult {
  deployResult: DeployResult
  contract: Contract
}

export type Deployment = {
  type: 'deployment'
  deployment: string
  network?: Network // default to getCurrentNetwork
}

export type Address = {
  type: 'address'
  address: string
}

export type Unknown = {
  type: 'unknown'
}

export type DeploymentOrAddress = Deployment | Address | Unknown

export function Deployment(deployment: string, network?: Network): Deployment {
  return {
    type: 'deployment',
    deployment,
    network,
  }
}

export function Address(address: string): Address {
  assert(
    isChecksumAddress(address),
    `Address ${address} is not a checksum address. Please use ${toChecksumAddress(address)}.`
  )
  return {
    type: 'address',
    address,
  }
}

// Use for error checking
export function Unknown(): Unknown {
  return {
    type: 'unknown',
  }
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

// interface for RewardInfo struct in solidity
export interface IRewardInfoStruct {
  rewardToken: string
  tokenPerSec: BigNumber
}

export interface IMockTokenInfo {
  tokenName: string
  tokenSymbol: string
  decimalForMockToken: number
}

export interface IWormholeConfig {
  relayer: DeploymentOrAddress
  wormholeBridge: DeploymentOrAddress
}

export interface IWormholeAdaptorConfig {
  adaptorAddr: DeploymentOrAddress
  tokens: Token[]
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

export interface ICrossChainPoolConfig extends IHighCovRatioFeePoolConfig {
  tokensForCreditHaircut: BigNumber
  creditForTokensHaircut: BigNumber
  maximumInboundCredit: BigNumber
  maximumOutboundCredit: BigNumber
  swapCreditForTokensEnabled: boolean
  swapTokensForCreditEnabled: boolean
}

export interface IPriceFeed {
  // TODO: handle fallback price feed
  contract: 'GovernedPriceFeed' | 'ChainlinkPriceFeed' | 'PythPriceFeed'
}

export interface IGovernedPriceFeed extends IPriceFeed {
  token: Token
  initialPrice: BigNumberish
  maxDeviation: BigNumberish
}

// TODO: verify mock tokens exist in MOCK_TOKEN_MAP before deployment
export interface IAssetInfo {
  tokenName: string
  tokenSymbol: string
  underlyingToken: Token
  allocPoint?: BigNumberish // default to be 0
  assetContractName?: string // default using Asset
  oracle?: ExternalContract
  priceFeed?: IPriceFeed
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
