import { Contract } from 'ethers'
import { deployments } from 'hardhat'
import { getDeployedContract } from '../utils'

describe('MasterWombatV3Migration', function () {
  let pool: Contract

  beforeEach(async function () {
    await deployments.fixture(['Asset', 'MockTokens', 'MasterWombatV3', 'Pool', 'Voter'])
    ;[pool] = await Promise.all([getDeployedContract('Pool')])
  })

  it('works', async function () {
    console.log('jack', pool.address)
  })
})
