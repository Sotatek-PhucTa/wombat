import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Asset, CoreV3, CrossChainPool, LZEndpointMock, LayerZeroAdaptor, TestERC20 } from '../../build/typechain'
import { deployments, ethers } from 'hardhat'
import { formatUnits, parseEther, parseUnits } from 'ethers/lib/utils'
import { expect } from 'chai'
import { restoreOrCreateSnapshot } from '../fixtures/executions'
import { getDeployedContract } from '../../utils'
import { Contract } from 'ethers'

describe('LayerZeroAdaptor', function () {
  let owner: SignerWithAddress
  let user0: SignerWithAddress
  let pool: CrossChainPool
  let lzEndpoint: LZEndpointMock
  let adaptor: LayerZeroAdaptor
  let token0: Contract // BUSD
  let token1: Contract // USDC
  let asset0: Asset // BUSD LP
  let asset1: Asset // USDC LP

  before(async function () {
    [owner, user0] = await ethers.getSigners()
  })

  beforeEach(restoreOrCreateSnapshot((async function() {
    await deployments.fixture(['MockTokens']);
    [token0, token1] = await Promise.all([
      getDeployedContract('TestERC20', 'BUSD'),
      getDeployedContract('TestERC20', 'vUSDC'),
    ])

    asset0 = (await ethers.deployContract('Asset', [token0.address, 'Binance USD LP', 'BUSD-LP'])) as Asset
    asset1 = (await ethers.deployContract('Asset', [token1.address, 'Venus USDC LP', 'vUSDC-LP'])) as Asset

    const coreV3 = (await ethers.deployContract('CoreV3')) as CoreV3
    pool = (await ethers.deployContract('CrossChainPool', [], {
      libraries: {
        CoreV3: coreV3.address,
      },
    })) as CrossChainPool

    adaptor = (await ethers.deployContract('LayerZeroAdaptor', [])) as LayerZeroAdaptor
    lzEndpoint = (await ethers.deployContract('LZEndpointMock', [1])) as LZEndpointMock

    // set pool address
    await Promise.all([asset0.setPool(pool.address), asset1.setPool(pool.address)])

    // initialize pool contract
    await pool.connect(owner).initialize(parseEther('0.002'), parseEther('0.0004'))
    await pool.setAdaptorAddr(adaptor.address)

    await adaptor.initialize(lzEndpoint.address, pool.address)

    // Add trusted adaptor
    await adaptor.setTrustedRemoteAddress(1, adaptor.address)

    // Config Endpoint Lookup
    await lzEndpoint.setDestLzEndpoint(adaptor.address, lzEndpoint.address)

    // Add BUSD & USDC & USDT assets to pool
    await pool.connect(owner).addAsset(token0.address, asset0.address)
    await pool.connect(owner).addAsset(token1.address, asset1.address)

    await pool.connect(owner).setCrossChainHaircut(0, parseEther('0.004'))
    await pool.setMaximumOutboundCredit(parseEther('100000'))
    await pool.setMaximumInboundCredit(parseEther('100000'))
    await pool.setSwapTokensForCreditEnabled(true)
    await pool.setSwapCreditForTokensEnabled(true)

    await adaptor.approveToken(1, token0.address)
    await adaptor.approveToken(1, token1.address)

    // faucet token
    await token0.connect(user0).faucet(parseEther('10000'))
    await token1.connect(user0).faucet(parseEther('10000'))
  })))

  it('can swap crosschain', async function () {
    await token0.connect(user0).approve(pool.address, ethers.constants.MaxUint256)
    await token1.connect(user0).approve(pool.address, ethers.constants.MaxUint256)

    await pool.connect(user0).deposit(token0.address, parseEther('100'), 1, user0.address, 1000000000000, false)
    await pool.connect(user0).deposit(token1.address, parseEther('100'), 1, user0.address, 1000000000000, false)

    const token0_balanceBefore = await token0.balanceOf(user0.address)
    const token1_balanceBefore = await token1.balanceOf(user0.address)

    await pool
      .connect(user0)
      .swapTokensForTokensCrossChain(
        token0.address,
        token1.address,
        1,
        parseEther('1'),
        0,
        0,
        user0.address,
        0,
        200000,
        { value: parseEther('0.02') }
      )

    const token0_balanceAfter = await token0.balanceOf(user0.address)
    const token1_balanceAfter = await token1.balanceOf(user0.address)

    expect(token0_balanceBefore.sub(token0_balanceAfter)).eq(parseEther('1'))
    expect(Number(formatUnits(token1_balanceAfter.sub(token1_balanceBefore), 8))).closeTo(1, 0.1)
  })
})
