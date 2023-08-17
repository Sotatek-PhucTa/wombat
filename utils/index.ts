import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber, Contract } from 'ethers'
import { formatEther, formatUnits, parseEther } from 'ethers/lib/utils'
import { deployments, ethers, getNamedAccounts, upgrades } from 'hardhat'
import { Deployment } from 'hardhat-deploy/types'
import { ValidationOptions } from '@openzeppelin/upgrades-core'
import _ from 'lodash'
import { DeploymentOrAddress, IAssetInfo, Network } from '../types'
import { getTokenAddress } from '../config/token'
import { HighCovRatioFeePoolV3, TestERC20 } from '../build/typechain'
import hre from 'hardhat'
import { setBalance } from '@nomicfoundation/hardhat-network-helpers'
import { getCurrentNetwork } from '../types/network'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { convertTokenPerSecToTokenPerEpoch } from '../config/emission'
import { isSameAddress } from './addresses'
import assert from 'assert'
import path from 'path'

export * as deploy from './deploy'
export * as multisig from './multisig'
export * as addresses from './addresses'

export function isForkedNetwork() {
  // See .env for the default value
  return process.env.FORK_NETWORK != 'false'
}

export async function impersonateAsMultisig(fn: (signer: SignerWithAddress) => Promise<unknown>) {
  const { multisig } = await getNamedAccounts()
  setBalance(multisig, parseEther('10')) // for gas
  const signer = await ethers.getImpersonatedSigner(multisig)
  await fn(signer)
}

export async function concatAll<T>(...promises: Promise<T[]>[]): Promise<T[]> {
  const txns = await Promise.all(promises)
  return txns.flat()
}

export async function getAddress(deploymentOrAddress: DeploymentOrAddress): Promise<string> {
  switch (deploymentOrAddress.type) {
    case 'address': {
      assert(ethers.utils.isAddress(deploymentOrAddress.address), 'invalid adddress')
      return deploymentOrAddress.address
    }
    case 'deployment': {
      const network = deploymentOrAddress.network ?? getCurrentNetwork()
      const deploymentName = [Network.HARDHAT, Network.LOCALHOST].includes(network)
        ? deploymentOrAddress.deployment // deployments.fixture does not have network prefix
        : path.join(network, deploymentOrAddress.deployment)
      const deployment = await deployments.get(deploymentName)
      return deployment.address
    }
    case 'unknown': {
      throw new Error(`Unknown deploymentOrAddress type: ${deploymentOrAddress.type}`)
    }
    default: {
      return {} as never
    }
  }
}

export async function getDeployedContract(contract: string, deploymentName = contract): Promise<Contract> {
  const deployment = await deployments.get(deploymentName)
  return ethers.getContractAt(contract, deployment.address)
}

export async function getTestERC20(tokenSymbol: string): Promise<TestERC20> {
  return getDeployedContract('TestERC20', tokenSymbol) as Promise<TestERC20>
}

export function getUnderlyingTokenAddr(assetInfo: IAssetInfo): Promise<string> {
  return getTokenAddress(assetInfo.underlyingToken)
}

export async function confirmTxn(response: Promise<TransactionResponse>, confirms = 1): Promise<TransactionReceipt> {
  const txn = await response
  return txn.wait(confirms)
}

// Check if a user is an owner of a contract.
// Expect owner is available in a view function.
export async function isOwner(contract: Contract, user: string) {
  const owner = await contract.owner()
  return isSameAddress(user, owner)
}

export async function setRewarder(masterWombat: Contract, owner: SignerWithAddress, lpToken: string, rewarder: string) {
  const pid = await masterWombat.getAssetPid(lpToken)
  await confirmTxn(masterWombat.connect(owner).setRewarder(pid, rewarder))
}

export function logVerifyCommand(deployment: Deployment) {
  const network = getCurrentNetwork()
  if (!isForkedNetwork() && [Network.HARDHAT, Network.LOCALHOST].includes(network)) {
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

// This is useful for when your constructor arguments are too complex for command line usage.
// See https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify#complex-arguments
export async function verifyDeployedContract(deploymentName: string) {
  const deployment = await deployments.get(deploymentName)
  return hre.run('verify:verify', {
    address: deployment.address,
    constructorArguments: deployment.args || [],
  })
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
  const data = await Promise.all(
    names.flatMap(async (name) => {
      const contract = await getDeployedContract('MultiRewarderPerSec', name)
      const lpToken = await contract.lpToken()
      const rewardInfos = await getRewardInfos(contract)
      return rewardInfos.map((info) => {
        return {
          rewarder: name,
          ...info,
          rewarderAddress: contract.address,
          lpToken,
        }
      })
    })
  )
  console.table(data.flat())
}

export async function printBribeBalances() {
  const names = Object.keys(await deployments.all()).filter((name) => name.includes('Bribe'))
  const data = await Promise.all(
    names.flatMap(async (name) => {
      const contract = await getDeployedContract('Bribe', name)
      const lpToken = await contract.lpToken()
      const rewardInfos = await getRewardInfos(contract)
      return rewardInfos.map((info) => {
        return {
          rewarder: name,
          ...info,
          rewarderAddress: contract.address,
          lpToken,
        }
      })
    })
  )
  console.table(data.flat())
}

// contract must be rewarder or bribe
async function getRewardInfos(contract: Contract) {
  return Promise.all(
    _.range(0, await contract.rewardLength()).map(async (i) => {
      const { rewardToken, tokenPerSec } = await contract.rewardInfo(i)
      const token = await ethers.getContractAt('ERC20', rewardToken)
      const decimals = await token.decimals()
      const balance = await token.balanceOf(contract.address)
      const daysLeft = !tokenPerSec.isZero() ? balance.div(tokenPerSec).toNumber() / (24 * 3600) : NaN
      return {
        symbol: await token.symbol(),
        tokenPerEpoch: formatUnits(convertTokenPerSecToTokenPerEpoch(tokenPerSec), decimals),
        daysLeft,
        balance: formatUnits(balance, decimals),
      }
    })
  )
}

function printBigNumber(num: BigNumber) {
  return num.div(1e12).toNumber() / 1e6
}

// print pool's ampFactor and haircut
const deprecatedPools = ['DynamicPool_01_Proxy']
export async function printDeployedPoolsArgs() {
  const pools = Object.keys(await deployments.all()).filter(
    (name) => name.includes('Pool') && name.includes('Proxy') && !deprecatedPools.includes(name)
  )
  const data = await Promise.all(
    pools.map(async (name) => {
      const pool = (await getDeployedContract('HighCovRatioFeePoolV3', name)) as HighCovRatioFeePoolV3
      let startCovRatio
      let endCovRatio
      let globalEquilCovRatio
      try {
        startCovRatio = printBigNumber(await pool.startCovRatio())
        endCovRatio = printBigNumber(await pool.endCovRatio())
      } catch (e) {
        startCovRatio = 'N/A'
        endCovRatio = 'N/A'
      }
      try {
        globalEquilCovRatio = printBigNumber((await pool.globalEquilCovRatio()).equilCovRatio)
      } catch (e) {
        globalEquilCovRatio = 'N/A'
      }
      return {
        name: name.slice(0, -6),
        ampFactor: printBigNumber(await pool.ampFactor()),
        haircut: printBigNumber(await pool.haircutRate()),
        feeThshl: printBigNumber(await pool.mintFeeThreshold()),
        startCR: startCovRatio,
        endCR: endCovRatio,
        'r*': globalEquilCovRatio,
        address: pool.address,
      }
    })
  )

  // sort by amp. factor
  console.table(data.sort((x, y) => x.ampFactor - y.ampFactor))
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

export async function getDeadlineFromNow(secondSince: number): Promise<number> {
  const now = [Network.HARDHAT, Network.LOCALHOST].includes(getCurrentNetwork())
    ? await time.latest()
    : Math.round(Date.now() / 1000)
  return now + secondSince
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

export async function printVoterInfos() {
  const voter = await getDeployedContract('Voter')
  const length = await voter.lpTokenLength()
  const lpTokens = await Promise.all(_.range(0, length).map((i) => voter.lpTokens(i)))
  const infos = await Promise.all(
    lpTokens.map(async (lpToken) => {
      const { allocPoint, voteWeight } = await voter.weights(lpToken)
      const asset = await ethers.getContractAt('Asset', lpToken)
      return {
        name: await asset.name(),
        lpToken,
        allocPoint: formatEther(allocPoint),
        voteWeight: formatEther(voteWeight),
      }
    })
  )
  console.table(infos)
}
