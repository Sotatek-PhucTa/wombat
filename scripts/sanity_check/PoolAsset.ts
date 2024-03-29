import { deployments, ethers, network } from 'hardhat'
import { Contract } from 'ethers'
import { getDeployedContract } from '../../utils'
import _ from 'lodash'
import { expect } from 'chai'

/**
 * This script performs sanity check on Pool and Asset. Example command:
 *   npx hh test --network bsc_testnet scripts/sanity_check/PoolAsset.ts
 */
describe('PoolAssetSanityCheck', function () {
  let pools: Contract[]
  let masterWombatV3: Contract
  let voter: Contract

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
    masterWombatV3 = await getDeployedContract('MasterWombatV3')
    voter = await getDeployedContract('Voter')
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

  it('all Pools have masterWombat to MasterWombatV3', async function () {
    await Promise.all(
      pools.map(async (pool) => {
        expect(await pool.masterWombat(), `Pool (${pool.address}) does not have the address of MasterWombatV3`).to.eql(
          masterWombatV3.address
        )
      })
    )
  })

  it('all Assets are in MasterWombatV3', async function () {
    await Promise.all(
      pools.map(async (pool) => {
        const tokens = await pool.getTokens()
        return Promise.all(
          tokens.map(async (token: string) => {
            const assetAddress = await pool.addressOfAsset(token)
            const pid = await masterWombatV3.getAssetPid(assetAddress)
            expect(
              pid,
              `Expect MasterWombat (${masterWombatV3.address}) to have Asset (${assetAddress}) but cannot find it`
            ).to.gte(0)
          })
        )
      })
    )
  })

  it('all Assets are in Voter', async function () {
    const length = await voter.lpTokenLength()
    const infos = await Promise.all(_.range(0, length).map((i) => voter.lpTokens(i)))
    const lpTokens = _.keyBy(infos)

    await Promise.all(
      pools.map(async (pool) => {
        const tokens = await pool.getTokens()
        return Promise.all(
          tokens.map(async (token: string) => {
            const assetAddress = await pool.addressOfAsset(token)
            expect(
              lpTokens[assetAddress],
              `Expect Voter (${voter.address}) to have Asset (${assetAddress}) Token: (${token}) Pool: (${pool.address}) but cannot find it`
            ).to.not.be.undefined
          })
        )
      })
    )
  })
})
