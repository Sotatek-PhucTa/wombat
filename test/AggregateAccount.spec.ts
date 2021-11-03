import { ethers } from 'hardhat'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ContractFactory, Contract } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const { expect } = chai

chai.use(solidity)

describe('AggregateAccount', function () {
  let owner: SignerWithAddress
  let users: SignerWithAddress[]
  let AggregateAccountFactory: ContractFactory
  let AggregateAccount: Contract

  // Declare initial variables
  let accountName: string // account name
  let isStable: boolean // account type

  beforeEach(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    users = rest

    // Setup initial variables
    accountName = 'stables'
    isStable = true

    AggregateAccountFactory = await ethers.getContractFactory('AggregateAccount')
    AggregateAccount = await AggregateAccountFactory.connect(owner).deploy(accountName, isStable)

    // Wait for transaction to be mined
    await AggregateAccount.deployTransaction.wait()
  })

  describe('[initial deploy]', async function () {
    it('Should return correct deployed account name and type', async function () {
      expect(await AggregateAccount.accountName()).to.be.equal('stables')
      expect(await AggregateAccount.isStable()).to.be.equal(true)
    })
  })

  describe('[setAccountName]', async function () {
    // https://ethereum-waffle.readthedocs.io/en/latest/matchers.html#revert-with-message
    it('Should revert if invoked by non-owners of contract', async function () {
      await expect(AggregateAccount.connect(users[0]).setAccountName('btcs')).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })
  })

  describe('[setAccountName]', async function () {
    it('Should revert if empty name', async function () {
      await expect(AggregateAccount.connect(owner).setAccountName('')).to.be.revertedWith(
        'Wombat: Aggregate account name cannot be zero'
      )
    })
  })

  describe('[setAccountName]', async function () {
    it('Should return changed account name if invoked by contract owner', async function () {
      await AggregateAccount.connect(owner).setAccountName('btcs')
      expect(await AggregateAccount.accountName()).to.be.equal('btcs')
    })
  })
})
