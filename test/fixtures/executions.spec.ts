import { Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { getDeployedContract } from '../../utils'
import { Safe } from '../../utils/multisig/transactions'
import { executeTxnsAs } from './executions'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'

describe('fixtures/executions', function () {
  let owner: SignerWithAddress
  let user: SignerWithAddress
  let pool: Contract
  let safe: Safe

  beforeEach(async function () {
    await deployments.fixture(['Pool'])
    ;[owner, user] = await ethers.getSigners()
    pool = await getDeployedContract('PoolV2', 'Pool')
    safe = Safe(pool)
  })

  it('can execute a batch transaction', async function () {
    expect(await pool.dev()).to.eql(owner.address)
    await executeTxnsAs(owner, [safe.setDev(user.address)])
    expect(await pool.dev()).to.eql(user.address)
  })
})
