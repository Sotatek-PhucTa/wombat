import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { getDeployedContract } from '../../../utils'
import tmp from 'tmp'
import { Safe } from '../../../utils/multisig/transactions'
import { appendBatchTransactions, readPendingTransactions } from '../../../utils/multisig/files'
import { expect } from 'chai'
import { BatchTransaction } from '../../../utils/multisig/tx-builder'

describe('Files', function () {
  let owner: SignerWithAddress
  let user: SignerWithAddress
  let pool: Contract
  let pendingFile: string

  beforeEach(async function () {
    await deployments.fixture(['Pool'])
    pool = await getDeployedContract('PoolV2', 'Pool')
    ;[owner, user] = await ethers.getSigners()
    pendingFile = createTempFile()
  })

  it('can read all pending transactions', async function () {
    const txn1 = Safe(pool).setDev(user.address)
    appendBatchTransactions([txn1], pendingFile)
    expect(readPendingTransactions(pendingFile)).to.eql([setDevTransaction(pool.address, user.address)])

    const txn2 = Safe(pool).addAsset('0x12', '0x56')
    const txn3 = Safe(pool).addAsset('0x34', '0x78')
    appendBatchTransactions([txn2, txn3], pendingFile)
    expect(readPendingTransactions(pendingFile)).to.eql([
      setDevTransaction(pool.address, user.address),
      addAssetTransaction(pool.address, '0x12', '0x56'),
      addAssetTransaction(pool.address, '0x34', '0x78'),
    ])
  })

  function setDevTransaction(pool: string, dev: string): BatchTransaction {
    return {
      to: pool,
      value: '0',
      contractMethod: {
        inputs: [{ internalType: 'address', name: 'dev_', type: 'address' }],
        name: 'setDev(address)',
        payable: false,
      },
      contractInputsValues: { dev_: dev },
    }
  }

  function addAssetTransaction(pool: string, token: string, asset: string): BatchTransaction {
    return {
      to: pool,
      value: '0',
      contractMethod: {
        inputs: [
          {
            internalType: 'address',
            name: 'token',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'asset',
            type: 'address',
          },
        ],
        name: 'addAsset(address,address)',
        payable: false,
      },
      contractInputsValues: { token, asset },
    }
  }

  function createTempFile(): string {
    tmp.setGracefulCleanup()
    return tmp.fileSync().name
  }
})
