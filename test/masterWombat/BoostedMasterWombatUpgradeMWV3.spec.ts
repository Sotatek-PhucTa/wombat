import { deployments, ethers, getNamedAccounts } from 'hardhat'
import {
  Asset,
  BoostedMasterWombat,
  BribeRewarderFactory,
  HighCovRatioFeePool,
  MultiRewarderPerSec,
  TestERC20,
  WombatERC20,
} from '../../build/typechain'
import { BigNumberish, ContractReceipt } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { advanceTime, advanceTimeAndBlock, latest } from '../helpers'
import { assert, expect } from 'chai'
import { confirmTxn, getDeployedContract } from '../../utils'
import { executeBatchTransaction } from '../../utils/multisig/transactions'
import { upgradeProxy } from '../../utils/multisig/utils'
import { deployBoostedRewarderUsingFactory } from '../../utils/deploy'

const { AddressZero } = ethers.constants

describe('BoostedMasterWombat upgrade from MasterWombatV3', function () {
  let multisigSigner: SignerWithAddress
  let owner: SignerWithAddress

  let mw: BoostedMasterWombat

  let pool: HighCovRatioFeePool

  let lpusdc: Asset
  let lpbusd: Asset

  let busdRewarder: MultiRewarderPerSec
  let lpBusdBoostedRewarderAddr: string
  let lpUsdcBoostedRewarderAddr: string

  let bribeRewarderFactory: BribeRewarderFactory

  let usdc: TestERC20
  let busd: TestERC20
  let dai: TestERC20
  let vusdc: TestERC20

  let lpUsdcPid: BigNumberish
  let lpBusdPid: BigNumberish

  before(async function () {
    ;[owner] = await ethers.getSigners()
  })

  beforeEach(async function () {
    const { multisig } = await getNamedAccounts()
    multisigSigner = await SignerWithAddress.create(ethers.provider.getSigner(multisig))
    await deployments.fixture([
      'MasterWombatV3',
      'HighCovRatioFeePool',
      'HighCovRatioFeePoolAssets',
      'CrossChainPoolAssets',
      'BoostedMasterWombatSetup',
      'MultiRewarderPerSec',
      'MultiRewarderSetup',
      'MockTokens',
      'VeWom',
      'Voter',
      'VoterSetup',
      'WombatToken',
      'BoostedMasterWombat_Implementation',
    ])

    mw = (await getDeployedContract('MasterWombatV3')) as BoostedMasterWombat

    lpbusd = (await getDeployedContract('Asset', 'Asset_MainPool_BUSD')) as Asset
    lpusdc = (await getDeployedContract('Asset', 'Asset_MainPool_USDC')) as Asset
    busd = (await getDeployedContract('TestERC20', 'BUSD')) as TestERC20
    usdc = (await getDeployedContract('TestERC20', 'USDC')) as TestERC20
    dai = (await getDeployedContract('TestERC20', 'DAI')) as TestERC20
    vusdc = (await getDeployedContract('TestERC20', 'vUSDC')) as TestERC20
    busdRewarder = (await getDeployedContract(
      'MultiRewarderPerSec',
      'MultiRewarderPerSec_V3_Asset_MainPool_BUSD'
    )) as MultiRewarderPerSec
    pool = (await getDeployedContract('HighCovRatioFeePool', 'MainPool')) as HighCovRatioFeePool

    await pool.setMasterWombat(mw.address)

    lpBusdPid = await mw.getAssetPid(lpbusd.address)
    lpUsdcPid = await mw.getAssetPid(lpusdc.address)

    await advanceTime(1000)

    await busd.faucet(parseEther('2000000'))
    await busd.transfer(busdRewarder.address, parseEther('1000000'))

    await usdc.faucet(parseEther('1000000'))
    await dai.faucet(parseEther('1000000'))
    await vusdc.faucet(parseEther('1000000'))
    await busd.approve(pool.address, parseEther('1000000000'))
    await usdc.approve(pool.address, parseEther('1000000000'))

    await pool.deposit(busd.address, parseEther('1000'), 0, owner.address, '1000000000000', true)
    await pool.deposit(usdc.address, parseUnits('1000', 6), 0, owner.address, '1000000000000', true)

    await executeBatchTransaction(
      multisigSigner,
      await upgradeProxy('MasterWombatV3_Proxy', 'BoostedMasterWombat_Implementation')
    )

    mw = (await ethers.getContractAt('BoostedMasterWombat', mw.address)) as BoostedMasterWombat
  })

  it('verify stake amount same as before', async function () {
    const { amount: depositedLpBusd } = await mw.userInfo(lpBusdPid, owner.address)
    expect(depositedLpBusd).to.eq(parseEther('1000'))

    const { amount: depositedLpUsdc } = await mw.userInfo(lpUsdcPid, owner.address)
    expect(depositedLpUsdc).to.eq(parseUnits('1000', 6))
  })

  it('Verify rewarder address remain', async function () {
    const lpUsdcRewarder = (await mw.poolInfoV3(lpUsdcPid)).rewarder
    expect(lpUsdcRewarder).to.eq(AddressZero)

    const lpBusdRewarder = (await mw.poolInfoV3(lpBusdPid)).rewarder
    expect(lpBusdRewarder).to.eq(busdRewarder.address)
  })

  describe('Boosted rewarder', function () {
    beforeEach(async function () {
      await deployments.fixture(['BribeRewarderBeacon', 'BribeRewarderFactory'], { keepExistingDeployments: true })

      bribeRewarderFactory = (await getDeployedContract('BribeRewarderFactory')) as BribeRewarderFactory
      mw.setBribeRewarderFactory(bribeRewarderFactory.address)

      await bribeRewarderFactory.whitelistRewardToken(vusdc.address)
      await bribeRewarderFactory.whitelistRewardToken(dai.address)

      await bribeRewarderFactory.setRewarderDeployer(lpbusd.address, owner.address)
      lpBusdBoostedRewarderAddr = await deployBoostedRewarderUsingFactory(
        bribeRewarderFactory,
        owner,
        lpbusd.address,
        dai.address,
        (await latest()).add(1),
        parseEther('1')
      )
      await dai.transfer(lpBusdBoostedRewarderAddr, parseEther('1000000'))

      await bribeRewarderFactory.setRewarderDeployer(lpusdc.address, owner.address)
      lpUsdcBoostedRewarderAddr = await deployBoostedRewarderUsingFactory(
        bribeRewarderFactory,
        owner,
        lpusdc.address,
        vusdc.address,
        (await latest()).add(1),
        parseEther('1')
      )
      await vusdc.transfer(lpUsdcBoostedRewarderAddr, parseEther('1000000'))

      await pool.deposit(busd.address, parseEther('1'), 0, owner.address, '1000000000000', true)
      await pool.deposit(usdc.address, parseUnits('1', 6), 0, owner.address, '1000000000000', true)
      await advanceTimeAndBlock(86400 * 365)
    })

    it('Rewarder and BoostedRewarder config correctly', async function () {
      const { rewarder: actualLpbusdRewarder } = await mw.poolInfoV3(lpBusdPid)
      expect(actualLpbusdRewarder).to.eq(busdRewarder.address)
      expect(await mw.boostedRewarders(lpBusdPid)).to.eq(lpBusdBoostedRewarderAddr)

      expect(await mw.boostedRewarders(lpUsdcPid)).to.eq(lpUsdcBoostedRewarderAddr)
    })

    it('Can remove rewarder', async function () {
      await mw.setRewarder(lpBusdPid, ethers.constants.AddressZero)
      expect((await mw.poolInfoV3(lpBusdPid)).rewarder).to.eq(ethers.constants.AddressZero)
    })

    it('pendingTokens should be include rewarder and boosted rewarder', async function () {
      const lpBusdPendingTokens = await mw.pendingTokens(lpBusdPid, owner.address)
      expect(lpBusdPendingTokens.bonusTokenAddresses).to.have.members([busd.address, dai.address])

      const lpUsdcPendingTokens = await mw.pendingTokens(lpUsdcPid, owner.address)
      expect(lpUsdcPendingTokens.bonusTokenAddresses).to.have.members([vusdc.address])
    })

    it('multiclaim token included from both the old rewarder and the boosted rewarder', async function () {
      const balanceBefore1 = await busd.balanceOf(owner.address)
      const balanceBefore2 = await dai.balanceOf(owner.address)
      const balanceBefore3 = await vusdc.balanceOf(owner.address)

      await mw.multiClaim([lpBusdPid, lpUsdcPid])

      const balanceAfter1 = await busd.balanceOf(owner.address)
      const balanceAfter2 = await dai.balanceOf(owner.address)
      const balanceAfter3 = await vusdc.balanceOf(owner.address)

      expect(balanceAfter1.sub(balanceBefore1)).to.gt(0)
      expect(balanceAfter2.sub(balanceBefore2)).to.gt(0)
      expect(balanceAfter3.sub(balanceBefore3)).to.gt(0)
    })
  })
})
