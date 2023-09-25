import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { assert, expect } from 'chai'
import { Contract, ContractReceipt } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { confirmTxn, getDeployedContract, isForkedNetwork } from '../../utils'
import { latest } from '../helpers'

describe('New chain Skale/Scroll', function () {
  let multisig: SignerWithAddress
  let user: SignerWithAddress
  let project: SignerWithAddress
  let masterWombat: Contract
  let vewom: Contract
  let voter: Contract
  let pool: Contract
  let usdc: Contract
  let usdt: Contract
  let usdcAsset: Contract
  let bribeRewarderFactory: Contract
  let wom: Contract

  beforeEach(async function () {
    if (isForkedNetwork()) {
      const { multisig: multisigAddr } = await getNamedAccounts()
      multisig = await SignerWithAddress.create(ethers.provider.getSigner(multisigAddr))
      ;[user, project] = await ethers.getSigners()
    } else {
      ;[multisig, user, project] = await ethers.getSigners()
    }
    await deployments.fixture([
      'MockTokens',
      'WombatToken',
      'HighCovRatioFeePool',
      'CrossChainPoolAssets',
      'HighCovRatioFeePoolAssets',
      'VeWom',
      'BoostedMasterWombat',
      'BribeRewarderBeacon',
      'BribeRewarderFactory',
      'VeWomSetup',
      'BoostedMasterWombatSetup',
    ])
    ;[masterWombat, vewom, usdc, usdt, usdcAsset, wom, pool, bribeRewarderFactory] = await Promise.all([
      getDeployedContract('BoostedMasterWombat'),
      getDeployedContract('VeWom'),
      getDeployedContract('TestERC20', 'USDC'),
      getDeployedContract('TestERC20', 'USDT'),
      getDeployedContract('Asset', 'Asset_MainPool_USDC'),
      getDeployedContract('WombatERC20', 'WombatToken'),
      getDeployedContract('HighCovRatioFeePool', 'MainPool'),
      getDeployedContract('BribeRewarderFactory'),
    ])

    await wom.connect(multisig).transfer(user.address, parseEther('1000'))
    await usdc.connect(user).faucet(parseEther('1000'))
    await usdt.connect(user).faucet(parseEther('1000'))

    await usdc.connect(user).approve(pool.address, ethers.constants.MaxUint256)
    await usdt.connect(user).approve(pool.address, ethers.constants.MaxUint256)
  })

  describe('User', function () {
    it('can deposit, withdraw', async function () {
      await pool.connect(user).deposit(usdc.address, parseEther('100'), 1, user.address, 1000000000000, false)

      await usdcAsset.connect(user).approve(pool.address, ethers.constants.MaxUint256)
      const assetBalance = await usdcAsset.balanceOf(user.address)
      await pool.connect(user).withdraw(usdc.address, assetBalance, 1, user.address, 1000000000000)
    })

    it('can swap', async function () {
      await pool.connect(user).deposit(usdc.address, parseEther('100'), 1, user.address, 1000000000000, false)
      await pool.connect(user).deposit(usdt.address, parseEther('100'), 1, user.address, 1000000000000, false)

      await pool.connect(user).swap(usdc.address, usdt.address, parseEther('1'), 0, user.address, 1000000000000)
    })

    it('can stake', async function () {
      await pool.connect(user).deposit(usdc.address, parseEther('100'), 1, user.address, 1000000000000, true)
    })

    it('cannot lock WOM to mint VeWom', async function () {
      await wom.connect(user).approve(vewom.address, ethers.constants.MaxUint256)
      await expect(vewom.connect(user).mint(parseEther('1'), 1000)).to.be.reverted
    })
  })

  describe('Multsig', function () {
    it('can whitelist projects', async function () {
      await bribeRewarderFactory.connect(multisig).setRewarderDeployer(usdcAsset.address, project.address)
      await bribeRewarderFactory.connect(multisig).whitelistRewardToken(usdt.address)

      const receipt = (await confirmTxn(
        bribeRewarderFactory
          .connect(project)
          .deployRewarderContractAndSetRewarder(
            usdcAsset.address,
            (await latest()).add(1),
            usdt.address,
            parseEther('1')
          )
      )) as ContractReceipt

      assert(receipt.events)
      const event = receipt.events.find((e: any) => e.event === 'DeployRewarderContract')
      assert(event)
      const rewarderAddr = event.args?.rewarder
      const rewarder = await ethers.getContractAt('BoostedMultiRewarder', rewarderAddr)
      expect(await rewarder.owner()).to.eq(multisig.address)
    })
  })
})
