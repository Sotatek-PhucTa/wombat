import { expect } from 'chai'
import { Contract } from 'ethers'
import { deployments } from 'hardhat'
import { getAddress, getDeployedContract } from '../../utils'

describe('DeploymentOrAddress', function () {
  let pool: Contract

  beforeEach(async function () {
    // Any deployed contract would have worked here.
    await deployments.fixture(['HighCovRatioFeePoolAssets'])
    pool = await getDeployedContract('HighCovRatioFeePoolV2', 'MainPool')
  })

  it('works for address', async function () {
    expect(await getAddress({ deploymentOrAddress: pool.address })).to.eql(pool.address)
  })

  it('works for deployment', async function () {
    expect(await getAddress({ deploymentOrAddress: 'MainPool' })).to.eql(pool.address)
  })
})
