import { Contract } from 'ethers'
import { deployments } from 'hardhat'
import { getDeployedContract } from '../utils'

describe('MasterWombatV3Migration', function () {
  let pool: Contract

  beforeEach(async function () {
    // await deployments.fixture(['Asset', 'MockTokens', 'MasterWombatV3', 'Pool', 'Voter'])
    // await deployments.fixture(['Asset', 'MockTokens', 'MasterWombatV3', 'Pool', 'Voter'])
    // await deployments.fixture(['Asset', 'MockTokens', 'MasterWombatV3', 'Pool', 'Voter'])
    // await deployments.fixture(['MockTokens', 'MasterWombatV3', 'Voter'])
    await deployments.fixture(['MasterWombatV3', 'Voter'])
    // ;[pool] = await Promise.all([getDeployedContract('Pool')])
  })

  it('works', async function () {
    console.log('jack')
    // console.log('jack', pool)
  })
})
