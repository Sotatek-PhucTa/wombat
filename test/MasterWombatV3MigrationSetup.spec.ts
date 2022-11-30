import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { getDeployedContract } from '../utils'
import { parseEther } from 'ethers/lib/utils'
import { advanceTimeAndBlock } from './helpers'
import { AddressZero, MaxUint256 } from '@ethersproject/constants'
import chai from 'chai'
import { near } from './assertions/near'
chai.use(near)

describe('MasterWombatV3Migration', function () {
  let owner: SignerWithAddress
  let masterWombatV3: Contract
  let voter: Contract
  let pool: Contract
  let busd: Contract
  let busdAsset: Contract
  let wom: Contract

  beforeEach(async function () {
    ;[owner] = await ethers.getSigners()
    await deployments.fixture(['Asset', 'MockTokens', 'MasterWombatV3', 'Pool', 'Voter', 'VoterSetup', 'WombatToken'])
    ;[masterWombatV3, voter, pool, busd, busdAsset, wom] = await Promise.all([
      getDeployedContract('MasterWombatV3'),
      getDeployedContract('Voter'),
      getDeployedContract('Pool'),
      getDeployedContract('TestERC20', 'BUSD'),
      getDeployedContract('Asset', 'Asset_P01_BUSD'),
      getDeployedContract('WombatERC20', 'WombatToken'),
    ])

    await wom.transfer(voter.address, await wom.balanceOf(owner.address))

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

  describe.only('Emission', function () {
    const epochInSec = 7 * 24 * 3600
    const baseWomPerSec = parseEther('0.375')
    const basePartition = 375

    beforeEach(async function () {
      await busd.faucet(parseEther('1000000'))
      await busd.approve(pool.address, MaxUint256)

      await masterWombatV3.add(busdAsset.address, AddressZero)
      await masterWombatV3.setVoter(voter.address)

      await pool.setMasterWombat(masterWombatV3.address)
      await pool.deposit(busd.address, parseEther('1000'), 0, owner.address, MaxUint256, true)
    })

    it('baseWomPerSec = womPerSec * baseAllocation', async function () {
      const womPerSec = await voter.womPerSec()
      expect(womPerSec).to.eq(parseEther('1'))
      const baseAllocation = await voter.baseAllocation()
      expect(baseAllocation).to.eq(375) // 37.5%
      expect(baseWomPerSec).to.eq(womPerSec.mul(baseAllocation).div(1000))
    })

    it('Voter emits baseWomPerSec in the first epoch', async function () {
      const pendingWom = await voter.pendingWom(busdAsset.address)
      await advanceTimeAndBlock(3600)
      expect(await voter.pendingWom(busdAsset.address)).to.eq(baseWomPerSec.mul(3600).add(pendingWom))
    })

    it('MasterWombat emits baseWomPerSec after the first epoch', async function () {
      expect(await masterWombatV3.basePartition()).to.eq(basePartition)

      await advanceTimeAndBlock(epochInSec) // T + epoch
      await voter.distribute(busdAsset.address)
      expect(await masterWombatV3.multiClaim([0]))
      const dust = await wom.balanceOf(owner.address)
      expect(dust).to.be.gt(0).and.lt(parseEther('0.2'))

      await advanceTimeAndBlock(3600) // T + epoch + 1hour
      // FIXME: call this will make reward to be 2 * dust.
      // await voter.distribute(busdAsset.address)
      expect(await masterWombatV3.multiClaim([0]))
      const reward = parseEther('506.396486002') // 506.25 = 1 * 3600 * 0.375 * 0.375
      expect(reward).to.near(baseWomPerSec.mul(3600).mul(basePartition).div(1000))
      expect(await wom.balanceOf(owner.address)).to.eq(reward.add(dust))
    })
  })
})
