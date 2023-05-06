import { Contract } from 'ethers'
import { deployments } from 'hardhat'
import { getDeployedContract } from '../../../utils'
import { Safe } from '../../../utils/multisig/transactions'
import { expect } from 'chai'

describe('Safe', function () {
  let pool: Contract

  beforeEach(async function () {
    await deployments.fixture(['Pool'])
    pool = await getDeployedContract('PoolV2', 'Pool')
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
})
