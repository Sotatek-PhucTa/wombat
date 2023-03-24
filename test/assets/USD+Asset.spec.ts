import { parseUnits } from '@ethersproject/units'
import chai from 'chai'
import { Contract } from 'ethers'
import { ethers } from 'hardhat'

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { parseEther } from 'ethers/lib/utils'
import { PoolV3 } from '../../build/typechain'
import { latest } from '../helpers'

const { expect } = chai

describe('USD+ Asset', function () {
  let owner: SignerWithAddress
  let rest: SignerWithAddress[]
  let user: SignerWithAddress
  let pool: PoolV3
  let token: Contract
  let token2: Contract
  let asset: Contract
  let asset2: Contract

  beforeEach(async function () {
    ;[owner, ...rest] = await ethers.getSigners()
    user = rest[0]

    const coreV3 = await ethers.deployContract('CoreV3')
    token = await ethers.deployContract('TestERC20', ['USD+', 'USD+ Token', 6, parseUnits('10000000', 8)])
    token2 = await ethers.deployContract('TestERC20', ['Venus USDC', 'vUSDC', 8, parseUnits('10000000', 8)])
    asset = await ethers.deployContract('USDPlusAsset', [token.address, 'USD+ LP', 'USD+-LP'])
    asset2 = await ethers.deployContract('Asset', [token2.address, 'Venus USD LP', 'vUSDC-LP'])
    // pool = (await ethers.deployContract('PoolV3', { libraries: { CoreV3: coreV3.address } })) as PoolV3
    pool = (await ethers.deployContract('PoolV2')) as PoolV3

    await pool.connect(owner).initialize(parseEther('0.05'), parseEther('0.004'))
    await pool.connect(owner).addAsset(token.address, asset.address)
    await pool.connect(owner).addAsset(token2.address, asset2.address)

    // set dummy pool address
    await asset.setPool(pool.address)
    await asset2.setPool(pool.address)
    await asset.addUSDPlusAdmin(owner.address)

    await token.connect(owner).transfer(user.address, parseUnits('100000', 6))
    await token2.connect(owner).transfer(user.address, parseUnits('100000', 8))

    await token.connect(user).approve(pool.address, ethers.constants.MaxUint256)
    await token2.connect(user).approve(pool.address, ethers.constants.MaxUint256)

    // deposit 10k BUSD and 1k vUSDC and 1k USDT to pool
    const lastBlockTime = await latest()
    const fiveSecondsSince = lastBlockTime.add(5)
    await pool.connect(user).deposit(token.address, parseUnits('1000', 6), 0, user.address, fiveSecondsSince, false)
    await pool.connect(user).deposit(token2.address, parseUnits('1000', 8), 0, user.address, fiveSecondsSince, false)
  })

  it('skim work with lpDividend', async function () {
    // all fees is shared to LP
    await pool.setFee(parseEther('1'), 0)

    await accrueHaircut()

    const skimAmount = await asset.connect(owner).callStatic.skim(owner.address)
    expect(skimAmount).to.eq(parseUnits('0.000001', 6)) // come from decimals error

    // mock token rebase
    await token.transfer(asset.address, parseUnits('1', 6))

    // skim rebase token!
    const skimAmount2 = await asset.connect(owner).callStatic.skim(owner.address)
    expect(skimAmount2).to.eq(parseUnits('1.000001', 6)) // 0.000001 come from decimals error
  })

  it('skim does NOT work with retentionRatio', async function () {
    // all fees remain in the pool
    await pool.setFee(0, parseEther('1'))

    await accrueHaircut()

    const skimAmount = await asset.connect(owner).callStatic.skim(owner.address)
    expect(skimAmount).to.eq(parseUnits('0.396195', 6))
  })

  it('skim work with dividend', async function () {
    // all fees are sent to `feeTo`
    await pool.setFee(0, 0)
    await pool.setFeeTo(owner.address)

    await accrueHaircut()

    const skimAmount = await asset.connect(owner).callStatic.skim(owner.address)
    expect(skimAmount).to.eq(parseUnits('0.000001', 6)) // come from decimals error

    // mock token rebase
    await token.transfer(asset.address, parseUnits('1', 6))

    // skim rebase token!
    const skimAmount2 = await asset.connect(owner).callStatic.skim(owner.address)
    expect(skimAmount2).to.eq(parseUnits('1.000001', 6)) // 0.000001 come from decimals error
  })

  it('skim is permisioneed', async function () {
    await expect(asset.connect(user).skim(owner.address)).to.be.revertedWith('not authorized')
  })

  async function accrueHaircut() {
    // accrue some haircut from swap
    const lastBlockTime = await latest()
    const fiveSecondsSince = lastBlockTime.add(5)
    await pool
      .connect(user)
      .swap(token2.address, token.address, parseUnits('100', 8), 0, user.address, fiveSecondsSince)
  }
})
