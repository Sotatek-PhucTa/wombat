import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { assert, expect } from 'chai'
import { Contract, ContractReceipt } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { confirmTxn, getDeployedContract, isForkedNetwork } from '../../utils'
import { latest } from '../helpers'

describe('New chain', function () {
  let multisig: SignerWithAddress
  let user: SignerWithAddress
  let project: SignerWithAddress
  let masterWombat: Contract
  let vewom: Contract
  let voter: Contract
  let pool: Contract
  let busd: Contract
  let vusdc: Contract
  let busdAsset: Contract
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
      'CrossChainPool',
      'WormholeAdaptor',
      'CrossChainPoolAssets',
      'HighCovRatioFeePoolAssets',
      'WormholeAdaptorSetup',
      'VeWom',
      'BoostedMasterWombat',
      'BribeRewarderBeacon',
      'BribeRewarderFactory',
      'VeWomSetup',
      'MasterWombatV3Setup',
      'BoostedMasterWombatSetup',
    ])
    ;[masterWombat, vewom, busd, vusdc, busdAsset, wom, pool, bribeRewarderFactory] = await Promise.all([
      getDeployedContract('BoostedMasterWombat'),
      getDeployedContract('VeWom'),
      getDeployedContract('TestERC20', 'BUSD'),
      getDeployedContract('TestERC20', 'vUSDC'),
      getDeployedContract('Asset', 'Asset_Stablecoin_Pool_BUSD'),
      getDeployedContract('WombatERC20', 'WombatToken'),
      getDeployedContract('CrossChainPool', 'CrossChainPool_Stablecoin_Pool'),
      getDeployedContract('BribeRewarderFactory'),
    ])

    // Workaround because the BoostedMasterWombat run after CrossChainPool
    // There is no MW to set when CCP newly deployed
    await vewom.connect(multisig).pause()
    await pool.connect(multisig).setMasterWombat(masterWombat.address)
    await wom.connect(multisig).transfer(user.address, parseEther('1000'))
    await busd.connect(user).faucet(parseEther('1000'))
    await vusdc.connect(user).faucet(parseEther('1000'))
  })

  describe('Step 1', function () {
    beforeEach(async function () {
      await busd.connect(user).approve(pool.address, ethers.constants.MaxUint256)
      await vusdc.connect(user).approve(pool.address, ethers.constants.MaxUint256)
    })

    describe('User', function () {
      it('can deposit, withdraw', async function () {
        await pool.connect(user).deposit(busd.address, parseEther('100'), 1, user.address, 1000000000000, false)

        await busdAsset.connect(user).approve(pool.address, ethers.constants.MaxUint256)
        const assetBalance = await busdAsset.balanceOf(user.address)
        await pool.connect(user).withdraw(busd.address, assetBalance, 1, user.address, 1000000000000)
      })

      it('can swap', async function () {
        await pool.connect(user).deposit(busd.address, parseEther('100'), 1, user.address, 1000000000000, false)
        await pool.connect(user).deposit(vusdc.address, parseEther('100'), 1, user.address, 1000000000000, false)

        await pool.connect(user).swap(busd.address, vusdc.address, parseEther('1'), 0, user.address, 1000000000000)
      })

      it('can swap crosschain', async function () {
        await pool.connect(user).deposit(busd.address, parseEther('100'), 1, user.address, 1000000000000, false)

        await pool
          .connect(user)
          .swapTokensForTokensCrossChain(busd.address, vusdc.address, 0, parseEther('1'), 0, 0, user.address, 0, 0)
      })

      it('can stake', async function () {
        await pool.connect(user).deposit(busd.address, parseEther('100'), 1, user.address, 1000000000000, true)
      })

      it('cannot lock WOM to mint VeWom', async function () {
        await wom.connect(user).approve(vewom.address, ethers.constants.MaxUint256)
        await expect(vewom.connect(user).mint(parseEther('1'), 1000)).to.be.reverted
      })
    })

    describe('Multsig', function () {
      it('can whitelist projects', async function () {
        await bribeRewarderFactory.connect(multisig).setRewarderDeployer(busdAsset.address, project.address)
        await bribeRewarderFactory.connect(multisig).whitelistRewardToken(vusdc.address)

        const receipt = (await confirmTxn(
          bribeRewarderFactory
            .connect(project)
            .deployRewarderContractAndSetRewarder(
              busdAsset.address,
              (await latest()).add(1),
              vusdc.address,
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

  describe('Step 2', function () {
    beforeEach(async function () {
      await deployments.fixture(['Voter', 'VoterSetup', 'VeWomSetup', 'BribeRewarderFactory'], {
        keepExistingDeployments: true,
      })
      voter = await getDeployedContract('Voter')
      await vewom.connect(multisig).unpause()
    })

    describe('User', function () {
      it('Can lock WOM into VeWom', async function () {
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
        await bribeRewarderFactory.connect(multisig).setBribeDeployer(busdAsset.address, project.address)
        await bribeRewarderFactory.connect(multisig).whitelistRewardToken(vusdc.address)

        const receipt = (await confirmTxn(
          bribeRewarderFactory
            .connect(project)
            .deployBribeContractAndSetBribe(busdAsset.address, (await latest()).add(1), vusdc.address, parseEther('1'))
        )) as ContractReceipt

        assert(receipt.events)
        const event = receipt.events.find((e: any) => e.event === 'DeployBribeContract')
        assert(event)
        const bribeAddr = event.args?.bribe
        const bribe = await ethers.getContractAt('BribeV2', bribeAddr)
        expect(await bribe.owner()).to.eq(multisig.address)
      })
    })
  })
})
