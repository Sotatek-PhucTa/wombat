import { getPoolDeploymentName, getWormholeAdaptorDeploymentName } from '../../utils/deploy'
import { contractNamePrefix } from '../../deploy/060_CrossChainPool'
import { expect } from 'chai'
import { getAddress, getDeployedContract } from '../../utils'
import { Contract } from 'ethers'
import { CrossChainPool, WormholeAdaptor } from '../../build/typechain'
import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { Token, getTokenDeploymentOrAddress } from '../../config/token'
import { parseEther } from 'ethers/lib/utils'

describe('CrossChainPool deployment', function () {
  const poolName = 'Stablecoin_Pool'

  beforeEach(async function () {
    await deployments.fixture([
      'CoreV3',
      'MockTokens',
      'CrossChainPool',
      'CrossChainPoolAssets',
      'MockTokens',
      'WormholeAdaptor',
      'WormholeAdaptorSetup',
    ])
  })

  describe('Verify pool config', function () {
    let pool: CrossChainPool
    const contractName = getPoolDeploymentName(contractNamePrefix, poolName)
    beforeEach(async function () {
      pool = (await getDeployedContract(contractNamePrefix, contractName)) as CrossChainPool
    })

    it(`verify config for ${contractName}`, async function () {
      const { multisig } = await getNamedAccounts()
      expect(await pool.ampFactor()).to.eq(parseEther('0.00025'), 'amp factor not equal')
      expect(await pool.haircutRate()).to.eq(parseEther('0.00002'), 'haircut not equal')
      expect(await pool.lpDividendRatio()).to.eq(parseEther('0.5'), 'lp dividend ratio not equal')
      expect(await pool.retentionRatio()).to.eq(parseEther('0.5'), 'retention ratio not equal')
      expect(await pool.mintFeeThreshold()).to.eq(parseEther('10'), 'mint fee threshold not equal')
      expect(await pool.tokensForCreditHaircut()).to.eq(parseEther('0.0003'), 'tokens for credit haircut not equal')
      expect(await pool.creditForTokensHaircut()).to.eq(parseEther('0.0003'), 'credit for tokens haircut not equal')
      expect(await pool.maximumInboundCredit()).to.eq(parseEther('100000'), 'maximum inbound credit not equal')
      expect(await pool.maximumOutboundCredit()).to.eq(parseEther('100000'), 'maximum outbound credit not equal')
      expect(await pool.owner()).to.equal(multisig, 'owner not equal')
      expect(await pool.dev()).to.equal(multisig, 'dev not equal')
      expect(await pool.startCovRatio()).to.eq(parseEther('1.5'), 'startCovRatio not equal')
      expect(await pool.endCovRatio()).to.eq(parseEther('1.8'), 'endCovRatio not equal')
      expect(await pool.swapTokensForCreditEnabled()).to.eq(true, 'swapTokensForCreditEnabled not equal')
      expect(await pool.swapCreditForTokensEnabled()).to.eq(true, 'swapCreditForTokensEnabled not equal')
    })

    describe('Asset', function () {
      let assets: Contract[]

      beforeEach(async function () {
        const tokens = await pool.getTokens()
        const assetsAddresses = await Promise.all(tokens.map((token: string) => pool.addressOfAsset(token)))
        assets = await Promise.all(assetsAddresses.map((address) => ethers.getContractAt('Asset', address)))
      })

      it('has pool()', async function () {
        for (const asset of assets) {
          expect(await asset.pool()).to.eq(pool.address)
        }
      })

      it('has two assets', async function () {
        expect(assets).to.have.lengthOf(2)
      })

      it('has same tokens as pool', async function () {
        const poolTokens = await pool.getTokens()
        const assetTokens = await Promise.all(assets.map((asset) => asset.underlyingToken()))
        expect(assetTokens).to.have.members(poolTokens)
      })

      it('has names', async function () {
        expect(await Promise.all(assets.map((asset) => asset.name()))).to.have.members([
          'Wombat Binance USD Asset',
          'Wombat Venus USDC Asset',
        ])
      })

      it('has symbols', async function () {
        expect(await Promise.all(assets.map((asset) => asset.symbol()))).to.have.members(['LP-BUSD', 'LP-vUSDC'])
      })

      it('has 18 decimals', async function () {
        for (const asset of assets) {
          expect(await asset.decimals()).to.eq(18)
        }
      })

      it('has no maxSupply', async function () {
        for (const asset of assets) {
          expect(await asset.maxSupply()).eq(0)
        }
      })
    })
  })

  describe('Verify adaptor config', function () {
    const adaptorName = 'WormholeAdaptor'
    const contractName = getWormholeAdaptorDeploymentName(poolName)
    it(`verify address config for ${contractName}`, async function () {
      const wormholeAdaptor = (await getDeployedContract(adaptorName, contractName)) as WormholeAdaptor

      const wormholeChainId = 0
      // verify add adaptor address
      expect(await wormholeAdaptor.adaptorAddress(wormholeChainId)).to.eq('0x0000000000000000000000000000000000000001')

      // verify approve token
      expect(
        await wormholeAdaptor.validToken(wormholeChainId, await getAddress(getTokenDeploymentOrAddress(Token.BUSD)))
      ).to.be.true
      expect(
        await wormholeAdaptor.validToken(wormholeChainId, await getAddress(getTokenDeploymentOrAddress(Token.vUSDC)))
      ).to.be.true
    })
  })
})
