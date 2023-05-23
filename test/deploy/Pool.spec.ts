import { expect } from 'chai'
import { Contract } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { getDeployedContract } from '../../utils'

describe('Main pool deployment', function () {
  let pool: Contract
  let deployer: string
  let multisig: string
  beforeEach(async function () {
    await deployments.fixture(['HighCovRatioFeePoolAssets', 'MockTokens'])
    pool = await getDeployedContract('HighCovRatioFeePoolV2', 'MainPool')
    ;({ deployer, multisig } = await getNamedAccounts())
  })

  describe('Pool', function () {
    it('pool is defined', async function () {
      expect(pool).to.not.be.undefined
    })

    it('dev() is deployer', async function () {
      expect(await pool.dev()).to.eq(deployer)
    })

    it('owner() is deployer', async function () {
      expect(await pool.owner()).to.eq(multisig)
    })

    it('pool has six tokens', async function () {
      expect(await pool.getTokens()).to.have.lengthOf(6)
    })

    it('retains all fee', async function () {
      expect(await pool.retentionRatio()).to.eq(parseEther('0.5'))
    })

    it('does not share fee', async function () {
      expect(await pool.lpDividendRatio()).to.eq(parseEther('0.5'))
    })
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

    it('has six assets', async function () {
      expect(assets).to.have.lengthOf(6)
    })

    it('has same tokens as pool', async function () {
      const poolTokens = await pool.getTokens()
      const assetTokens = await Promise.all(assets.map((asset) => asset.underlyingToken()))
      expect(assetTokens).to.have.members(poolTokens)
    })

    it('has names', async function () {
      expect(await Promise.all(assets.map((asset) => asset.name()))).to.have.members([
        'Wombat Binance USD Asset',
        'Wombat USD Coin Asset',
        'Wombat Tether USD Asset',
        'Wombat TrueUSD Asset',
        'Wombat Dai Stablecoin Asset',
        'Wombat Venus USDC Asset',
      ])
    })

    it('has symbols', async function () {
      expect(await Promise.all(assets.map((asset) => asset.symbol()))).to.have.members([
        'LP-BUSD',
        'LP-USDC',
        'LP-USDT',
        'LP-TUSD',
        'LP-DAI',
        'LP-vUSDC',
      ])
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
