import { assert } from 'chai'
import { Contract } from 'ethers'
import { BatchTransaction, validateTransactionsInBatch, BatchFile, ContractMethod, ContractInput } from './tx-builder'

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
    safe[fn] = (...args: { toString: () => string }[]) => {
      return createTransaction(
        contract,
        name,
        args.map((arg) => arg.toString())
      )
    }
  })

  return safe
}

export function createTransaction(contract: Contract, method: string, args: string[]): BatchTransaction {
  const fragment = contract.interface.getFunction(method)
  assert(fragment.inputs.length === args.length, 'Invalid number of arguments')
  const values = fragment.inputs.reduce((acc, param, index) => {
    return {
      ...acc,
      [param.name]: args[index],
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
        type: paramType.baseType,
      } as ContractInput)
  )

  return {
    inputs,
    name,
    payable: fragment.payable,
  }
}
