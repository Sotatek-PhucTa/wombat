import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { Contract } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { deployments, ethers } from 'hardhat'
import { getDeployedContract } from '../../utils'

describe('Arbitrum', function () {
  let multisig: SignerWithAddress
  let user: SignerWithAddress
  let masterWombatV3: Contract
  let vewom: Contract
  let voter: Contract
  let pool: Contract
  let busd: Contract
  let busdAsset: Contract
  let wom: Contract

  beforeEach(async function () {
    ;[multisig, user] = await ethers.getSigners()
    await deployments.fixture([
      'Asset',
      'HighCovRatioFeePool',
      'HighCovRatioFeePoolAssets',
      'MasterWombatV3',
      'MasterWombatV3Setup',
      'MockTokens',
      'Pool',
      'VeWom',
      'VeWomSetup',
      'Voter',
      'VoterSetup',
      'WombatToken',
    ])
    ;[masterWombatV3, vewom, voter, pool, busd, busdAsset, wom] = await Promise.all([
      getDeployedContract('MasterWombatV3'),
      getDeployedContract('VeWom'),
      getDeployedContract('Voter'),
      getDeployedContract('Pool'),
      getDeployedContract('TestERC20', 'BUSD'),
      getDeployedContract('Asset', 'Asset_P01_BUSD'),
      getDeployedContract('WombatERC20', 'WombatToken'),
    ])

    expect(await masterWombatV3.veWom()).to.eql(vewom.address)
    expect(await masterWombatV3.voter()).to.eql(voter.address)

    await wom.connect(multisig).transfer(user.address, parseEther('1000'))
    await busd.connect(user).faucet(parseEther('1000'))
    expect(await wom.balanceOf(user.address)).to.eq(parseEther('1000'))
    expect(await busd.balanceOf(user.address)).to.eq(parseEther('1000'))
  })

  describe('User', function () {
    it('can deposit and stake', async function () {
      await pool.connect(multisig).setMasterWombat(masterWombatV3.address)
      await busd.connect(user).approve(pool.address, ethers.constants.MaxUint256)
      return pool
        .connect(user)
        .deposit(busd.address, parseEther('1'), 0, user.address, ethers.constants.MaxUint256, true)
    })

    it('can mint vewom', async function () {
      await wom.connect(user).approve(vewom.address, ethers.constants.MaxUint256)
      await vewom.connect(user).mint(parseEther('1'), 1000)
    })

    it('can vote', async function () {
      await wom.connect(user).approve(vewom.address, ethers.constants.MaxUint256)
      await vewom.connect(user).mint(parseEther('1'), 1000)
      await voter.connect(user).vote([busdAsset.address], [parseEther('0.1')])
    })
  })

  describe('Multsig', function () {
    it('can whitelist projects', async function () {
      const whitelist = await ethers.getContractAt('Whitelist', await vewom.whitelist())
      expect(await whitelist.check(user.address)).to.eq(false)
      await whitelist.approveWallet(user.address)
      expect(await whitelist.check(user.address)).to.eq(true)
    })
  })
})
