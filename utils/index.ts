import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { Deployment } from 'hardhat-deploy/types'

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
  const verifyArgs = deployment.args?.map((arg) => (typeof arg == 'string' ? `'${arg}'` : arg)).join(' ')
  console.log(`To verify, run: hh verify --network ${network} ${deployment.address} ${verifyArgs}`)
}
