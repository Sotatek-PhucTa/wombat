import assert from 'assert'

// Copied from tx-builder at https://github.com/safe-global/safe-react-apps/blob/HEAD/apps/tx-builder/src/typings/models.ts
export interface BatchFile {
  version: string
  chainId: string
  createdAt: number
  meta: BatchFileMeta
  transactions: BatchTransaction[]
}

export interface BatchFileMeta {
  txBuilderVersion?: string
  checksum?: string
  createdFromSafeAddress?: string
  createdFromOwnerAddress?: string
  name: string
  description?: string
}

export interface BatchTransaction {
  to: string
  value: string
  data?: string
  contractMethod?: ContractMethod
  contractInputsValues?: { [key: string]: string }
}

export interface ContractMethod {
  inputs: ContractInput[]
  name: string
  payable: boolean
}

export interface ContractInput {
  internalType: string
  name: string
  type: string
  components?: ContractInput[]
}

// Copied below from tx-builder repo at https://github.com/safe-global/safe-react-apps/blob/6b1562f59eeaff662c212ee0b71f7df602cf0185/apps/tx-builder/src/store/transactionLibraryContext.tsx#L32
export const validateTransactionsInBatch = (batch: BatchFile) => {
  const { transactions } = batch

  return transactions.every((tx) => {
    const valueEncodedAsString = typeof tx.value === 'string'
    assert(valueEncodedAsString, `Invalid transaction value: ${tx.value} in ${JSON.stringify(tx)}}`)
    const contractInputsEncodingValid =
      tx.contractInputsValues === null ||
      Object.values(tx.contractInputsValues || {}).every((input) => typeof input !== 'number')
    assert(contractInputsEncodingValid, `contractInputsEncodingValid: ${JSON.stringify(tx)}}`)

    return valueEncodedAsString && contractInputsEncodingValid
  })
}
