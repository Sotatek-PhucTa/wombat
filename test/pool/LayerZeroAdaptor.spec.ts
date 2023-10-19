import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Asset, CoreV3, CrossChainPool, LZEndpointMock, LayerZeroAdaptor } from '../../build/typechain'
import { deployments, ethers } from 'hardhat'
import { formatUnits, parseEther } from 'ethers/lib/utils'
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
  let busd: Contract // BUSD
  let vusdc: Contract // USDC
  let busdAsset: Asset // BUSD LP
  let vusdcAsset: Asset // USDC LP

  before(async function () {
    ;[owner, user0] = await ethers.getSigners()
  })

  beforeEach(
    restoreOrCreateSnapshot(async function () {
      await deployments.fixture(['MockTokens'])
      ;[busd, vusdc] = await Promise.all([
        getDeployedContract('TestERC20', 'BUSD'),
        getDeployedContract('TestERC20', 'vUSDC'),
      ])

      busdAsset = (await ethers.deployContract('Asset', [busd.address, 'Binance USD LP', 'BUSD-LP'])) as Asset
      vusdcAsset = (await ethers.deployContract('Asset', [vusdc.address, 'Venus USDC LP', 'vUSDC-LP'])) as Asset

      const coreV3 = (await ethers.deployContract('CoreV3')) as CoreV3
      pool = (await ethers.deployContract('CrossChainPool', [], {
        libraries: {
          CoreV3: coreV3.address,
        },
      })) as CrossChainPool

      adaptor = (await ethers.deployContract('LayerZeroAdaptor', [])) as LayerZeroAdaptor
      lzEndpoint = (await ethers.deployContract('LZEndpointMock', [1])) as LZEndpointMock

      // set pool address
      await Promise.all([busdAsset.setPool(pool.address), vusdcAsset.setPool(pool.address)])

      // initialize pool contract
      await pool.connect(owner).initialize(parseEther('0.002'), parseEther('0.0004'))
      await pool.setAdaptorAddr(adaptor.address)

      await adaptor.initialize(lzEndpoint.address, pool.address)

      // Add trusted adaptor
      await adaptor.setTrustedRemoteAddress(1, adaptor.address)

      // Config Endpoint Lookup
      await lzEndpoint.setDestLzEndpoint(adaptor.address, lzEndpoint.address)

      // Add BUSD & USDC & USDT assets to pool
      await pool.connect(owner).addAsset(busd.address, busdAsset.address)
      await pool.connect(owner).addAsset(vusdc.address, vusdcAsset.address)

      await pool.connect(owner).setCrossChainHaircut(0, parseEther('0.004'))
      await pool.setMaximumOutboundCredit(parseEther('100000'))
      await pool.setMaximumInboundCredit(parseEther('100000'))
      await pool.setSwapTokensForCreditEnabled(true)
      await pool.setSwapCreditForTokensEnabled(true)

      await adaptor.approveToken(1, busd.address)
      await adaptor.approveToken(1, vusdc.address)

      // faucet token
      await busd.connect(user0).faucet(parseEther('10000'))
      await vusdc.connect(user0).faucet(parseEther('10000'))
    })
  )

  it('can swap crosschain', async function () {
    await busd.connect(user0).approve(pool.address, ethers.constants.MaxUint256)
    await vusdc.connect(user0).approve(pool.address, ethers.constants.MaxUint256)

    await pool.connect(user0).deposit(busd.address, parseEther('100'), 1, user0.address, 1000000000000, false)
    await pool.connect(user0).deposit(vusdc.address, parseEther('100'), 1, user0.address, 1000000000000, false)

    const busdBalanceBefore = await busd.balanceOf(user0.address)
    const vusdcBalanceBefore = await vusdc.balanceOf(user0.address)

    await pool
      .connect(user0)
      .swapTokensForTokensCrossChain(busd.address, vusdc.address, 1, parseEther('1'), 0, 0, user0.address, 0, 200000, {
        value: parseEther('0.02'),
      })

    const busdBalanceAfter = await busd.balanceOf(user0.address)
    const vusdcBalanceAfter = await vusdc.balanceOf(user0.address)

    expect(busdBalanceBefore.sub(busdBalanceAfter)).eq(parseEther('1'))
    expect(Number(formatUnits(vusdcBalanceAfter.sub(vusdcBalanceBefore), 8))).closeTo(1, 0.1)
  })
})
