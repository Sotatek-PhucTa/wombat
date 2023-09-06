import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai, { expect } from 'chai'
import { BigNumber, Contract } from 'ethers'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { BoostedMultiRewarder, BribeV2, TestERC20 } from '../../build/typechain'
import { getDeployedContract } from '../../utils'
import { near } from '../assertions/near'
import { roughlyNear } from '../assertions/roughlyNear'
import { latest } from '../helpers'

chai.use(near)
chai.use(roughlyNear)

const AddressZero = ethers.constants.AddressZero

// Start test block
describe('BribeRewarderFactory', async function () {
  let owner: SignerWithAddress
  let users: SignerWithAddress[]

  let bribeRewarderFactory: Contract
  let rewarderBeacon: Contract
  let bribeBeacon: Contract

  let wom: Contract
  let veWom: Contract
  let voter: Contract
  let mw: Contract
  let token1: TestERC20
  let token2: TestERC20
  let lpToken1: TestERC20
  let lpToken2: TestERC20

  let startTime: BigNumber

  before(async function () {
    ;[owner, ...users] = await ethers.getSigners()
  })

  beforeEach(async function () {
    await deployments.fixture([
      'HighCovRatioFeePoolAssets',
      'CrossChainPoolAssets',
      'BoostedMasterWombat',
      'BribeRewarderFactory',
      'VeWom',
      'Voter',
    ])
    await deployments.fixture(['VoterSetup', 'BoostedMasterWombatSetup'], { keepExistingDeployments: true })
    ;[bribeRewarderFactory, mw, rewarderBeacon, bribeBeacon, voter, wom, veWom] = await Promise.all([
      getDeployedContract('BribeRewarderFactory'),
      getDeployedContract('BoostedMasterWombat'),
      getDeployedContract('UpgradeableBeacon', 'BoostedMultiRewarder_Beacon'),
      getDeployedContract('UpgradeableBeacon', 'BribeV2_Beacon'),
      getDeployedContract('Voter'),
      getDeployedContract('WombatERC20', 'WombatToken'),
      getDeployedContract('VeWom'),
    ])

    token1 = (await ethers.deployContract('TestERC20', ['USDC', 'USDC', 18, parseUnits('10000000', 18)])) as TestERC20
    token2 = (await ethers.deployContract('TestERC20', ['USDT', 'USDT', 18, parseUnits('10000000', 18)])) as TestERC20
    lpToken1 = (await ethers.deployContract('TestERC20', [
      'USDC LP',
      'USDC LP',
      18,
      parseUnits('10000000', 18),
    ])) as TestERC20
    lpToken2 = (await ethers.deployContract('TestERC20', [
      'USDT LP',
      'USDT LP',
      18,
      parseUnits('10000000', 18),
    ])) as TestERC20

    await voter.add(mw.address, lpToken1.address, AddressZero)
    await mw.add(lpToken1.address, AddressZero)

    startTime = (await latest()).add(86400)
  })

  it('deploy validation', async function () {
    const { multisig } = await getNamedAccounts()
    expect(await rewarderBeacon.owner()).to.eq(multisig)
    expect(await bribeBeacon.owner()).to.eq(multisig)

    expect(await bribeRewarderFactory.masterWombat()).to.eq(mw.address)
    expect(await bribeRewarderFactory.rewarderBeacon()).to.eq(rewarderBeacon.address)
    expect(await bribeRewarderFactory.voter()).to.eq(voter.address)
    expect(await bribeRewarderFactory.bribeBeacon()).to.eq(bribeBeacon.address)

    expect(await bribeRewarderFactory.getWhitelistedRewardTokens()).to.be.empty
  })

  describe('rewarder', async function () {
    it('validation', async function () {
      // check msg.sender
      await expect(
        bribeRewarderFactory.deployRewarderContractAndSetRewarder(
          lpToken1.address,
          startTime,
          token1.address,
          parseEther('0.1')
        )
      ).to.be.revertedWith('Not authurized.')

      // check LP token exists
      await expect(
        bribeRewarderFactory.deployRewarderContractAndSetRewarder(
          lpToken2.address,
          startTime,
          token1.address,
          parseEther('0.1')
        )
      ).to.be.revertedWith('invalid pid')

      // check token whitelisted
      await bribeRewarderFactory.setRewarderDeployer(lpToken1.address, owner.address)
      await expect(
        bribeRewarderFactory.deployRewarderContractAndSetRewarder(
          lpToken1.address,
          startTime,
          token1.address,
          parseEther('0.1')
        )
      ).to.be.revertedWith('reward token is not whitelisted')

      // successfully deploy
      await bribeRewarderFactory.whitelistRewardToken(token1.address)
      expect(await bribeRewarderFactory.getWhitelistedRewardTokens()).to.have.members([token1.address])

      await bribeRewarderFactory.deployRewarderContractAndSetRewarder(
        lpToken1.address,
        startTime,
        token1.address,
        parseEther('0.1')
      )

      // revoke reward token
      await bribeRewarderFactory.revokeRewardToken(token1.address)
      await voter.add(mw.address, lpToken2.address, AddressZero)
      await mw.add(lpToken2.address, AddressZero)
      await bribeRewarderFactory.setRewarderDeployer(lpToken2.address, owner.address)
      await expect(
        bribeRewarderFactory.deployRewarderContractAndSetRewarder(
          lpToken2.address,
          startTime,
          token1.address,
          parseEther('0.1')
        )
      ).to.be.revertedWith('reward token is not whitelisted')

      // double deployment
      await bribeRewarderFactory.whitelistRewardToken(token1.address)
      expect(await bribeRewarderFactory.getWhitelistedRewardTokens()).to.have.members([token1.address])
      await expect(
        bribeRewarderFactory.deployRewarderContractAndSetRewarder(
          lpToken1.address,
          startTime,
          token1.address,
          parseEther('0.1')
        )
      ).to.be.revertedWith('rewarder contract alrealdy exists')

      // rewarder.addRewardToken checks if token is whitelisted
      const rewarderAddr = await mw.boostedRewarders(8)
      const rewarder = (await ethers.getContractAt('BoostedMultiRewarder', rewarderAddr)) as BoostedMultiRewarder
      await expect(rewarder.addRewardToken(token2.address, 0, 0)).to.be.revertedWith(
        'reward token must be whitelisted by bribe factory'
      )
      await bribeRewarderFactory.whitelistRewardToken(token2.address)
      expect(await bribeRewarderFactory.getWhitelistedRewardTokens()).to.have.members([token1.address, token2.address])
      await rewarder.addRewardToken(token2.address, 0, 0)
    })

    it('deployRewarderContractAndSetRewarder', async function () {
      await bribeRewarderFactory.setRewarderDeployer(lpToken1.address, owner.address)
      await bribeRewarderFactory.whitelistRewardToken(token1.address)
      expect(await bribeRewarderFactory.getWhitelistedRewardTokens()).to.have.members([token1.address])

      await bribeRewarderFactory.deployRewarderContractAndSetRewarder(
        lpToken1.address,
        startTime,
        token1.address,
        parseEther('0.1')
      )

      // expect it to be added
      const pid = await mw.getAssetPid(lpToken1.address)
      const addr = await mw.boostedRewarders(pid)
      expect(addr).to.not.eq('0x0000000000000000000000000000000000000000')

      // verify can read the beacon proxy
      const rewarder = (await ethers.getContractAt('BoostedMultiRewarder', addr)) as BoostedMultiRewarder
      const info = await rewarder.rewardInfos(0)
      expect(info.rewardToken).to.equal(token1.address)
    })

    it('upgrade', async function () {
      const oldImpl = await rewarderBeacon.implementation()
      const newImpl = (await ethers.deployContract('BoostedMultiRewarder')) as BoostedMultiRewarder
      await rewarderBeacon.upgradeTo(newImpl.address)

      expect(newImpl.address).not.to.eq(oldImpl)
      expect(newImpl.address).to.eq(await rewarderBeacon.implementation())
    })
  })

  describe('bribe', async function () {
    it('validation', async function () {
      // check msg.sender
      await expect(
        bribeRewarderFactory.deployBribeContractAndSetBribe(
          lpToken1.address,
          startTime,
          token1.address,
          parseEther('0.1')
        )
      ).to.be.revertedWith('Not authurized.')

      // check LP token exists
      await expect(
        bribeRewarderFactory.deployBribeContractAndSetBribe(
          lpToken2.address,
          startTime,
          token1.address,
          parseEther('0.1')
        )
      ).to.be.revertedWith('gauge does not exist')

      // check token whitelisted
      await bribeRewarderFactory.setBribeDeployer(lpToken1.address, owner.address)
      await expect(
        bribeRewarderFactory.deployBribeContractAndSetBribe(
          lpToken1.address,
          startTime,
          token1.address,
          parseEther('0.1')
        )
      ).to.be.revertedWith('reward token is not whitelisted')

      // successfully deploy
      await bribeRewarderFactory.whitelistRewardToken(token1.address)
      expect(await bribeRewarderFactory.getWhitelistedRewardTokens()).to.have.members([token1.address])
      await bribeRewarderFactory.deployBribeContractAndSetBribe(
        lpToken1.address,
        startTime,
        token1.address,
        parseEther('0.1')
      )

      // revoke reward token
      await bribeRewarderFactory.revokeRewardToken(token1.address)
      await voter.add(mw.address, lpToken2.address, AddressZero)
      await mw.add(lpToken2.address, AddressZero)
      await bribeRewarderFactory.setBribeDeployer(lpToken2.address, owner.address)
      await expect(
        bribeRewarderFactory.deployBribeContractAndSetBribe(
          lpToken2.address,
          startTime,
          token1.address,
          parseEther('0.1')
        )
      ).to.be.revertedWith('reward token is not whitelisted')

      // double deployment
      await bribeRewarderFactory.whitelistRewardToken(token1.address)
      expect(await bribeRewarderFactory.getWhitelistedRewardTokens()).to.have.members([token1.address])
      await expect(
        bribeRewarderFactory.deployBribeContractAndSetBribe(
          lpToken1.address,
          startTime,
          token1.address,
          parseEther('0.1')
        )
      ).to.be.revertedWith('bribe contract already exists for gauge')

      // bribe.addRewardToken checks if token is whitelisted
      const { bribe: bribeAddr } = await voter.infos(lpToken1.address)
      const bribe = (await ethers.getContractAt('BribeV2', bribeAddr)) as BribeV2
      await expect(bribe.addRewardToken(token2.address, 0, 0)).to.be.revertedWith(
        'reward token must be whitelisted by bribe factory'
      )
      await bribeRewarderFactory.whitelistRewardToken(token2.address)
      expect(await bribeRewarderFactory.getWhitelistedRewardTokens()).to.have.members([token1.address, token2.address])
      await bribe.addRewardToken(token2.address, 0, 0)
    })

    it('deployBribeContractAndSetBribe', async function () {
      await bribeRewarderFactory.setBribeDeployer(lpToken1.address, owner.address)
      await bribeRewarderFactory.whitelistRewardToken(token1.address)
      expect(await bribeRewarderFactory.getWhitelistedRewardTokens()).to.have.members([token1.address])

      await bribeRewarderFactory.deployBribeContractAndSetBribe(
        lpToken1.address,
        startTime,
        token1.address,
        parseEther('0.1')
      )

      // expect it to be added
      const { bribe: addr } = await voter.infos(lpToken1.address)
      expect(addr).to.not.eq('0x0000000000000000000000000000000000000000')

      // verify can read the beacon proxy
      const bribe = (await ethers.getContractAt('BribeV2', addr)) as BribeV2
      const info = await bribe.rewardInfos(0)
      expect(info.rewardToken).to.equal(token1.address)
    })

    it('should emit event when rewarderDeployer is set', async function () {
      expect(await bribeRewarderFactory.setRewarderDeployer(lpToken1.address, owner.address))
        .to.emit(bribeRewarderFactory, 'SetRewarderDeployer')
        .withArgs(lpToken1.address, owner.address)
    })

    it('should emit event when bribeDeployer is set', async function () {
      expect(await bribeRewarderFactory.setBribeDeployer(lpToken1.address, owner.address))
        .to.emit(bribeRewarderFactory, 'SetBribeDeployer')
        .withArgs(lpToken1.address, owner.address)
    })

    it('should emit event when change whitelistRewardToken', async function () {
      expect(await bribeRewarderFactory.whitelistRewardToken(token1.address))
        .to.emit(bribeRewarderFactory, 'WhitelistRewardTokenUpdated')
        .withArgs(token1.address, true)

      expect(await bribeRewarderFactory.revokeRewardToken(token1.address))
        .to.emit(bribeRewarderFactory, 'WhitelistRewardTokenUpdated')
        .withArgs(token1.address, false)
    })

    it('upgrade', async function () {
      const newBribeImpl = (await ethers.deployContract('BribeV2')) as BribeV2
      await bribeBeacon.upgradeTo(newBribeImpl.address)

      expect(newBribeImpl.address).to.eq(await bribeBeacon.implementation())
    })
  })
})
