import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { BigNumber, BigNumberish, Contract } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { deployments, ethers } from 'hardhat'
import { getTestERC20 } from '../../../utils'
import { deployTestAsset } from '../../../utils/deploy'

describe('FakeMegaPool', function () {
  let owner: SignerWithAddress
  let usdc: Contract
  let usdt: Contract
  let usdcAsset: Contract
  let usdtAsset: Contract
  let pool: Contract

  beforeEach(async function () {
    await deployments.fixture(['MockTokens'])
    ;[usdc, usdt, usdcAsset, usdtAsset, pool] = await Promise.all([
      getTestERC20('USDC'),
      getTestERC20('USDT'),
      deployTestAsset('USDC'),
      deployTestAsset('USDT'),
      deployFakeMegaPool(),
    ])
    ;[owner] = await ethers.getSigners()

    await pool.addAsset(usdc.address, usdcAsset.address)
    await pool.addAsset(usdt.address, usdtAsset.address)
    await usdcAsset.setPool(pool.address)
    await usdtAsset.setPool(pool.address)
  })

  describe('swap', function () {
    beforeEach(async function () {
      await usdc.faucet(parseEther('10000'))
      await usdt.faucet(parseEther('10000'))
      await deposit(owner, 10000, usdc)
      await deposit(owner, 10000, usdt)
    })

    it('swap is the same as before', async function () {
      const [quoteAmount, quoteHaircut] = await quote(usdc, usdt, 777)
      const [actualToAmount, actualHaircut] = await swap(owner, usdc, usdt, 777)
      expect(quoteHaircut).to.eq(0)
      expect(actualHaircut).to.eq(0)
      expect(actualHaircut).to.eq(quoteHaircut)

      expect(quoteAmount).to.eq(777)
      expect(actualToAmount).to.eq(777 - 1)
    })

    it('satisfies invariant', async function () {
      await assertInvariant(owner, usdc, usdt, 777)
    })
  })

  describe('invariant', function () {
    describe('balanced pool (5000 USDC, 5000 USDT)', function () {
      beforeEach(async function () {
        await usdc.faucet(parseEther('10000'))
        await usdt.faucet(parseEther('10000'))
        // leave 50% to swap
        await deposit(owner, parseEther('5000'), usdc)
        await deposit(owner, parseEther('5000'), usdt)
      })

      it.skip('satisfies invariant', async function () {
        // Expected "99999920159742" to be equal 0
        // toAmount: Expected "999899201677255258" to be greater than 999999201597410000
        await assertInvariant(owner, usdc, usdt, parseEther('1'))
      })
    })
  })

  // assert that quote = swap (FakeMegaPool's token->credit->token).
  async function assertInvariant(
    user: SignerWithAddress,
    fromToken: Contract,
    toToken: Contract,
    fromAmount: BigNumberish
  ) {
    const [quoteAmount, quoteHaircut] = await quote(fromToken, toToken, fromAmount)
    const [actualToAmount, actualHaircut] = await swap(user, fromToken, toToken, fromAmount)
    // allow for some precision error.
    expect(quoteAmount, 'toAmount').to.gt(actualToAmount).lte(actualToAmount.add(1))
    expect(quoteHaircut, 'haircut').to.eq(actualHaircut)
  }

  async function deposit(user: SignerWithAddress, amount: BigNumberish, token: Contract) {
    await token.approve(pool.address, ethers.constants.MaxUint256)
    return pool.connect(user).deposit(token.address, amount, 0, user.address, ethers.constants.MaxUint256, false)
  }

  async function swap(
    user: SignerWithAddress,
    fromToken: Contract,
    toToken: Contract,
    fromAmount: BigNumberish
  ): Promise<[BigNumber, BigNumber]> {
    const [actualToAmount, haircut] = await pool
      .connect(user)
      .callStatic.swap(fromToken.address, toToken.address, fromAmount, 0, user.address, ethers.constants.MaxInt256)
    await pool
      .connect(user)
      .swap(fromToken.address, toToken.address, fromAmount, 0, user.address, ethers.constants.MaxInt256)
    return [actualToAmount, haircut]
  }

  async function quote(
    fromToken: Contract,
    toToken: Contract,
    fromAmount: BigNumberish
  ): Promise<[BigNumber, BigNumber]> {
    return pool.quotePotentialSwap(fromToken.address, toToken.address, fromAmount)
  }

  async function deployFakeMegaPool() {
    const MaxUint128: BigNumber = BigNumber.from('0xffffffffffffffffffffffffffffffff')
    const coreV3 = await ethers.deployContract('CoreV3')
    const pool = await ethers.deployContract('FakeMegaPool', {
      libraries: { CoreV3: coreV3.address },
    })
    await pool.initialize(parseEther('0.002'), parseEther('0.0001'))
    await pool.setSwapTokensForCreditEnabled(true)
    await pool.setSwapCreditForTokensEnabled(true)
    await pool.setMaximumNetMintedCredit(MaxUint128)
    return pool
  }
})
