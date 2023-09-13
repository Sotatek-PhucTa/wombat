import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { getDeployedContract, multisig } from '../../../utils'
import { Deployment } from '../../../types'
import { executeBatchTransaction } from '../../../utils/multisig/transactions'
import { BatchTransaction } from '../../../utils/multisig/tx-builder'
import { expect } from 'chai'

describe('Multisig util', function () {
  let owner: SignerWithAddress
  let proxyAdmin: Contract
  let timelockController: Contract
  let usdcAsset: Contract
  let usdtAsset: Contract
  let daiAsset: Contract

  beforeEach(async function () {
    ;[owner] = await ethers.getSigners()
    await deployments.fixture(['HighCovRatioFeePoolAssets', 'TimelockController'])
    ;[proxyAdmin, timelockController, usdcAsset, usdtAsset, daiAsset] = await Promise.all([
      getDeployedContract('ProxyAdmin', 'DefaultProxyAdmin'),
      getDeployedContract('TimelockController'),
      getDeployedContract('Asset', 'Asset_MainPool_USDC'),
      getDeployedContract('Asset', 'Asset_MainPool_USDT'),
      getDeployedContract('Asset', 'Asset_MainPool_DAI'),
    ])
  })

  describe('transferAssetsOwnership', function () {
    it('should transfer ownership', async function () {
      const txns = await multisig.utils.transferAssetsOwnership(
        ['Asset_MainPool_USDC', 'Asset_MainPool_USDT'],
        Deployment('TimelockController')
      )
      expect(txns).to.have.length(2)
      await executeBatchTransactions(owner, txns)
      expect(await usdcAsset.owner()).to.equal(timelockController.address)
      expect(await usdtAsset.owner()).to.equal(timelockController.address)
    })

    it('should skip if ownership is already transferred', async function () {
      const txns = await multisig.utils.transferAssetsOwnership(
        ['Asset_MainPool_USDC', 'Asset_MainPool_USDT'],
        Deployment('TimelockController')
      )
      expect(txns).to.have.length(2)
      await executeBatchTransactions(owner, txns)

      const txns2 = await multisig.utils.transferAssetsOwnership(
        ['Asset_MainPool_USDC', 'Asset_MainPool_USDT'],
        Deployment('TimelockController')
      )
      expect(txns2).to.be.empty
    })

    it('should transfer ownership if some is not already transfered', async function () {
      const txns = await multisig.utils.transferAssetsOwnership(
        ['Asset_MainPool_USDC', 'Asset_MainPool_USDT'],
        Deployment('TimelockController')
      )
      expect(txns).to.have.length(2)
      await executeBatchTransactions(owner, txns)
      expect(await usdcAsset.owner()).to.equal(timelockController.address)
      expect(await usdtAsset.owner()).to.equal(timelockController.address)
      expect(await daiAsset.owner()).to.equal(owner.address)

      const txns2 = await multisig.utils.transferAssetsOwnership(
        ['Asset_MainPool_USDC', 'Asset_MainPool_USDT', 'Asset_MainPool_DAI'],
        Deployment('TimelockController')
      )
      expect(txns2).to.have.length(1)
      await executeBatchTransactions(owner, txns2)
      expect(await usdcAsset.owner()).to.equal(timelockController.address)
      expect(await usdtAsset.owner()).to.equal(timelockController.address)
      expect(await daiAsset.owner()).to.equal(timelockController.address)
    })
  })

  describe('transferProxyAdminOwnership', function () {
    it('transfer ownership of proxy admin', async function () {
      expect(await proxyAdmin.owner()).to.equal(owner.address)
      await executeBatchTransactions(
        owner,
        await multisig.utils.transferProxyAdminOwnership(Deployment('TimelockController'))
      )
      expect(await proxyAdmin.owner()).to.equal(timelockController.address)
    })
  })

  // This is for testing only. Do not use in production, since transactions order is not guaranteed.
  async function executeBatchTransactions(signer: SignerWithAddress, txns: BatchTransaction[]) {
    return Promise.all(txns.map((txn) => executeBatchTransaction(signer, txn)))
  }
})
