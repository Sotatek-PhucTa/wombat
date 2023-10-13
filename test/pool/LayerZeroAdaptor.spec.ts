import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Asset, CoreV3, CrossChainPool, LZEndpointMock, LayerZeroAdaptor, TestERC20 } from '../../build/typechain'
import { ethers } from 'hardhat'
import { parseEther, parseUnits } from 'ethers/lib/utils'

describe('LayerZeroAdaptor', function () {
  let owner: SignerWithAddress
  let user0: SignerWithAddress
  let pool_c1: CrossChainPool
  let pool_c2: CrossChainPool
  let lzEndpoint_c1: LZEndpointMock
  let lzEndpoint_c2: LZEndpointMock
  let adaptor_c1: LayerZeroAdaptor
  let adaptor_c2: LayerZeroAdaptor
  let token0_c1: TestERC20 // BUSD
  let token1_c1: TestERC20 // USDC
  let token0_c2: TestERC20 // CAKE
  let token1_c2: TestERC20 // USDT
  let asset0_c1: Asset // BUSD LP
  let asset1_c1: Asset // USDC LP
  let asset0_c2: Asset // CAKE LP
  let asset1_c2: Asset // USDT LP

  before(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    user0 = rest[0]
  })

  this.beforeEach(async function () {
    token0_c1 = (await ethers.deployContract('TestERC20', [
      'Binance USD',
      'BUSD',
      18,
      parseUnits('1000000', 18),
    ])) as TestERC20 // 1 mil BUSD
    token1_c1 = (await ethers.deployContract('TestERC20', [
      'Venus USDC',
      'vUSDC',
      6,
      parseUnits('10000000', 6),
    ])) as TestERC20 // 10 mil vUSDC

    token0_c2 = (await ethers.deployContract('TestERC20', [
      'PancakeSwap Token',
      'CAKE',
      18,
      parseUnits('1000000', 18),
    ])) as TestERC20 // 1 mil CAKE
    token1_c2 = (await ethers.deployContract('TestERC20', [
      'USD Tether',
      'USDT',
      8,
      parseUnits('1000000', 8),
    ])) as TestERC20 // 1 mil USDT
    asset0_c1 = (await ethers.deployContract('Asset', [token0_c1.address, 'Binance USD LP', 'BUSD-LP'])) as Asset
    asset1_c1 = (await ethers.deployContract('Asset', [token1_c1.address, 'Venus USDC LP', 'vUSDC-LP'])) as Asset
    asset0_c2 = (await ethers.deployContract('Asset', [token0_c2.address, 'PancakeSwap Token LP', 'CAKE-LP'])) as Asset
    asset1_c2 = (await ethers.deployContract('Asset', [token1_c2.address, 'USD Tether Token LP', 'USDT-LP'])) as Asset

    const coreV3 = (await ethers.deployContract('CoreV3')) as CoreV3
    pool_c1 = (await ethers.deployContract('CrossChainPool', [], {
      libraries: {
        CoreV3: coreV3.address,
      },
    })) as CrossChainPool
    pool_c2 = (await ethers.deployContract('CrossChainPool', [], {
      libraries: {
        CoreV3: coreV3.address,
      },
    })) as CrossChainPool

    adaptor_c1 = (await ethers.deployContract('LayerZeroAdaptor', [])) as LayerZeroAdaptor
    adaptor_c2 = (await ethers.deployContract('LayerZeroAdaptor', [])) as LayerZeroAdaptor
    lzEndpoint_c1 = (await ethers.deployContract('LZEndpointMock', [1])) as LZEndpointMock
    lzEndpoint_c2 = (await ethers.deployContract('LZEndpointMock', [2])) as LZEndpointMock

    // set pool address
    await Promise.all([asset0_c1.setPool(pool_c1.address), asset1_c1.setPool(pool_c1.address)])
    await Promise.all([asset0_c2.setPool(pool_c2.address), asset1_c2.setPool(pool_c2.address)])

    // initialize pool contract
    await pool_c1.connect(owner).initialize(parseEther('0.002'), parseEther('0.0004'))
    await pool_c1.setAdaptorAddr(adaptor_c1.address)
    await pool_c2.connect(owner).initialize(parseEther('0.002'), parseEther('0.0004'))
    await pool_c2.setAdaptorAddr(adaptor_c2.address)

    await adaptor_c1.initialize(lzEndpoint_c1.address, pool_c1.address)
    await adaptor_c2.initialize(lzEndpoint_c2.address, pool_c1.address)

    // Add trusted adaptor
    await adaptor_c1.setTrustedRemoteAddress(2, adaptor_c2.address)
    await adaptor_c2.setTrustedRemoteAddress(1, adaptor_c1.address)

    // Config Endpoint Lookup
    await lzEndpoint_c1.setDestLzEndpoint(adaptor_c2.address, lzEndpoint_c2.address)
    await lzEndpoint_c2.setDestLzEndpoint(adaptor_c1.address, lzEndpoint_c1.address)

    // Add BUSD & USDC & USDT assets to pool
    await pool_c1.connect(owner).addAsset(token0_c1.address, asset0_c1.address)
    await pool_c1.connect(owner).addAsset(token1_c1.address, asset1_c1.address)
    await pool_c2.connect(owner).addAsset(token0_c2.address, asset0_c2.address)
    await pool_c2.connect(owner).addAsset(token1_c2.address, asset1_c2.address)

    await pool_c1.connect(owner).setCrossChainHaircut(0, parseEther('0.004'))
    await pool_c1.setMaximumOutboundCredit(parseEther('100000'))
    await pool_c1.setSwapTokensForCreditEnabled(true)
    await pool_c1.setSwapCreditForTokensEnabled(true)
    await pool_c2.connect(owner).setCrossChainHaircut(0, parseEther('0.004'))
    await pool_c2.setMaximumOutboundCredit(parseEther('100000'))
    await pool_c2.setSwapTokensForCreditEnabled(true)
    await pool_c2.setSwapCreditForTokensEnabled(true)

    await adaptor_c1.approveToken(2, token0_c2.address)
    await adaptor_c1.approveToken(2, token1_c2.address)
    await adaptor_c2.approveToken(1, token0_c1.address)
    await adaptor_c2.approveToken(1, token1_c1.address)

    // faucet token
    await token0_c1.connect(user0).faucet(parseEther('10000'))
    await token0_c2.connect(user0).faucet(parseEther('10000'))
  })

  it('can swap crosschain', async function () {
    await token0_c1.connect(user0).approve(pool_c1.address, ethers.constants.MaxUint256)
    await token0_c2.connect(user0).approve(pool_c2.address, ethers.constants.MaxUint256)

    await pool_c1.connect(user0).deposit(token0_c1.address, parseEther('100'), 1, user0.address, 1000000000000, false)
    await pool_c2.connect(user0).deposit(token0_c2.address, parseEther('100'), 1, user0.address, 1000000000000, false)

    await pool_c1
      .connect(user0)
      .swapTokensForTokensCrossChain(
        token0_c1.address,
        token0_c2.address,
        2,
        parseEther('1'),
        0,
        0,
        user0.address,
        0,
        200000,
        { value: parseEther('0.02') }
      )
  })
})
