import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber, Contract } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import { deployments, ethers, upgrades } from 'hardhat'
import { Deployment } from 'hardhat-deploy/types'
import { ValidationOptions } from '@openzeppelin/upgrades-core'
import _ from 'lodash'
import { DeploymentOrAddress, IAssetInfo } from '../types'
import { getTokenAddress } from '../config/token'

export async function getAddress(deploymentOrAddress: DeploymentOrAddress): Promise<string> {
  if (ethers.utils.isAddress(deploymentOrAddress.deploymentOrAddress)) {
    return deploymentOrAddress.deploymentOrAddress
  } else {
    const deployment = await deployments.get(deploymentOrAddress.deploymentOrAddress)
    return deployment.address
  }
}

export async function getDeployedContract(contract: string, deploymentName = contract): Promise<Contract> {
  const deployment = await deployments.get(deploymentName)
  return ethers.getContractAt(contract, deployment.address)
}

export async function getTestERC20(tokenSymbol: string): Promise<Contract> {
  return getDeployedContract('TestERC20', tokenSymbol)
}

export async function getUnderlyingTokenAddr(assetInfo: IAssetInfo): Promise<string> {
  const address = assetInfo.useMockToken
    ? (await deployments.get(assetInfo.tokenSymbol)).address
    : assetInfo.underlyingToken
    ? await getTokenAddress(assetInfo.underlyingToken)
    : assetInfo.underlyingTokenAddr
  if (address === undefined) {
    throw `underlying token is undefined ${assetInfo}`
  }
  return address
}

export async function confirmTxn(response: Promise<TransactionResponse>, confirms = 1): Promise<TransactionReceipt> {
  const txn = await response
  return txn.wait(confirms)
}

// Check if a user is an owner of a contract.
// Expect owner is available in a view function.
export async function isOwner(contract: Contract, user: string) {
  const owner = await contract.owner()
  return user.toLowerCase() == owner.toLowerCase()
}

export async function setRewarder(masterWombat: Contract, owner: SignerWithAddress, lpToken: string, rewarder: string) {
  const pid = await masterWombat.getAssetPid(lpToken)
  await confirmTxn(masterWombat.connect(owner).setRewarder(pid, rewarder))
}

export function logVerifyCommand(network: string, deployment: Deployment) {
  if (network === 'hardhat') {
    return
  }

  if (deployment.implementation) {
    console.log(
      `This is a proxy. To verify its implementation, run: hh verify --network ${network} ${deployment.implementation}`
    )
  } else {
    const verifyArgs = deployment.args?.map((arg) => (typeof arg == 'string' ? `'${arg}'` : arg)).join(' ')
    console.log(`To verify, run: hh verify --network ${network} ${deployment.address} ${verifyArgs}`)
  }
}

// Print all assets with some alloc points in MasterWombatV2
// Typical usage in hardhat console.
export async function printMasterWombatV2AllocPoints() {
  const masterWombatV2 = await getDeployedContract('MasterWombatV2')
  const poolLength = await masterWombatV2.poolLength()
  const poolInfos = await Promise.all(_.range(0, poolLength).map((i) => masterWombatV2.poolInfo(i)))
  return Promise.all(
    poolInfos
      .filter((poolInfo) => !poolInfo.allocPoint.isZero())
      .map(async (poolInfo) => {
        const asset = await ethers.getContractAt('Asset', poolInfo.lpToken)
        const name = await asset.name()
        const pool = await asset.pool()
        return {
          pool,
          name,
          lpToken: poolInfo.lpToken,
          allocPoint: poolInfo.allocPoint.toNumber(),
        }
      })
  )
}

export async function printMasterWombatV2Rewarders() {
  const masterWombatV2 = await getDeployedContract('MasterWombatV2')
  const poolLength = await masterWombatV2.poolLength()
  const poolInfos = await Promise.all(_.range(0, poolLength).map((i) => masterWombatV2.poolInfo(i)))
  return Promise.all(
    poolInfos
      .filter((poolInfo) => poolInfo.rewarder != ethers.constants.AddressZero)
      .map(async (poolInfo) => {
        return {
          rewarder: poolInfo.rewarder,
          lpToken: poolInfo.lpToken,
        }
      })
  )
}

export async function printMultiRewarderV3Balances() {
  const names = Object.keys(await deployments.all()).filter((name) => name.includes('MultiRewarderPerSec_V3'))

  return Promise.all(
    names.map(async (name) => {
      const contract = await getDeployedContract('MultiRewarderPerSec', name)
      const balances = await contract.balances()
      const tokens = await contract.rewardTokens()
      return {
        rewarder: name,
        rewarderAddress: contract.address,
        lpToken: await contract.lpToken(),
        balances: balances.map((balance: BigNumber) => formatEther(balance)),
        rewardTokens: tokens,
      }
    })
  )
}

export async function printBribeBalances() {
  const names = Object.keys(await deployments.all()).filter((name) => name.includes('Bribe'))

  return Promise.all(
    names.map(async (name) => {
      const contract = await getDeployedContract('Bribe', name)
      const balances = await contract.balances()
      const tokens = await contract.rewardTokens()
      const decimals = await Promise.all(
        tokens.map(async (address: string) => {
          const token = await ethers.getContractAt('ERC20', address)
          return token.decimals()
        })
      )
      return {
        rewarder: name,
        rewarderAddress: contract.address,
        lpToken: await contract.lpToken(),
        balances: balances.map((balance: BigNumber) => formatEther(balance)),
        rewardTokens: tokens,
        decimals,
      }
    })
  )
}

function printBigNumber(num: BigNumber) {
  return num.div(1e12).toNumber() / 1e6
}

// print pool's ampFactor and haircut
export async function printDeployedPoolsArgs() {
  const pools = Object.keys(await deployments.all()).filter((name) => name.includes('Pool') && name.includes('Proxy'))
  const data = await Promise.all(
    pools.map(async (name) => {
      const pool = await getDeployedContract('Pool', name)
      return {
        name,
        pool: pool.address,
        ampFactor: printBigNumber(await pool.ampFactor()),
        haircut: printBigNumber(await pool.haircutRate()),
      }
    })
  )
  console.table(data)
}

export async function validateUpgrade(oldContract: string, newContract: string, opts?: ValidationOptions) {
  const oldFactory = await ethers.getContractFactory(oldContract)
  const newFactory = await ethers.getContractFactory(newContract)
  await upgrades.validateUpgrade(oldFactory, newFactory, {
    // used by OZ dependency below:
    // @openzeppelin/contracts/utils/Address.sol:185: Use of delegatecall is not allowed
    unsafeAllow: ['delegatecall'],
    ...opts,
  })
  console.log('validate succeeeds')
}

export function getDeadlineFromNow(secondSince: string | number): number {
  return Math.round(Date.now() / 1000) + Number(secondSince)
}

// Print governance param of a pool. This includes:
// feeTo, lpDividendRatio, retentionRatio, and mintFeeThreshold.
export async function printPoolGovernanceParam(address: string) {
  const pool = await ethers.getContractAt('Pool', address)
  const table = {
    feeTo: await pool.feeTo(),
    lpDividendRatio: printBigNumber(await pool.lpDividendRatio()),
    retentionRatio: printBigNumber(await pool.retentionRatio()),
    mintFeeThreshold: printBigNumber(await pool.mintFeeThreshold()),
  }
  console.table(table)
}

export async function printAssetInfo() {
  // Use startsWith instead of includes since Bribe also has Asset in its name.
  const names = Object.keys(await deployments.all()).filter((name) => name.startsWith('Asset'))
  console.table(
    await Promise.all(
      names.map(async (name) => {
        const asset = await getDeployedContract('Asset', name)
        return {
          name,
          address: asset.address,
          maxSupply: formatEther(await asset.maxSupply()),
        }
      })
    )
  )
}
