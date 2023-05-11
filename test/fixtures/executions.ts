import { takeSnapshot, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers'
import { ethers } from 'hardhat'
import { BatchTransaction } from '../../utils/multisig/tx-builder'
import assert from 'assert'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

// This is intended to be a low friction utility to use evm snapshot in testing.
// Example usage: beforeEach(restoreOrCreateSnapshot(async function() ...))
export function restoreOrCreateSnapshot(fn: () => Promise<void>): () => Promise<void> {
  let snapshot: SnapshotRestorer
  return async function () {
    if (snapshot) {
      return snapshot.restore()
    }
    await fn()
    snapshot = await takeSnapshot()
  }
}

// Execute batch transactions as a given account.
export async function executeTxnsAs(signer: SignerWithAddress, txns: BatchTransaction[]) {
  for (const txn of txns) {
    await signer.sendTransaction({ to: txn.to, data: txn.data || encodeData(txn), value: 0 })
  }
}

function encodeData(txn: BatchTransaction): string {
  assert(txn.contractMethod && txn.contractInputsValues, 'Missing contract method or inputs')
  // This is a function, not other types: deploy, events, or errors.
  // https://docs.ethers.org/v5/api/utils/abi/interface/#Interface--properties
  const iface = new ethers.utils.Interface(`["function ${txn.contractMethod.name}"]`)
  return iface.encodeFunctionData(txn.contractMethod.name, Object.values(txn.contractInputsValues))
}
