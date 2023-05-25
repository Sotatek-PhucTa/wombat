import { assert } from 'chai'
import { Contract } from 'ethers'
import { BatchTransaction, validateTransactionsInBatch, BatchFile, ContractMethod, ContractInput } from './tx-builder'
import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { TransactionResponse } from '@ethersproject/providers'
import { decodeParam, encodeParam } from './params'

// A Safe generates BatchTransaction instead of signing on-chain transactions.
export interface Safe {
  [key: string]: (...args: { toString: () => string }[]) => BatchTransaction
}

// Create a Safe from an ether.js Contract.
// Example usage: Safe(pool).addAsset(0x1, 0x2).
export function Safe(contract: Contract): Safe {
  const safe: Safe = {
    connect: () => {
      throw new Error('Not implemented')
    },
  }

  Object.keys(contract.interface.functions).map((name: string) => {
    const fn = name.split('(')[0]
    assert(!safe[fn], `Function ${fn} already exists on Safe`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    safe[fn] = (...args: any[]) => {
      return createTransaction(contract, name, args)
    }
  })

  return safe
}

// Execute a batch transaction as a given account.
export async function executeBatchTransaction(
  signer: SignerWithAddress,
  txn: BatchTransaction
): Promise<TransactionResponse> {
  return signer.sendTransaction({ to: txn.to, data: txn.data || encodeData(txn), value: 0 })
}

export function encodeData(txn: BatchTransaction): string {
  assert(txn.contractMethod && txn.contractInputsValues, 'Missing contract method or inputs')
  // This is a function, not other types: deploy, events, or errors.
  // https://docs.ethers.org/v5/api/utils/abi/interface/#Interface--properties
  const iface = new ethers.utils.Interface(`["function ${txn.contractMethod.name}"]`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values = txn.contractMethod.inputs.reduce<any>((acc, input) => {
    assert(txn.contractInputsValues, 'Missing contract inputs')
    const value = decodeParam(input.type, txn.contractInputsValues[input.name])
    // Do not use .concat here since it will flatten the value if the value is an array.
    return [...acc, value]
  }, [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return iface.encodeFunctionData(txn.contractMethod.name, values as unknown as any[])
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createTransaction(contract: Contract, method: string, args: any[]): BatchTransaction {
  const fragment = contract.interface.getFunction(method)
  assert(fragment.inputs.length === args.length, 'Invalid number of arguments')
  const values = fragment.inputs.reduce((acc, param, index) => {
    return {
      ...acc,
      [param.name]: encodeParam(param.baseType, args[index]),
    }
  }, {})

  const transaction: BatchTransaction = {
    to: contract.address,
    value: '0',
    contractMethod: getContractMethod(contract, method),
    contractInputsValues: values,
  }
  assert(
    validateTransactionsInBatch({
      transactions: [transaction],
    } as BatchFile),
    `Invalid transactions in batch file: ${JSON.stringify(transaction)}`
  )
  return transaction
}

function getContractMethod(contract: Contract, name: string): ContractMethod {
  const fragment = contract.interface.getFunction(name)
  const inputs = fragment.inputs.map(
    (paramType) =>
      ({
        internalType: paramType.type,
        name: paramType.name,
        type: paramType.type,
      } as ContractInput)
  )

  return {
    inputs,
    name,
    payable: fragment.payable,
  }
}
