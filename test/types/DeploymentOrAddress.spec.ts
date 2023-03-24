import { expect } from 'chai'
import { Contract } from 'ethers'
import { deployments } from 'hardhat'
import { getAddress, getDeployedContract } from '../../utils'

describe('DeploymentOrAddress', function () {
  let pool: Contract

  beforeEach(async function () {
    // Any deployed contract would have worked here.
    await deployments.fixture(['Pool'])
    pool = await getDeployedContract('PoolV2', 'Pool')
  })

  it('works for address', async function () {
    expect(await getAddress({ deploymentOrAddress: pool.address })).to.eql(pool.address)
  })

  it('works for deployment', async function () {
    expect(await getAddress({ deploymentOrAddress: 'Pool' })).to.eql(pool.address)
  })
})
