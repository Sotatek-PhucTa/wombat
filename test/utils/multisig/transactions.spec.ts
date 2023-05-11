import { Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { getDeployedContract } from '../../../utils'
import { Safe, executeBatchTransaction } from '../../../utils/multisig/transactions'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('Safe', function () {
  let owner: SignerWithAddress
  let user: SignerWithAddress

  let pool: Contract

  beforeEach(async function () {
    await deployments.fixture(['Pool'])
    pool = await getDeployedContract('PoolV2', 'Pool')
    ;[owner, user] = await ethers.getSigners()
  })

  it('can generate a transaction on pool', function () {
    expect(Safe(pool).addAsset('0x1234', '0x5678')).to.eql({
      to: pool.address,
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
      contractInputsValues: { token: '0x1234', asset: '0x5678' },
    })
  })

  it('can execute a batch transaction', async function () {
    expect(await pool.dev()).to.eql(owner.address)
    await executeBatchTransaction(owner, Safe(pool).setDev(user.address))
    expect(await pool.dev()).to.eql(user.address)
  })
})
