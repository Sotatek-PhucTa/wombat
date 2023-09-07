import { AddressZero } from '@ethersproject/constants'
import { formatEther, parseEther, parseUnits } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai, { expect } from 'chai'
import { BigNumber, Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { BoostedMasterWombat, BoostedMultiRewarder, TestERC20, VeWom, Voter, WombatERC20 } from '../../build/typechain'
import { getDeployedContract, getTestERC20 } from '../../utils'
import { near } from '../assertions/near'
import { roughlyNear } from '../assertions/roughlyNear'
import { advanceTimeAndBlock, latest } from '../helpers'

chai.use(near)
chai.use(roughlyNear)

describe('BoostedMultiRewarder 2', async function () {
  let owner: SignerWithAddress
  let users: SignerWithAddress[]

  let master: BoostedMasterWombat
  let rewarder: BoostedMultiRewarder
  let axlUSDC: TestERC20
  let wom: WombatERC20
  let veWom: VeWom
  let voter: Voter

  let startTime: BigNumber

  before(async function () {
    ;[owner, ...users] = await ethers.getSigners()
  })

  beforeEach(async function () {
    await deployments.fixture(['MockTokens', 'MasterWombatV3', 'WombatToken', 'Voter', 'VeWom'])
    startTime = (await latest()).add(60)

    // dummyToken = await getTestERC20('USDC')
    // expect(await dummyToken.decimals()).to.eq(6)

    axlUSDC = await getTestERC20('axlUSDC')
    expect(await axlUSDC.decimals()).to.eq(6)

    master = (await ethers.deployContract('BoostedMasterWombat')) as BoostedMasterWombat
    voter = (await getDeployedContract('Voter')) as Voter
    wom = (await getDeployedContract('WombatERC20', 'WombatToken')) as WombatERC20
    veWom = (await getDeployedContract('VeWom')) as VeWom

    await master.initialize(wom.address, veWom.address, voter.address, 375)
    await veWom.setVoter(voter.address)
    await veWom.setMasterWombat(master.address)

    // transfer 40% of wom supply to voter contract
    const womTotalSupply = await wom.totalSupply()
    const amount = parseInt(formatEther(womTotalSupply)) * 0.4
    const amountInWei = parseEther(amount.toString())
    await wom.transfer(voter.address, amountInWei)

    for (let i = 0; i <= 6; i++) {
      await wom.transfer(users[i].address, parseEther('20000000'))
      await wom.connect(users[i]).approve(veWom.address, parseEther('20000000'))
    }
  })

  describe('[All pools] Dialuting + non-dialuting pool', async function () {
    let usdc: Contract
    let usdt: Contract
    let mim: Contract
    let dai: Contract

    beforeEach(async function () {
      const emissionsPerSec = parseEther('0.91324200913242')
      const partnerRewardPerSec = parseUnits('0.273972', 6) // 0.91324200913242 * 0.3

      await voter.setWomPerSec(emissionsPerSec)

      // deploy usdc and the other tokens
      usdc = await ethers.deployContract('TestERC20', ['USDC', 'LP-USDC', 18, parseUnits('10000000000', 18)])
      await usdc.deployed()

      usdt = await ethers.deployContract('TestERC20', ['USDT', 'LP-USDT', 18, parseUnits('10000000000', 18)])
      await usdt.deployed()

      mim = await ethers.deployContract('TestERC20', ['MIM', 'LP-MIM', 18, parseEther('10000000000')])
      await mim.deployed()

      dai = await ethers.deployContract('TestERC20', ['DAI', 'LP-DAI', 18, parseEther('10000000000')])
      await dai.deployed()

      // credit users with usdc
      await usdc.transfer(users[1].address, parseUnits('60000'))
      await usdc.transfer(users[2].address, parseUnits('90000'))
      await usdc.transfer(users[3].address, parseUnits('700000'))
      await usdc.transfer(users[4].address, parseUnits('1500000'))
      await usdc.transfer(users[5].address, parseUnits('18000000'))
      await usdc.transfer(users[6].address, parseUnits('30000000'))

      // credit users with mockveWom
      await veWom.connect(users[0]).mint(parseEther('100'), 1461)
      await veWom.connect(users[1]).mint(parseEther('22000'), 1461)
      // await veWom.connect(users[2]).faucet(parseEther('0')) // users[2] has no veWom.
      await veWom.connect(users[3]).mint(parseEther('3000'), 1461)
      await veWom.connect(users[4]).mint(parseEther('128000'), 1461)
      await veWom.connect(users[5]).mint(parseEther('5129300'), 1461)
      await veWom.connect(users[6]).mint(parseEther('16584200'), 1461)

      // approve spending by pool
      await usdc.connect(users[1]).approve(master.address, parseUnits('60000'))
      await usdc.connect(users[2]).approve(master.address, parseUnits('90000'))
      await usdc.connect(users[3]).approve(master.address, parseUnits('700000'))
      await usdc.connect(users[4]).approve(master.address, parseUnits('1500000'))
      await usdc.connect(users[5]).approve(master.address, parseUnits('18000000'))
      await usdc.connect(users[6]).approve(master.address, parseUnits('30000000'))

      /// other tokens
      await usdt.transfer(users[7].address, parseUnits('50000000'))
      await usdt.connect(users[7]).approve(master.address, parseUnits('50000000'))

      await dai.transfer(users[8].address, parseEther('40000000'))
      await dai.connect(users[8]).approve(master.address, parseUnits('40000000', 18))

      await mim.transfer(users[9].address, parseEther('20000000'))
      await mim.connect(users[9]).approve(master.address, parseUnits('20000000', 18))

      rewarder = (await ethers.deployContract('BoostedMultiRewarder')) as BoostedMultiRewarder
      await rewarder.initialize(
        AddressZero,
        master.address,
        usdc.address,
        startTime,
        axlUSDC.address,
        partnerRewardPerSec
      )
      await axlUSDC.faucet(parseEther('1000000000'))
      await axlUSDC.transfer(rewarder.address, parseEther('1000000000'))

      // add lp-tokens to the wombat master with correct weighing
      await master.add(usdt.address, ethers.constants.AddressZero)
      await master.add(usdc.address, rewarder.address) // Use rewarder for dummyToken
      await master.add(dai.address, ethers.constants.AddressZero)
      await master.add(mim.address, ethers.constants.AddressZero)
      await voter.connect(owner).add(master.address, usdt.address, AddressZero)
      await voter.connect(owner).add(master.address, usdc.address, AddressZero)
      await voter.connect(owner).add(master.address, dai.address, AddressZero)
      await voter.connect(owner).add(master.address, mim.address, AddressZero)

      await voter
        .connect(users[1])
        .vote(
          [usdt.address, usdc.address, dai.address, mim.address],
          [parseEther('30'), parseEther('30'), parseEther('25'), parseEther('15')]
        )

      /// deposits
      // deposit full balance of each user into usdc pool
      await master.connect(users[1]).deposit(1, parseUnits('60000')) // usdc
      await master.connect(users[2]).deposit(1, parseUnits('90000')) // usdc
      await master.connect(users[3]).deposit(1, parseUnits('350000')) // usdc
      await master.connect(users[4]).deposit(1, parseUnits('1500000')) // usdc
      await master.connect(users[5]).deposit(1, parseUnits('18000000')) // usdc
      await master.connect(users[6]).deposit(1, parseUnits('30000000')) // usdc

      // deposit for other tokens
      await master.connect(users[7]).deposit(0, parseUnits('50000000')) // usdt
      await master.connect(users[8]).deposit(2, parseUnits('40000000', 18)) // dai
      await master.connect(users[9]).deposit(3, parseUnits('20000000', 18)) // mim
    })

    it('should withdraw and claim wom', async function () {
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year

      // withdraw usdc users[1]
      let { pendingBonusRewards } = await master.pendingTokens(1, users[1].address)
      let pendingTokens = pendingBonusRewards[0]
      await master.connect(users[1]).withdraw(1, parseUnits('60000'))
      expect(await axlUSDC.balanceOf(users[1].address)).to.near(parseUnits('9939', 6))
      expect(await axlUSDC.balanceOf(users[1].address)).to.near(pendingTokens)

      // withdraw usdc user[2] forgot to stake his wom
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[2].address))
      pendingTokens = pendingBonusRewards[0]
      await master.connect(users[2]).withdraw(1, parseUnits('90000'))
      expect(await axlUSDC.balanceOf(users[2].address)).to.near(parseUnits('5831', 6))
      expect(await axlUSDC.balanceOf(users[2].address)).to.near(pendingTokens)

      // withdraw usdc users[3]
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[3].address))
      pendingTokens = pendingBonusRewards[0]
      await master.connect(users[3]).withdraw(1, parseUnits('350000'))
      expect(await axlUSDC.balanceOf(users[3].address)).to.near(parseUnits('28076', 6))
      expect(await axlUSDC.balanceOf(users[3].address)).to.near(pendingTokens)

      // withdraw usdc users[4]
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[4].address))
      pendingTokens = pendingBonusRewards[0]
      await master.connect(users[4]).withdraw(1, parseUnits('1500000'))
      expect(await axlUSDC.balanceOf(users[4].address)).to.near(parseUnits('170180', 6))
      expect(await axlUSDC.balanceOf(users[4].address)).to.near(pendingTokens)

      // withdraw usdc users[5]
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[5].address))
      pendingTokens = pendingBonusRewards[0]
      await master.connect(users[5]).withdraw(1, parseUnits('18000000'))
      expect(await axlUSDC.balanceOf(users[5].address)).to.near(parseUnits('2766790', 6))
      expect(await axlUSDC.balanceOf(users[5].address)).to.near(pendingTokens)

      // withdraw usdc users[6]
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[6].address))
      pendingTokens = pendingBonusRewards[0]
      await master.connect(users[6]).withdraw(1, parseUnits('30000000'))
      expect(await axlUSDC.balanceOf(users[6].address)).to.near(parseUnits('5659094', 6))
      expect(await axlUSDC.balanceOf(users[6].address)).to.near(pendingTokens)
    })

    it('should claim with the deposit function (reward: ERC20 token + native token)', async function () {
      // add AVAX reward
      await rewarder.addRewardToken(ethers.constants.AddressZero, 0, parseEther('0.00027397260274'))
      await owner.sendTransaction({ to: rewarder.address, value: parseEther('9000') })

      // update rewarder to initiate AVAX reward
      await master.connect(users[1]).deposit(1, 0)
      await master.connect(users[2]).deposit(1, 0)
      await master.connect(users[3]).deposit(1, 0)
      await master.connect(users[4]).deposit(1, 0)
      await master.connect(users[5]).deposit(1, 0)
      await master.connect(users[6]).deposit(1, 0)

      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year

      // withdraw usdc users[1]
      await master.connect(users[1]).deposit(1, 0)
      expect(await axlUSDC.balanceOf(users[1].address)).to.near(parseUnits('9930', 6))
      expect((await ethers.provider.getBalance(users[1].address)).sub(parseEther('10000'))).to.be.roughlyNear(
        parseEther('9.930')
      )

      // withdraw usdc user[2] forgot to stake his wom
      await master.connect(users[2]).deposit(1, 0)
      expect(await axlUSDC.balanceOf(users[2].address)).to.near(parseUnits('5831', 6))
      expect((await ethers.provider.getBalance(users[2].address)).sub(parseEther('10000'))).to.be.roughlyNear(
        parseEther('5.831')
      )

      // withdraw usdc users[3]
      await master.connect(users[3]).deposit(1, 0)
      expect(await axlUSDC.balanceOf(users[3].address)).to.near(parseUnits('28077', 6))
      expect((await ethers.provider.getBalance(users[3].address)).sub(parseEther('10000'))).to.be.roughlyNear(
        parseEther('28.077')
      )

      // withdraw usdc users[4]
      await master.connect(users[4]).deposit(1, 0)
      expect(await axlUSDC.balanceOf(users[4].address)).to.near(parseUnits('170182', 6))
      expect((await ethers.provider.getBalance(users[4].address)).sub(parseEther('10000'))).to.be.near(
        parseEther('170.182')
      )

      // withdraw usdc users[5]
      await master.connect(users[5]).deposit(1, 0)
      expect(await axlUSDC.balanceOf(users[5].address)).to.near(parseUnits('2766818', 6))
      expect((await ethers.provider.getBalance(users[5].address)).sub(parseEther('10000'))).to.be.near(
        parseEther('2766.818')
      )

      // withdraw usdc users[6]
      await master.connect(users[6]).deposit(1, 0)
      expect(await axlUSDC.balanceOf(users[6].address)).to.near(parseUnits('5659147', 6))
      expect((await ethers.provider.getBalance(users[6].address)).sub(parseEther('10000'))).to.be.near(
        parseEther('5659.147')
      )
    })

    it('update factor should calculate reward correctly', async function () {
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year

      // console.log(`Current timestamp after a year: ${(await latest()).toNumber()}`)

      // withdraw usdc users[1]
      await veWom.connect(users[1]).mint(parseEther('1'), 1461)
      await master.connect(users[1]).deposit(1, 0)
      expect(await axlUSDC.balanceOf(users[1].address)).to.near(parseUnits('9939', 6))
      // console.log(`usdc apy : ${(9939 / 60000) * 100}`) //

      // withdraw usdc user[2] forgot to stake his wom
      await veWom.connect(users[2]).mint(parseEther('1'), 1461)
      await master.connect(users[2]).deposit(1, 0)
      expect(await axlUSDC.balanceOf(users[2].address)).to.near(parseUnits('5831', 6))
      // console.log(`usdc apy : ${(5831 / 90000) * 100}`) //

      // withdraw usdc users[3]
      await veWom.connect(users[3]).mint(parseEther('1'), 1461)
      await master.connect(users[3]).deposit(1, 0)
      expect(await axlUSDC.balanceOf(users[3].address)).to.near(parseUnits('28077', 6))
      // console.log(`usdc apy : ${(28077 / 350000) * 100}`) //

      // withdraw usdc users[4]
      await veWom.connect(users[4]).mint(parseEther('1'), 1461)
      await master.connect(users[4]).deposit(1, 0)
      expect(await axlUSDC.balanceOf(users[4].address)).to.near(parseUnits('170182', 6))
      // console.log(`usdc apy : ${(170182 / 1500000) * 100}`) //

      // withdraw usdc users[5]
      await veWom.connect(users[5]).mint(parseEther('1'), 1461)
      await master.connect(users[5]).deposit(1, 0)
      expect(await axlUSDC.balanceOf(users[5].address)).to.near(parseUnits('2766818', 6))
      // console.log(`usdc apy : ${(2766818 / 18000000) * 100}`) //

      // withdraw usdc users[6]
      await veWom.connect(users[6]).mint(parseEther('1'), 1461)
      await master.connect(users[6]).deposit(1, 0)
      expect(await axlUSDC.balanceOf(users[6].address)).to.near(parseUnits('5659147', 6))
      // console.log(`usdc apy : ${(5659148 / 30000000) * 100}`) //
    })

    it('update factor should calculate reward correctly afterwards', async function () {
      // advance 4 year
      await advanceTimeAndBlock(60 * 60 * 24 * 1461)

      await master.connect(users[1]).multiClaim([1])
      await master.connect(users[2]).multiClaim([1])
      await master.connect(users[3]).multiClaim([1])
      await master.connect(users[4]).multiClaim([1])
      await master.connect(users[5]).multiClaim([1])
      await master.connect(users[6]).multiClaim([1])

      await veWom.connect(users[1]).mint(parseEther('528000'), 1461)
      await veWom.connect(users[2]).mint(parseEther('528000'), 1461)
      await veWom.connect(users[3]).mint(parseEther('528000'), 1461)
      await veWom.connect(users[4]).burn(0)

      // advance one year
      await advanceTimeAndBlock(60 * 60 * 24 * 365)

      // pending usdc users[1]
      let { pendingBonusRewards } = await master.pendingTokens(1, users[1].address)
      expect(pendingBonusRewards[0]).to.near(parseUnits('33845', 6))

      // pending usdc user[2] forgot to stake his wom
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[2].address))
      expect(pendingBonusRewards[0]).to.near(parseUnits('41780', 6))

      // pending usdc users[3]
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[3].address))
      expect(pendingBonusRewards[0]).to.near(parseUnits('93773', 6))

      // pending usdc users[4]
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[4].address))
      expect(pendingBonusRewards[0]).to.near(parseUnits('97198', 6))

      // pending usdc users[5]
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[5].address))
      expect(pendingBonusRewards[0]).to.near(parseUnits('2750964', 6))

      // pending usdc users[6]
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[6].address))
      expect(pendingBonusRewards[0]).to.near(parseUnits('5622357', 6))

      await veWom.connect(users[1]).mint(parseEther('528000'), 1461)
      await veWom.connect(users[2]).mint(parseEther('528000'), 1461)
      await veWom.connect(users[3]).mint(parseEther('528000'), 1461)
      await master.connect(users[3]).deposit(1, parseUnits('350000')) // deposit
      await master.connect(users[5]).withdraw(1, parseUnits('18000000')) // withdraw
      await veWom.connect(users[6]).burn(0)

      // advance one year
      await advanceTimeAndBlock(60 * 60 * 24 * 365)

      // pending usdc users[1]
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[6].address))
      expect(pendingBonusRewards[0]).to.near(parseUnits('8626977', 6))
      await master.connect(users[1]).multiClaim([1])

      // pending usdc user[2] forgot to stake his wom
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[2].address))
      expect(pendingBonusRewards[0]).to.near(parseUnits('1220184', 6))
      await master.connect(users[2]).multiClaim([1])

      // pending usdc users[3]
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[3].address))
      expect(pendingBonusRewards[0]).to.near(parseUnits('3336008', 6))
      await master.connect(users[3]).multiClaim([1])

      // pending usdc users[4]
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[4].address))
      expect(pendingBonusRewards[0]).to.near(parseUnits('247429', 6))
      await master.connect(users[4]).multiClaim([1])

      // pending usdc users[5]
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[5].address))
      expect(pendingBonusRewards[0]).to.near(parseUnits('0', 6))
      await master.connect(users[5]).multiClaim([1])

      // pending usdc users[6]
      ;({ pendingBonusRewards } = await master.pendingTokens(1, users[6].address))
      expect(pendingBonusRewards[0]).to.near(parseUnits('8626977', 6))
    })
  })
})
