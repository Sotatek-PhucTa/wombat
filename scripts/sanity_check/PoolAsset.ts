import { deployments, ethers, network } from 'hardhat'
import { Contract } from 'ethers'
import { getDeployedContract } from '../../utils'
import _ from 'lodash'
import { expect } from 'chai'

/**
 * This script performs sanity check on Pool and Asset. Example command:
 *   npx hh test --network bsc_testnet scripts/sanity_check/PoolAsset.ts
 */
describe('MasterWombatMigration', function () {
  let pools: Contract[]

  before(async function () {
    console.log('Running sanity checks on Pools on', network.name)
    await deployments.all()

    const names = Object.keys(await deployments.all()).filter(
      (name) =>
        name.includes('Pool') &&
        !name.startsWith('Asset') &&
        !name.includes('Proxy') &&
        !name.includes('Implementation') &&
        !name.includes('MultiRewarderPerSec')
    )
    console.log('Looking at pools:', names)

    pools = await Promise.all(names.map((name) => getDeployedContract('Pool', name)))
  })

  it('getTokens and underlyingToken are consistent', async function () {
    await Promise.all(
      pools.map(async (pool) => {
        const tokens = await pool.getTokens()
        return Promise.all(
          tokens.map(async (token: string) => {
            const assetAddress = await pool.addressOfAsset(token)
            const asset = await ethers.getContractAt('Asset', assetAddress)
            const actual = await asset.underlyingToken()
            expect(
              actual,
              `Pool (${pool.address}) expects ${token}, but found ${actual} in Asset (${assetAddress})`
            ).to.eql(token)
          })
        )
      })
    )
  })
})
