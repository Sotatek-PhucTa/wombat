import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { deployments, ethers } from 'hardhat'
import { getDeployedContract, setRewarder } from '../../utils'
import { latest } from '../helpers'
import { expect } from 'chai'
import { getSignersFromCurrentNetwork } from '../../utils/signer'

describe('Second class chain', async function () {
  const AddressZero = ethers.constants.AddressZero

  let multisig: SignerWithAddress
  let user: SignerWithAddress
  let project: SignerWithAddress
  let masterWombat: Contract
  let pool: Contract
  let usdc: Contract
  let usdt: Contract
  let usdcAsset: Contract

  beforeEach(async function () {
    ;[multisig, user, project] = await getSignersFromCurrentNetwork()
    await deployments.fixture([
      'MockTokens',
      'HighCovRatioFeePool',
      'CrossChainPoolAssets',
      'HighCovRatioFeePoolAssets',
    ])
    ;[usdc, usdt, usdcAsset, pool] = await Promise.all([
      getDeployedContract('TestERC20', 'USDC'),
      getDeployedContract('TestERC20', 'USDT'),
      getDeployedContract('Asset', 'Asset_MainPool_USDC'),
      getDeployedContract('HighCovRatioFeePool', 'MainPool'),
    ])

    masterWombat = await ethers.deployContract('BoostedMasterWombat')
    await masterWombat.initialize(AddressZero, AddressZero, AddressZero, 1000)

    const rewarder = await ethers.deployContract('MultiRewarderPerSec', [
      masterWombat.address,
      usdcAsset.address,
      (await latest()).add(60),
      usdc.address,
      parseEther('1'),
    ])
    await masterWombat.connect(multisig).add(usdcAsset.address, AddressZero)
    await setRewarder(masterWombat, multisig, usdcAsset.address, rewarder.address)
    await pool.setMasterWombat(masterWombat.address)

    await usdc.connect(user).faucet(parseEther('1000'))
    await usdt.connect(user).faucet(parseEther('1000'))

    await usdc.connect(user).approve(pool.address, ethers.constants.MaxUint256)
    await usdt.connect(user).approve(pool.address, ethers.constants.MaxUint256)
  })

  it('MW has empty wom and vewom', async function () {
    expect(await masterWombat.wom()).to.eq(AddressZero)
    expect(await masterWombat.veWom()).to.eq(AddressZero)
  })

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
})
