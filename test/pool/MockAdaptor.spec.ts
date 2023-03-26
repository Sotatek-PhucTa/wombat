import { AddressZero } from '@ethersproject/constants'
import { parseEther, parseUnits } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai, { expect } from 'chai'

import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import {
  Asset,
  Asset__factory,
  ERC20,
  CrossChainPool,
  CrossChainPool__factory,
  MockAdaptor,
  MockAdaptor__factory,
  TestERC20__factory,
} from '../../build/typechain'

describe('MockAdaptor', function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let AssetFactory: Asset__factory
  let TestERC20Factory: TestERC20__factory
  let PoolFactory: CrossChainPool__factory
  let MockAdaptorFactory: MockAdaptor__factory
  let pool0: CrossChainPool
  let pool1: CrossChainPool
  let mockAdaptor0: MockAdaptor
  let mockAdaptor1: MockAdaptor
  let token0: ERC20 // BUSD
  let token1: ERC20 // USDC
  let token2: ERC20 // CAKE
  let token3: ERC20 // USDT
  let asset0: Asset // BUSD LP
  let asset1: Asset // USDC LP
  let asset2: Asset // CAKE LP
  let asset3: Asset // USDT LP
  let lastBlockTime: number
  let fiveSecondsSince: number

  before(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    user1 = rest[0]

    // get last block time
    const lastBlock = await ethers.provider.getBlock('latest')
    lastBlockTime = lastBlock.timestamp
    fiveSecondsSince = lastBlockTime + 5 * 1000

    // Get Factories
    AssetFactory = (await ethers.getContractFactory('Asset')) as Asset__factory
    TestERC20Factory = (await ethers.getContractFactory('TestERC20')) as TestERC20__factory
    MockAdaptorFactory = (await ethers.getContractFactory('MockAdaptor')) as MockAdaptor__factory
    const CoreV3Factory = await ethers.getContractFactory('CoreV3')
    const coreV3 = await CoreV3Factory.deploy()
    PoolFactory = (await ethers.getContractFactory('CrossChainPool', {
      libraries: { CoreV3: coreV3.address },
    })) as CrossChainPool__factory
  })

  beforeEach(async function () {
    // Deploy with factories
    token0 = await TestERC20Factory.deploy('Binance USD', 'BUSD', 18, parseUnits('1000000', 18)) // 1 mil BUSD
    token1 = await TestERC20Factory.deploy('Venus USDC', 'vUSDC', 6, parseUnits('10000000', 6)) // 10 mil vUSDC
    token2 = await TestERC20Factory.deploy('PancakeSwap Token', 'CAKE', 18, parseUnits('1000000', 18)) // 1 mil CAKE
    token3 = await TestERC20Factory.deploy('USD Tether', 'USDT', 8, parseUnits('1000000', 8)) // 1 mil USDT
    asset0 = await AssetFactory.deploy(token0.address, 'Binance USD LP', 'BUSD-LP')
    asset1 = await AssetFactory.deploy(token1.address, 'Venus USDC LP', 'vUSDC-LP')
    asset2 = await AssetFactory.deploy(token2.address, 'PancakeSwap Token LP', 'CAKE-LP')
    asset3 = await AssetFactory.deploy(token3.address, 'USD Tether Token LP', 'USDT-LP')
    pool0 = await PoolFactory.deploy()
    pool1 = await PoolFactory.deploy()
    mockAdaptor0 = await MockAdaptorFactory.deploy()
    mockAdaptor1 = await MockAdaptorFactory.deploy()

    // set pool address
    await Promise.all([
      asset0.setPool(pool0.address),
      asset1.setPool(pool0.address),
      asset2.setPool(pool1.address),
      asset3.setPool(pool1.address),
    ])

    // initialize pool contract
    await pool0.connect(owner).initialize(parseEther('0.002'), parseEther('0.0004'))
    await pool1.connect(owner).initialize(parseEther('0.002'), parseEther('0.0004'))
    await pool0.setAdaptorAddr(mockAdaptor0.address)
    await pool1.setAdaptorAddr(mockAdaptor1.address)

    await mockAdaptor0.initialize(0, pool0.address)
    await mockAdaptor1.initialize(1, pool1.address)

    // Add BUSD & USDC & USDT assets to pool
    await pool0.connect(owner).addAsset(token0.address, asset0.address)
    await pool0.connect(owner).addAsset(token1.address, asset1.address)
    await pool1.connect(owner).addAsset(token2.address, asset2.address)
    await pool1.connect(owner).addAsset(token3.address, asset3.address)

    await pool0.connect(owner).setCrossChainHaircut(0, parseEther('0.004'))
    await pool1.connect(owner).setCrossChainHaircut(0, parseEther('0.004'))
    await pool0.setMaximumOutboundCredit(parseEther('100000'))
    await pool1.setMaximumOutboundCredit(parseEther('100000'))
    await pool0.setSwapTokensForCreditEnabled(true)
    await pool0.setSwapCreditForTokensEnabled(true)
    await pool1.setSwapTokensForCreditEnabled(true)
    await pool1.setSwapCreditForTokensEnabled(true)

    await mockAdaptor0.approveToken(1, token2.address)
    await mockAdaptor0.approveToken(1, token3.address)
    await mockAdaptor1.approveToken(0, token0.address)
    await mockAdaptor1.approveToken(0, token1.address)
  })

  const relayEventToPool1 = async function (nonce: number) {
    const message = await mockAdaptor0.messages(nonce)
    return await mockAdaptor1.deliver(
      message.id,
      message.sourceChain,
      message.sourceAddress,
      message.targetChain,
      AddressZero,
      message.deliverData
    )
  }

  const relayEventToPool0 = async function (nonce: number) {
    const message = await mockAdaptor1.messages(nonce)
    return await mockAdaptor0.deliver(
      message.id,
      message.sourceChain,
      message.sourceAddress,
      message.targetChain,
      AddressZero,
      message.deliverData
    )
  }

  describe('Asset BUSD (18 decimals) + CAKE (18 decimals)', async function () {
    beforeEach(async function () {
      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000'))
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(pool0.address, ethers.constants.MaxUint256)
      // Transfer 100k of stables to user1
      await token2.connect(owner).transfer(user1.address, parseEther('100000'))
      // Approve max allowance of tokens from users to pool
      await token2.connect(user1).approve(pool1.address, ethers.constants.MaxUint256)

      await pool0.connect(user1).deposit(token0.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)
      await pool1.connect(user1).deposit(token2.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)
    })

    it('cross chain swap (swapTokensForTokensCrossChain + completeSwapCreditForTokens)', async function () {
      // put more cash to prepare the pool state
      await pool1
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token2.address,
          token1.address,
          0,
          parseEther('100'),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0
        )

      // get a quote
      const result = await pool0.quoteSwapTokensForCredit(token0.address, parseEther('100'))
      const quotedToAmount = await pool1.quoteSwapCreditForTokens(token2.address, result.creditAmount)

      // swap 1 (chain 0 -> chain 1)
      const receipt = await pool0
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token0.address,
          token2.address,
          1,
          parseEther('100'),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0
        )

      expect(await pool0.totalCreditMinted()).to.eq(parseEther('99.998023754471257485'))
      await expect(receipt).to.emit(pool0, 'SwapTokensForCredit')

      const balanceBefore = (await token2.balanceOf(user1.address)) as BigNumber
      const receipt2 = await relayEventToPool1(1)
      await expect(relayEventToPool1(1)).to.be.revertedWith('message delivered')
      await expect(receipt2).to.emit(pool1, 'SwapCreditForTokens')

      const balanceAfter = (await token2.balanceOf(user1.address)) as BigNumber
      expect(balanceAfter.sub(balanceBefore)).eq(parseEther('99.6'))
      expect(balanceAfter.sub(balanceBefore)).eq(quotedToAmount)
      // verify the quote

      // swap 2 (chain 1 -> chain 0)
      const receipt3 = await pool1
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token2.address,
          token0.address,
          0,
          parseEther('100'),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0
        )

      expect(await pool1.totalCreditMinted()).to.eq(parseEther('199.996047508942514970'))
      await expect(receipt3).to.emit(pool1, 'SwapTokensForCredit')

      const balanceBefore2 = (await token0.balanceOf(user1.address)) as BigNumber
      const receipt4 = await relayEventToPool0(2)
      await expect(receipt4).to.emit(pool0, 'SwapCreditForTokens')

      const balanceAfter2 = (await token0.balanceOf(user1.address)) as BigNumber
      expect(balanceAfter2.sub(balanceBefore2)).eq(parseEther('99.6'))
    })

    it('cross chain swap fallback (swapTokensForTokensCrossChain + mintCredit)', async function () {
      // put more cash to prepare the pool state
      await pool1
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token2.address,
          token1.address,
          0,
          parseEther('100'),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0
        )

      // swap 1 (chain 0 -> chain 1)
      const receipt = await pool0
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token0.address,
          token2.address,
          1,
          parseEther('100'),
          parseEther('99'),
          parseEther('99.7'),
          user1.address,
          0
        )

      expect(await pool0.totalCreditMinted()).to.eq(parseEther('99.998023754471257485'))
      await expect(receipt).to.emit(pool0, 'SwapTokensForCredit')

      const creditBefore = (await pool1.creditBalance(user1.address)) as BigNumber
      const receipt2 = await relayEventToPool1(1)
      await expect(relayEventToPool1(1)).to.be.revertedWith('message delivered')
      await expect(receipt2).to.emit(pool1, 'MintCredit')
      await expect(receipt2).to.emit(mockAdaptor1, 'LogError')

      const creditAfter = (await pool1.creditBalance(user1.address)) as BigNumber
      expect(creditAfter.sub(creditBefore)).eq(parseEther('99.998023754471257485'))
    })

    it('swapCreditForTokensCrossChain', async function () {
      await mockAdaptor0.connect(user1).faucetCredit(parseEther('99.998023754471257485'))

      // put more cash to prepare the pool state
      await pool1
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token2.address,
          token1.address,
          0,
          parseEther('100'),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0
        )

      // swap 1 (chain 0 -> chain 1)
      const receipt = await pool0
        .connect(user1)
        .swapCreditForTokensCrossChain(
          token2.address,
          1,
          parseEther('99.998023754471257485'),
          parseEther('99'),
          user1.address,
          0
        )

      const balanceBefore = (await token2.balanceOf(user1.address)) as BigNumber
      const receipt2 = await relayEventToPool1(1)
      await expect(relayEventToPool1(1)).to.be.revertedWith('message delivered')
      await expect(receipt2).to.emit(pool1, 'SwapCreditForTokens')

      const balanceAfter = (await token2.balanceOf(user1.address)) as BigNumber
      expect(balanceAfter.sub(balanceBefore)).eq(parseEther('99.6'))
    })
  })

  describe('Asset vUSDC (8 decimals) + USDT (6 decimals)', async function () {
    beforeEach(async function () {
      // Transfer 100k of stables to user1
      await token1.connect(owner).transfer(user1.address, parseUnits('100000', 6))
      // Approve max allowance of tokens from users to pool
      await token1.connect(user1).approve(pool0.address, ethers.constants.MaxUint256)
      // Transfer 100k of stables to user1
      await token3.connect(owner).transfer(user1.address, parseUnits('100000', 8))
      // Approve max allowance of tokens from users to pool
      await token3.connect(user1).approve(pool1.address, ethers.constants.MaxUint256)

      await pool0
        .connect(user1)
        .deposit(token1.address, parseUnits('10000', 6), 0, user1.address, fiveSecondsSince, false)

      await pool1
        .connect(user1)
        .deposit(token3.address, parseUnits('10000', 8), 0, user1.address, fiveSecondsSince, false)
    })

    it('cross chain swap (swapTokensForTokensCrossChain + completeSwapCreditForTokens)', async function () {
      // put more cash to prepare the pool state
      await pool1
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token3.address,
          token1.address,
          0,
          parseUnits('100', 8),
          0,
          parseUnits('99', 6),
          user1.address,
          0
        )

      // get a quote
      const result = await pool0.quoteSwapTokensForCredit(token1.address, parseUnits('100', 6))
      const quotedToAmount = await pool1.quoteSwapCreditForTokens(token3.address, result.creditAmount)

      // swap 1 (chain 0 -> chain 1)
      const receipt = await pool0
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token1.address,
          token3.address,
          1,
          parseUnits('100', 6),
          0,
          parseUnits('99', 8),
          user1.address,
          0
        )

      expect(await pool0.totalCreditMinted()).to.eq(parseEther('99.998023754471257485'))
      await expect(receipt).to.emit(pool0, 'SwapTokensForCredit')

      const balanceBefore = (await token3.balanceOf(user1.address)) as BigNumber
      const receipt2 = await relayEventToPool1(1)
      await expect(relayEventToPool1(1)).to.be.revertedWith('message delivered')
      await expect(receipt2).to.emit(pool1, 'SwapCreditForTokens')

      const balanceAfter = (await token3.balanceOf(user1.address)) as BigNumber
      expect(balanceAfter.sub(balanceBefore)).eq(parseUnits('99.6', 8))
      expect(balanceAfter.sub(balanceBefore)).eq(quotedToAmount)
      // verify the quote

      // swap 2 (chain 1 -> chain 0)
      const receipt3 = await pool1
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token3.address,
          token1.address,
          0,
          parseUnits('100', 8),
          parseEther('99'),
          parseUnits('99', 6),
          user1.address,
          0
        )

      expect(await pool1.totalCreditMinted()).to.eq(parseEther('199.996047508942514970'))
      await expect(receipt3).to.emit(pool1, 'SwapTokensForCredit')

      const balanceBefore2 = (await token1.balanceOf(user1.address)) as BigNumber
      const receipt4 = await relayEventToPool0(2)
      await expect(receipt4).to.emit(pool0, 'SwapCreditForTokens')

      const balanceAfter2 = (await token1.balanceOf(user1.address)) as BigNumber
      expect(balanceAfter2.sub(balanceBefore2)).eq(parseUnits('99.6', 6))
    })

    it('cross chain swap fallback (swapTokensForTokensCrossChain + mintCredit)', async function () {
      // put more cash to prepare the pool state
      await pool1
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token3.address,
          token1.address,
          0,
          parseUnits('100', 8),
          parseEther('99'),
          parseUnits('99', 6),
          user1.address,
          0
        )

      // swap 1 (chain 0 -> chain 1)
      const receipt = await pool0
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token1.address,
          token3.address,
          1,
          parseUnits('100', 6),
          parseEther('99'),
          parseUnits('99.7', 8),
          user1.address,
          0
        )

      expect(await pool0.totalCreditMinted()).to.eq(parseEther('99.998023754471257485'))
      await expect(receipt).to.emit(pool0, 'SwapTokensForCredit')

      const creditBefore = (await pool1.creditBalance(user1.address)) as BigNumber
      const receipt2 = await relayEventToPool1(1)
      await expect(relayEventToPool1(1)).to.be.revertedWith('message delivered')
      await expect(receipt2).to.emit(pool1, 'MintCredit')
      await expect(receipt2).to.emit(mockAdaptor1, 'LogError')

      const creditAfter = (await pool1.creditBalance(user1.address)) as BigNumber
      expect(creditAfter.sub(creditBefore)).eq(parseEther('99.998023754471257485'))
    })

    it('swapCreditForTokensCrossChain', async function () {
      await mockAdaptor0.connect(user1).faucetCredit(parseEther('99.998023754471257485'))

      // put more cash to prepare the pool state
      await pool1
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token3.address,
          token1.address,
          0,
          parseUnits('100', 8),
          parseEther('99'),
          parseUnits('99', 6),
          user1.address,
          0
        )

      // swap 1 (chain 0 -> chain 1)
      const receipt = await pool0
        .connect(user1)
        .swapCreditForTokensCrossChain(
          token3.address,
          1,
          parseEther('99.998023754471257485'),
          parseUnits('99', 8),
          user1.address,
          0
        )

      const balanceBefore = (await token3.balanceOf(user1.address)) as BigNumber
      const receipt2 = await relayEventToPool1(1)
      await expect(relayEventToPool1(1)).to.be.revertedWith('message delivered')
      await expect(receipt2).to.emit(pool1, 'SwapCreditForTokens')

      const balanceAfter = (await token3.balanceOf(user1.address)) as BigNumber
      expect(balanceAfter.sub(balanceBefore)).eq(parseUnits('99.6', 8))
    })
  })
})
