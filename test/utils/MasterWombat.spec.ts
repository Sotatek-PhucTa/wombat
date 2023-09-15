import { expect } from 'chai'
import { deployments } from 'hardhat'
import { getDeployedContract, getLatestMasterWombat } from '../../utils'

describe('getLatestMasterWombat', function () {
  it('return MWv3 if only MWv3 deployed', async function () {
    await deployments.fixture(['WombatToken', 'MasterWombatV3'])
    const mwv3 = await getDeployedContract('MasterWombatV3')
    expect((await getLatestMasterWombat()).address).to.eq(mwv3.address)
  })

  it('return BMW if both BWM, MWv3 deployed', async function () {
    await deployments.fixture(['WombatToken', 'MasterWombatV3', 'BoostedMasterWombat'])
    const bmw = await getDeployedContract('BoostedMasterWombat')
    expect((await getLatestMasterWombat()).address).to.eq(bmw.address)
  })

  it('return BMW if only BWM deployed', async function () {
    await deployments.fixture(['WombatToken', 'BoostedMasterWombat'])
    const bmw = await getDeployedContract('BoostedMasterWombat')
    expect((await getLatestMasterWombat()).address).to.eq(bmw.address)
  })
})
