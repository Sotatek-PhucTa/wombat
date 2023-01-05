import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { deployments, ethers, upgrades } from 'hardhat'
import { Deployment } from 'hardhat-deploy/types'
import { ValidationOptions } from '@openzeppelin/upgrades-core'
import _ from 'lodash'

export async function getDeployedContract(contract: string, contractName = contract): Promise<Contract> {
  const deployment = await deployments.get(contractName)
  return ethers.getContractAt(contract, deployment.address)
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
