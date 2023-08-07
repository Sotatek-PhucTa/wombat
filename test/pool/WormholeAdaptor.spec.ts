import { parseEther, parseUnits } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'

import { ethers } from 'hardhat'
import {
  Asset,
  CoreV3,
  CrossChainPool,
  ERC20,
  MockRelayer,
  MockWormhole,
  TestERC20,
  WormholeAdaptor,
} from '../../build/typechain'

const MOCK_CHAIN_ID = 2

function toWormholeAddr(ethAddr: string): string {
  return '0x000000000000000000000000' + ethAddr.substring(2)
}

describe('WormholeAdaptor', function () {
  let owner: SignerWithAddress
  let user0: SignerWithAddress
  let pool0: CrossChainPool
  let relayer0: MockRelayer
  let mockWormhole0: MockWormhole
  let adaptor0: WormholeAdaptor
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
    user0 = rest[0]

    // get last block time
    const lastBlock = await ethers.provider.getBlock('latest')
    lastBlockTime = lastBlock.timestamp
    fiveSecondsSince = lastBlockTime + 5 * 1000
  })

  beforeEach(async function () {
    // Deploy with factories

    token0 = (await ethers.deployContract('TestERC20', [
      'Binance USD',
      'BUSD',
      18,
      parseUnits('1000000', 18),
    ])) as TestERC20 // 1 mil BUSD
    token1 = (await ethers.deployContract('TestERC20', [
      'Venus USDC',
      'vUSDC',
      6,
      parseUnits('10000000', 6),
    ])) as TestERC20 // 10 mil vUSDC

    token2 = (await ethers.deployContract('TestERC20', [
      'PancakeSwap Token',
      'CAKE',
      18,
      parseUnits('1000000', 18),
    ])) as TestERC20 // 1 mil CAKE
    token3 = (await ethers.deployContract('TestERC20', [
      'USD Tether',
      'USDT',
      8,
      parseUnits('1000000', 8),
    ])) as TestERC20 // 1 mil USDT
    asset0 = (await ethers.deployContract('Asset', [token0.address, 'Binance USD LP', 'BUSD-LP'])) as Asset
    asset1 = (await ethers.deployContract('Asset', [token1.address, 'Venus USDC LP', 'vUSDC-LP'])) as Asset
    asset2 = (await ethers.deployContract('Asset', [token2.address, 'PancakeSwap Token LP', 'CAKE-LP'])) as Asset
    asset3 = (await ethers.deployContract('Asset', [token3.address, 'USD Tether Token LP', 'USDT-LP'])) as Asset
    const coreV3 = (await ethers.deployContract('CoreV3')) as CoreV3
    pool0 = (await ethers.deployContract('CrossChainPool', [], {
      libraries: {
        CoreV3: coreV3.address,
      },
    })) as CrossChainPool
    adaptor0 = (await ethers.deployContract('WormholeAdaptor', [])) as WormholeAdaptor
    relayer0 = (await ethers.deployContract('MockRelayer')) as MockRelayer
    mockWormhole0 = (await ethers.deployContract('MockWormhole')) as MockWormhole

    // set pool address
    await Promise.all([asset0.setPool(pool0.address), asset1.setPool(pool0.address)])

    // initialize pool contract
    await pool0.connect(owner).initialize(parseEther('0.002'), parseEther('0.0004'))
    await pool0.setAdaptorAddr(adaptor0.address)

    await adaptor0.initialize(relayer0.address, mockWormhole0.address, pool0.address)
    await adaptor0.setAdaptorAddress(MOCK_CHAIN_ID, adaptor0.address)

    // Add BUSD & USDC & USDT assets to pool
    await pool0.connect(owner).addAsset(token0.address, asset0.address)
    await pool0.connect(owner).addAsset(token1.address, asset1.address)

    await pool0.connect(owner).setCrossChainHaircut(0, parseEther('0.004'))
    await pool0.setMaximumOutboundCredit(parseEther('100000'))
    await pool0.setSwapTokensForCreditEnabled(true)
    await pool0.setSwapCreditForTokensEnabled(true)

    await adaptor0.approveToken(1, token2.address)
    await adaptor0.approveToken(1, token3.address)
  })

  it('receiveWormholeMessages ignore the last message (since it should be verified by the relayer)', async function () {
    const payload = await mockWormhole0.generatePayload(
      token0.address,
      parseEther('100'),
      parseEther('99'),
      user0.address
    )

    expect(
      await relayer0.deliver(
        adaptor0.address,
        payload,
        '0x000000000000000000000000' + adaptor0.address.substring(2),
        MOCK_CHAIN_ID,
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      )
    ).to.be.ok
  })

  it('receiveWormholeMessages verifies `vm.emitterAddress`', async function () {
    const payload = await mockWormhole0.generatePayload(
      token0.address,
      parseEther('100'),
      parseEther('99'),
      user0.address
    )

    await expect(
      relayer0.deliver(
        adaptor0.address,
        payload,
        toWormholeAddr(owner.address),
        MOCK_CHAIN_ID,
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      )
    ).to.emit(adaptor0, 'UnknownEmitter')

    await expect(
      relayer0.deliver(
        adaptor0.address,
        payload,
        toWormholeAddr(adaptor0.address),
        MOCK_CHAIN_ID,
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      )
    ).to.not.emit(adaptor0, 'UnknownEmitter')
  })

  it('cannot replay VAAs', async function () {
    const payload = await mockWormhole0.generatePayload(
      token0.address,
      parseEther('100'),
      parseEther('99'),
      user0.address
    )

    await relayer0.deliver(
      adaptor0.address,
      payload,
      toWormholeAddr(adaptor0.address),
      MOCK_CHAIN_ID,
      '0x0000000000000000000000000000000000000000000000000000000000000001'
    )
    await expect(
      relayer0.deliver(
        adaptor0.address,
        payload,
        toWormholeAddr(adaptor0.address),
        MOCK_CHAIN_ID,
        '0x0000000000000000000000000000000000000000000000000000000000000001'
      )
    ).to.be.revertedWithCustomError(adaptor0, 'ADAPTOR__MESSAGE_ALREADY_DELIVERED')
  })

  it('estimateDeliveryFee', async function () {
    // TODO: implement
  })

  it('estimateRedeliveryFee', async function () {
    // TODO: implement
  })
})
