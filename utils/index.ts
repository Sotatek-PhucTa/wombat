import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber, Contract } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import { deployments, ethers, upgrades } from 'hardhat'
import { Deployment } from 'hardhat-deploy/types'
import { ValidationOptions } from '@openzeppelin/upgrades-core'
import _ from 'lodash'

export async function getDeployedContract(contract: string, deploymentName = contract): Promise<Contract> {
  const deployment = await deployments.get(deploymentName)
  return ethers.getContractAt(contract, deployment.address)
}

export async function getTestERC20(tokenSymbol: string): Promise<Contract> {
  return getDeployedContract('TestERC20', tokenSymbol)
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
// TODO: create a hardhat task
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
