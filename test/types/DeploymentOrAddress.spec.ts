import { expect } from 'chai'
import { Contract } from 'ethers'
import { deployments } from 'hardhat'
import { getAddress, getDeployedContract } from '../../utils'
import { Address, Deployment, Network, Unknown } from '../../types'

describe('DeploymentOrAddress', function () {
  let pool: Contract

  beforeEach(async function () {
    // Any deployed contract would have worked here.
    await deployments.fixture(['HighCovRatioFeePoolAssets'], {
      keepExistingDeployments: true, // keep deployments/<network>
    })
    pool = await getDeployedContract('HighCovRatioFeePoolV2', 'MainPool')
  })

  it('works for address', async function () {
    expect(await getAddress(Address(pool.address))).to.eql(pool.address)
  })

  it('works for deployment', async function () {
    expect(await getAddress(Deployment('MainPool'))).to.eql(pool.address)
  })

  it('works for deployment in hardhat', async function () {
    expect(await getAddress(Deployment('MainPool', Network.HARDHAT))).to.eql(pool.address)
  })

  it('works for deployment in testnet', async function () {
    expect(await getAddress(Deployment('MainPool', Network.BSC_TESTNET))).to.eql(
      '0x76F3378F13c6e9c5F477d1D9dE2A21151E883D71'
    )
  })

  it('throws for unknown', async function () {
    await expect(getAddress(Unknown())).to.be.rejectedWith('Unknown deploymentOrAddress type: unknown')
  })
})
