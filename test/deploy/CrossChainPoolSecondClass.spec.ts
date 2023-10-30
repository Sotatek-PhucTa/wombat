import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { deployments, ethers } from 'hardhat'
import { getDeployedContract } from '../../utils'

describe('CrossChainPool Second class chain', async function () {
  let user: SignerWithAddress
  let pool: Contract
  let busd: Contract
  let vusdc: Contract
  let busdAsset: Contract

  beforeEach(async function () {
    ;[user] = await ethers.getSigners()

    await deployments.fixture(['MockTokens', 'CrossChainPool', 'CrossChainPoolAssets', 'HighCovRatioFeePoolAssets'])
    ;[busd, vusdc, busdAsset, pool] = await Promise.all([
      getDeployedContract('TestERC20', 'BUSD'),
      getDeployedContract('TestERC20', 'vUSDC'),
      getDeployedContract('Asset', 'Asset_Stablecoin_Pool_BUSD'),
      getDeployedContract('CrossChainPool', 'CrossChainPool_Stablecoin_Pool'),
    ])

    await busd.connect(user).faucet(parseEther('1000'))
    await vusdc.connect(user).faucet(parseEther('1000'))

    await busd.connect(user).approve(pool.address, ethers.constants.MaxUint256)
    await vusdc.connect(user).approve(pool.address, ethers.constants.MaxUint256)
  })

  it('can deposit, withdraw', async function () {
    await pool.connect(user).deposit(busd.address, parseEther('100'), 1, user.address, 1000000000000, false)

    await busdAsset.connect(user).approve(pool.address, ethers.constants.MaxUint256)
    const assetBalance = await busdAsset.balanceOf(user.address)
    await pool.connect(user).withdraw(busd.address, assetBalance, 1, user.address, 1000000000000)
  })

  describe('Swap', function () {
    beforeEach(async function () {
      await pool.connect(user).deposit(busd.address, parseEther('100'), 1, user.address, 1000000000000, false)
      await pool.connect(user).deposit(vusdc.address, parseEther('100'), 1, user.address, 1000000000000, false)
    })

    it('can swap', async function () {
      await pool.connect(user).swap(busd.address, vusdc.address, parseEther('1'), 0, user.address, 1000000000000)
    })

    it('can swap crosschain after adaptor setup', async function () {
      await deployments.fixture(['CrossChainAdaptor', 'CrossChainAdaptorSetup'], { keepExistingDeployments: true })
      await pool
        .connect(user)
        .swapTokensForTokensCrossChain(busd.address, vusdc.address, 0, parseEther('1'), 0, 0, user.address, 0, 0)
    })
  })
})
