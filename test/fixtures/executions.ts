import { takeSnapshot, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers'

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
