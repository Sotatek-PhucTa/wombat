import { Contract } from 'ethers'
import { deployments } from 'hardhat'
import { getDeployedContract } from '../utils'

describe('MasterWombatV3Migration', function () {
  let masterWombatV3: Contract
  let voter: Contract
  let pool: Contract
  let busd: Contract
  let busdAsset: Contract

  beforeEach(async function () {
    await deployments.fixture(['Asset', 'MockTokens', 'MasterWombatV3', 'Pool', 'Voter'])
    ;[masterWombatV3, voter, pool, busd, busdAsset] = await Promise.all([
      getDeployedContract('MasterWombatV3'),
      getDeployedContract('Voter'),
      getDeployedContract('Pool'),
      getDeployedContract('TestERC20', 'BUSD'),
      getDeployedContract('Asset', 'Asset_P01_BUSD'),
    ])
  })

  it('works', async function () {
    console.log('mwv3', masterWombatV3.address)
    console.log('voter', voter.address)
    console.log('pool', pool.address)
    console.log('busd', busd.address)
    console.log('lp-busd', busdAsset.address)
  })
})
