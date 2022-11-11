import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider'
import { Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'

export async function getDeployedContract(contract: string, contractName = contract): Promise<Contract> {
  const deployment = await deployments.get(contractName)
  return ethers.getContractAt(contract, deployment.address)
}

export async function confirmTxn(response: Promise<TransactionResponse>, confirms = 1): Promise<TransactionReceipt> {
  const txn = await response
  return txn.wait(confirms)
}
