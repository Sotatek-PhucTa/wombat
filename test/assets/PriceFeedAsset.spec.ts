import { parseUnits } from '@ethersproject/units'
import chai from 'chai'
import { Contract } from 'ethers'
import { ethers } from 'hardhat'

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { parseEther } from 'ethers/lib/utils'
import { Asset, GovernedPriceFeed, PoolV3, PriceFedAsset, TestERC20 } from '../../build/typechain'
import { latest } from '../helpers'

const { expect } = chai

describe('USD+ Asset', function () {
  let owner: SignerWithAddress
  let rest: SignerWithAddress[]
  let user: SignerWithAddress
  let pool: PoolV3
  let token: TestERC20
  let token2: TestERC20
  let asset: Asset
  let asset2: PriceFedAsset
  let priceFeed: GovernedPriceFeed

  beforeEach(async function () {
    ;[owner, ...rest] = await ethers.getSigners()
    user = rest[0]

    const coreV3 = await ethers.deployContract('CoreV3')
    token = (await ethers.deployContract('TestERC20', ['frxETH', 'frxETH', 6, parseUnits('10000000', 6)])) as TestERC20
    token2 = (await ethers.deployContract('TestERC20', [
      'sfrxETH',
      'sfrxETH',
      8,
      parseUnits('10000000', 8),
    ])) as TestERC20
    asset = (await ethers.deployContract('DynamicAsset', [token.address, 'frxETH LP', 'frxETH LP'])) as Asset
    asset2 = (await ethers.deployContract('PriceFeedAsset', [
      token2.address,
      'sfrxETH LP',
      'sfrxETH LP',
    ])) as PriceFedAsset
    pool = (await ethers.deployContract('DynamicPoolV3', { libraries: { CoreV3: coreV3.address } })) as PoolV3

    await pool.initialize(parseEther('0.05'), parseEther('0.004'))
    await pool.addAsset(token.address, asset.address)
    await pool.addAsset(token2.address, asset2.address)

    // set dummy pool address
    await asset.setPool(pool.address)
    await asset2.setPool(pool.address)

    priceFeed = (await ethers.deployContract('GovernedPriceFeed', [
      token2.address,
      parseEther('1'),
      parseEther('0.01'),
    ])) as GovernedPriceFeed

    await asset2.setPriceFeed(priceFeed.address)

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

  it('setLatestPrice should work', async function () {
    await expect(priceFeed.getLatestPrice(token.address)).to.be.rejected // invalid token address
    expect(await priceFeed.getLatestPrice(token2.address)).to.eq(parseEther('1')) // verify getLatestPrice
    const { potentialOutcome } = await pool.quotePotentialSwap(token.address, token2.address, parseUnits('10', 6))

    await priceFeed.setLatestPrice(parseEther('1.01'))
    expect(await priceFeed.getLatestPrice(token2.address)).to.eq(parseEther('1.01'))
    const { potentialOutcome: potentialOutcome2 } = await pool.quotePotentialSwap(
      token.address,
      token2.address,
      parseUnits('10', 6)
    )
    expect(potentialOutcome).to.eq(parseUnits('9.95052249', 8))
    expect(potentialOutcome2).to.eq(parseUnits('9.85204976', 8))
  })

  it('setLatestPrice should work (reverse direction)', async function () {
    const { potentialOutcome } = await pool.quotePotentialSwap(token2.address, token.address, parseUnits('10', 8))

    await priceFeed.setLatestPrice(parseEther('0.99'))
    const { potentialOutcome: potentialOutcome2 } = await pool.quotePotentialSwap(
      token2.address,
      token.address,
      parseUnits('10', 8)
    )
    expect(potentialOutcome).to.eq(parseUnits('9.950522', 6))
    expect(potentialOutcome2).to.eq(parseUnits('9.851065', 6))
  })

  it('setLatestPrice: permisioned & should respect maxDeviation', async function () {
    await expect(priceFeed.setLatestPrice(parseEther('0.98'))).to.be.rejectedWith('maxDeviation not respected')
    await expect(priceFeed.setLatestPrice(parseEther('1.02'))).to.be.rejectedWith('maxDeviation not respected')

    // user is not operator
    await expect(priceFeed.connect(user).setLatestPrice(parseEther('1.01'))).to.be.rejected

    // add user as operator
    await priceFeed.addOperator(user.address)
    await priceFeed.connect(user).setLatestPrice(parseEther('1.01'))
  })
})
