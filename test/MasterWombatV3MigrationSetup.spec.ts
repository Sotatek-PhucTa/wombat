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
  let user1: SignerWithAddress
  let masterWombatV3: Contract
  let vewom: Contract
  let voter: Contract
  let pool: Contract
  let busd: Contract
  let busdAsset: Contract
  let wom: Contract

  beforeEach(async function () {
    ;[owner, user1] = await ethers.getSigners()
    await deployments.fixture([
      'HighCovRatioFeePoolAssets',
      'MasterWombatV3',
      'MockTokens',
      'VeWom',
      'Voter',
      'VoterSetup',
      'WombatToken',
    ])
    ;[masterWombatV3, vewom, voter, pool, busd, busdAsset, wom] = await Promise.all([
      getDeployedContract('MasterWombatV3'),
      getDeployedContract('VeWom'),
      getDeployedContract('Voter'),
      getDeployedContract('HighCovRatioFeePoolV2', 'MainPool'),
      getDeployedContract('TestERC20', 'BUSD'),
      getDeployedContract('Asset', 'Asset_MainPool_BUSD'),
      getDeployedContract('WombatERC20', 'WombatToken'),
    ])

    await wom.transfer(voter.address, (await wom.balanceOf(owner.address)).div(2))
    await wom.transfer(user1.address, await wom.balanceOf(owner.address))

    await masterWombatV3.setVoter(voter.address)
    await vewom.setVoter(voter.address)
    await voter.setWomPerSec(parseEther('1'))
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
    const epochInSec = 7 * 24 * 3600
    const womPerSec = parseEther('1')
    const baseWomPerSec = parseEther('0.75')
    const basePartition = 375

    beforeEach(async function () {
      await busd.faucet(parseEther('1000000'))
      await busd.approve(pool.address, MaxUint256)

      await masterWombatV3.add(busdAsset.address, AddressZero)
      await masterWombatV3.setVoter(voter.address)

      await pool.setMasterWombat(masterWombatV3.address)
      await pool.deposit(busd.address, parseEther('1000'), 0, owner.address, MaxUint256, true)

      expect(await masterWombatV3.basePartition()).to.eq(basePartition)
    })

    it('baseWomPerSec = womPerSec * baseAllocation', async function () {
      expect(await voter.womPerSec()).to.eq(womPerSec)
      const baseAllocation = await voter.baseAllocation()
      expect(baseAllocation).to.eq(750) // 75%
      expect(baseWomPerSec).to.eq(womPerSec.mul(baseAllocation).div(1000))
    })

    it('Voter emits baseWomPerSec in the first epoch', async function () {
      const pendingWom = await voter.pendingWom(busdAsset.address)
      await advanceTimeAndBlock(3600)
      expect(await voter.pendingWom(busdAsset.address)).to.near(baseWomPerSec.mul(3600).add(pendingWom))
    })

    it('MasterWombat emits baseWomPerSec after the first epoch', async function () {
      await masterWombatV3.multiClaim([0])
      await advanceTimeAndBlock(epochInSec) // T + epoch
      await masterWombatV3.multiClaim([0])

      await advanceTimeAndBlock(3600) // T + epoch + 1hour
      await masterWombatV3.multiClaim([0])
      const reward = parseEther('1012.5') // 1012.5 = 1 * 3600 * 0.75 * 0.375
      expect(reward).to.eq(baseWomPerSec.mul(3600).mul(basePartition).div(1000))
      expect(await wom.balanceOf(owner.address)).to.near(reward)
    })

    it('MasterWombat emits womPerSec after voting in the first epoch', async function () {
      await wom.connect(user1).transfer(owner.address, parseEther('2'))
      await wom.approve(vewom.address, ethers.constants.MaxUint256)
      await vewom.mint(parseEther('2'), 1461)
      await voter.vote([busdAsset.address], [parseEther('1')])
      await masterWombatV3.multiClaim([0])
      await advanceTimeAndBlock(epochInSec) // T + epoch
      await masterWombatV3.multiClaim([0])

      await advanceTimeAndBlock(3600) // T + epoch + 1hour
      await masterWombatV3.multiClaim([0])
      const reward = parseEther('3601.05') // ~= 1 * 3600
      expect(reward).to.near(womPerSec.mul(3600))
      expect(await wom.balanceOf(owner.address)).to.near(reward)
    })

    it('User can claim reward after three epochs', async function () {
      await masterWombatV3.connect(user1).multiClaim([0])
      await advanceTimeAndBlock(epochInSec) // T + 1epoch
      await masterWombatV3.connect(user1).multiClaim([0])
      await advanceTimeAndBlock(epochInSec) // T + 2epoch
      await masterWombatV3.connect(user1).multiClaim([0])
      await advanceTimeAndBlock(epochInSec) // T + 3epoch
      // first claim in three epoch
      await masterWombatV3.multiClaim([0])

      // expected reward for two epochs: 340200 = 2 * (7 * 24 * 3600) * .75 * .375
      const reward = parseEther('340200')
      expect(reward).to.eq(baseWomPerSec.mul(2).mul(epochInSec).mul(basePartition).div(1000))
      expect(await wom.balanceOf(owner.address)).to.near(reward)
    })
  })
})
