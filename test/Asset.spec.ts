import { ethers } from 'hardhat'
import chai from 'chai'
import { parseUnits } from '@ethersproject/units'
import { Contract } from 'ethers'
import { solidity } from 'ethereum-waffle'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

chai.use(solidity)
const { expect } = chai

describe('Asset', function () {
  let owner: SignerWithAddress
  let pool: SignerWithAddress
  let user: SignerWithAddress
  let token: Contract
  let asset: Contract
  let aggregateAccount: Contract

  beforeEach(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    pool = rest[0]
    user = rest[1]

    // Get Factories
    const AssetFactory = await ethers.getContractFactory('Asset')
    const TestERC20Factory = await ethers.getContractFactory('TestERC20')
    const AggregateAccountFactory = await ethers.getContractFactory('AggregateAccount')

    // Deploy with factories
    token = await TestERC20Factory.deploy('Binance USD', 'BUSD', 18, parseUnits('1000000', 18)) // 1 mil BUSD
    aggregateAccount = await AggregateAccountFactory.connect(owner).deploy('stables', true)
    asset = await AssetFactory.deploy(token.address, 'Binance USD LP', 'BUSD-LP', aggregateAccount.address)

    // wait for transactions to be mined
    await token.deployTransaction.wait()
    await aggregateAccount.deployTransaction.wait()
    await asset.deployTransaction.wait()

    // set dummy pool address
    await asset.setPool(pool.address)
  })

  // TODO: move pool address setup within contract initialization
  describe('[initial deploy]', function () {
    it('Should return correct pool address ', async function () {
      expect(await asset.pool()).to.equal(pool.address)
    })
  })

  describe('[setPool]', function () {
    it('Should change the pool address', async function () {
      await asset.connect(owner).setPool(user.address)
      expect(await asset.pool()).to.equal(user.address)
    })

    it('Should revert as restricted to only owner', async function () {
      await expect((await asset.connect(pool)).setPool(user.address)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('Should revert as pool address cannot be zero', async function () {
      await expect(
        (await asset.connect(owner)).setPool('0x0000000000000000000000000000000000000000')
      ).to.be.revertedWith('Wombat: Pool address cannot be zero')
    })
  })

  describe('[aggregateAccount]', function () {
    it('Should return correct account address', async function () {
      expect(await asset.aggregateAccount()).to.equal(aggregateAccount.address)
    })
  })

  describe('[underlyingToken]', function () {
    it('Should return correct underlying token address', async function () {
      expect(await asset.underlyingToken()).to.equal(token.address)
    })
  })

  describe('[decimals]', function () {
    it('Should return correct decimals', async function () {
      expect(await asset.decimals()).to.equal(18)
    })
  })

  describe('[cash]', function () {
    it('Should return correct cash balance', async function () {
      expect(await asset.cash()).to.equal(0)
    })
  })

  describe('[liability]', function () {
    it('Should return correct liability balance', async function () {
      expect(await asset.liability()).to.equal(0)
    })
  })

  describe('[underlyingTokenBalance]', function () {
    it('Should return 0 underlying token balance with initial deploy', async function () {
      expect(await asset.underlyingTokenBalance()).to.equal(parseUnits('0', 18))
    })

    it('Should return 100 WAD underlying token balance after token transfer', async function () {
      await token.transfer(asset.address, parseUnits('100', 18))
      expect(await asset.underlyingTokenBalance()).to.equal(parseUnits('100', 18))
    })
  })

  describe('[transferUnderlyingToken]', function () {
    it('Should transfer ERC20 underlyingToken from asset contract to user account', async function () {
      // init tokens for asset contract
      await token.transfer(asset.address, parseUnits('100', 18))
      expect(await token.balanceOf(user.address)).to.equal(parseUnits('0', 18))

      // transfer ERC20 underlyingTokens from asset to user, uses 'safeTransfer"
      await asset.connect(pool).transferUnderlyingToken(user.address, parseUnits('10', 18))

      // should return correct balances after
      expect(await token.balanceOf(user.address)).to.equal(parseUnits('10', 18))
      expect(await asset.underlyingTokenBalance()).to.equal(parseUnits('90', 18))
    })

    it('Should revert as restricted to only pool', async function () {
      await expect(asset.transferUnderlyingToken(owner.address, parseUnits('100', 18))).to.be.revertedWith(
        'WOMBAT_FORBIDDEN'
      )
    })
  })

  describe('[mint]', function () {
    it('Should mint ERC20 Asset LP tokens', async function () {
      // initial LP tokens balance is 0
      expect(await asset.balanceOf(user.address)).to.equal(parseUnits('0', 18))

      // asset mints 100 LP tokens to user
      await asset.connect(pool).mint(user.address, parseUnits('100', 18))

      // should return correct balances after
      expect(await asset.balanceOf(user.address)).to.equal(parseUnits('100', 18))
      expect(await asset.totalSupply()).to.equal(parseUnits('100', 18))
    })

    it('Should revert as restricted to only pool', async function () {
      await expect(asset.connect(owner).mint(user.address, parseUnits('100', 18))).to.be.revertedWith(
        'WOMBAT_FORBIDDEN'
      )
    })
  })

  describe('[burn]', function () {
    it('Should burn ERC20 Asset LP tokens', async function () {
      // asset mints 100 LP tokens to user
      await asset.connect(pool).mint(user.address, parseUnits('100', 18))
      expect(await asset.balanceOf(user.address)).to.equal(parseUnits('100', 18))

      // asset burns 100 LP tokens to user
      await asset.connect(pool).burn(user.address, parseUnits('100', 18))

      // should return correct balances after
      expect(await asset.balanceOf(user.address)).to.equal('0')
      expect(await asset.totalSupply()).to.equal(parseUnits('0', 18))
    })

    it('Should revert as restricted to only pool', async function () {
      await expect((await asset.connect(owner)).burn(user.address, parseUnits('100', 18))).to.be.revertedWith(
        'WOMBAT_FORBIDDEN'
      )
    })
  })

  describe('[addCash]', function () {
    it('Should add cash amount to cash balance', async function () {
      expect(await asset.cash()).to.equal(parseUnits('0', 18))
      await asset.connect(pool).addCash(parseUnits('100', 18))
      expect(await asset.cash()).to.equal(parseUnits('100', 18))
    })

    it('Should revert as restricted to only pool', async function () {
      await expect((await asset.connect(owner)).addCash(parseUnits('100', 18))).to.be.revertedWith('WOMBAT_FORBIDDEN')
    })
  })

  describe('[removeCash]', function () {
    it('Should remove cash amount from cash balance', async function () {
      await asset.connect(pool).addCash(parseUnits('100', 18))
      expect(await asset.cash()).to.equal(parseUnits('100', 18))

      await asset.connect(pool).removeCash(parseUnits('10', 18))
      expect(await asset.cash()).to.equal(parseUnits('90', 18))
    })

    it('Should revert as cash balance cannot be negative', async function () {
      await asset.connect(pool).addCash(parseUnits('100', 18))
      expect(await asset.cash()).to.equal(parseUnits('100', 18))

      await expect((await asset.connect(pool)).removeCash(parseUnits('110', 18))).to.be.revertedWith(
        'Wombat: INSUFFICIENT_CASH'
      )
    })

    it('Should revert as restricted to only pool', async function () {
      await expect(asset.removeCash(parseUnits('100', 18))).to.be.revertedWith('WOMBAT_FORBIDDEN')
    })
  })

  describe('[addLiability]', function () {
    it('Should add liability amount to liability balance', async function () {
      expect(await asset.liability()).to.equal(parseUnits('0', 18))
      await asset.connect(pool).addLiability(parseUnits('100', 18))
      expect(await asset.liability()).to.equal(parseUnits('100', 18))
    })

    it('Should revert as restricted to only pool', async function () {
      await expect((await asset.connect(owner)).addLiability(parseUnits('100', 18))).to.be.revertedWith(
        'WOMBAT_FORBIDDEN'
      )
    })
  })

  describe('[removeLiability]', function () {
    it('Should remove liability amount from liability balance', async function () {
      await asset.connect(pool).addLiability(parseUnits('100', 18))
      expect(await asset.liability()).to.equal(parseUnits('100', 18))

      await asset.connect(pool).removeLiability(parseUnits('10', 18))
      expect(await asset.liability()).to.equal(parseUnits('90', 18))
    })

    it('Should revert as liability balance cannot be negative', async function () {
      await asset.connect(pool).addLiability(parseUnits('100', 18))
      expect(await asset.liability()).to.equal(parseUnits('100', 18))

      await expect((await asset.connect(pool)).removeLiability(parseUnits('110', 18))).to.be.revertedWith(
        'Wombat: INSUFFICIENT_LIABILITY'
      )
    })

    it('Should revert as restricted to only pool', async function () {
      await expect(asset.connect(owner).removeLiability(parseUnits('100', 18))).to.be.revertedWith('WOMBAT_FORBIDDEN')
    })
  })
})
