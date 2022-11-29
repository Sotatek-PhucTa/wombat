import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { getDeployedContract } from '../utils'
import { parseEther } from 'ethers/lib/utils'
import { advanceTimeAndBlock } from './helpers'

describe('MasterWombatV3Migration', function () {
  let owner: SignerWithAddress
  let masterWombatV3: Contract
  let voter: Contract
  let pool: Contract
  let busd: Contract
  let busdAsset: Contract

  beforeEach(async function () {
    ;[owner] = await ethers.getSigners()
    await deployments.fixture(['Asset', 'MockTokens', 'MasterWombatV3', 'Pool', 'Voter', 'VoterSetup'])
      ;[masterWombatV3, voter, pool, busd, busdAsset] = await Promise.all([
        getDeployedContract('MasterWombatV3'),
        getDeployedContract('Voter'),
        getDeployedContract('Pool'),
        getDeployedContract('TestERC20', 'BUSD'),
        getDeployedContract('Asset', 'Asset_P01_BUSD'),
      ])

    await voter.setAllocPoint(busdAsset.address, parseEther('1'))
    expect(await voter.totalAllocPoint()).to.eq(parseEther('1'))
  })

  it('BUSD is whitelisted', async function () {
    const infos = await voter.infos(busdAsset.address)
    expect(infos.gaugeManager).to.eql(masterWombatV3.address)
    expect(infos.whitelist).to.be.true
  })

  it('BUSD has 100 alloc point', async function () {
    const weights = await voter.weights(busdAsset.address)
    expect(weights.allocPoint).to.eq(parseEther('1'))
  })

  describe('Emission', function () {
    it('emits womPerSec*womPerSec in the first epoch', async function () {
      const womPerSec = await voter.womPerSec()
      expect(womPerSec).to.eq(parseEther('1'))
      const baseAllocation = await voter.baseAllocation()
      expect(baseAllocation).to.eq(375) // 37.5%
      const baseWomPerSec = womPerSec.mul(baseAllocation).div(1000)
      expect(baseWomPerSec).to.eq(parseEther('0.375'))

      expect(await voter.pendingWom(busdAsset.address)).to.eq(0)
      await advanceTimeAndBlock(3600)
      expect(await voter.pendingWom(busdAsset.address)).to.eq(baseWomPerSec.mul(3600))
    })
  })
})
