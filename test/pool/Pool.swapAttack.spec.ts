import { ethers } from 'hardhat'
import { parseEther, parseUnits } from '@ethersproject/units'
import chai from 'chai'

import { Contract, ContractFactory } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { CrossChainPool__factory } from '../../build/typechain'
import { restoreOrCreateSnapshot } from '../fixtures/executions'

const { expect } = chai

describe.skip('Pool - SwapAttack', function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let AssetFactory: ContractFactory
  let TestERC20Factory: ContractFactory
  let PoolFactory: ContractFactory
  let poolContract: Contract
  let token0: Contract // BUSD
  let token1: Contract // USDC
  let asset0: Contract // BUSD LP
  let asset1: Contract // USDC LP
  let lastBlockTime: number
  let fiveSecondsSince: number

  beforeEach(
    restoreOrCreateSnapshot(async function () {
      const [first, ...rest] = await ethers.getSigners()
      owner = first
      user1 = rest[0]

      // get last block time
      const lastBlock = await ethers.provider.getBlock('latest')
      lastBlockTime = lastBlock.timestamp
      fiveSecondsSince = lastBlockTime + 5 * 1000

      // Get Factories
      AssetFactory = await ethers.getContractFactory('Asset')
      TestERC20Factory = await ethers.getContractFactory('TestERC20')
      const CoreV3Factory = await ethers.getContractFactory('CoreV3')
      const coreV3 = await CoreV3Factory.deploy()
      PoolFactory = (await ethers.getContractFactory('PoolV3', {
        libraries: { CoreV3: coreV3.address },
      })) as CrossChainPool__factory

      // Deploy with factories
      token0 = await TestERC20Factory.deploy('Binance USD', 'BUSD', 18, parseUnits('1000000000', 18)) // 1B BUSD
      token1 = await TestERC20Factory.deploy('Venus USDC', 'vUSDC', 8, parseUnits('1000000000', 8)) // 1B vUSDC
      asset0 = await AssetFactory.deploy(token0.address, 'Binance USD LP', 'BUSD-LP')
      asset1 = await AssetFactory.deploy(token1.address, 'Venus USDC LP', 'vUSDC-LP')
      poolContract = await PoolFactory.connect(owner).deploy()

      // set pool address
      await asset0.setPool(poolContract.address)
      await asset1.setPool(poolContract.address)

      // initialize pool contract
      poolContract.connect(owner).initialize(parseEther('0.002'), parseEther('0.0004'))

      // Add BUSD & USDC & USDT assets to pool
      await poolContract.connect(owner).addAsset(token0.address, asset0.address)
      await poolContract.connect(owner).addAsset(token1.address, asset1.address)
    })
  )

  describe('Asset BUSD (18 decimals) and vUSDC (6 decimals)', function () {
    beforeEach(async function () {
      await token0.connect(owner).transfer(user1.address, parseEther('1000000000'))
      await token1.connect(owner).transfer(user1.address, parseUnits('1000000000', 8))
      await token0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)

      // deposit 10k BUSD and 1k vUSDC and 1k USDT to pool
      await poolContract
        .connect(user1)
        .deposit(token0.address, parseEther('1'), 0, user1.address, fiveSecondsSince, false)
      await poolContract
        .connect(user1)
        .deposit(token1.address, parseUnits('1', 8), 0, user1.address, fiveSecondsSince, false)
    })

    describe('swap', function () {
      it('works (BUSD -> vUSDC) without haircut fees', async function () {
        // set haircut rate to 0
        poolContract.connect(owner).setHaircutRate(0)

        await poolContract
          .connect(user1)
          .swap(token0.address, token1.address, parseEther('100000000'), 0, user1.address, fiveSecondsSince)

        expect((await poolContract.connect(user1).globalEquilCovRatio()).equilCovRatio).to.equal(
          parseEther('0.999999999999999999')
        )
      })
    })
  })
})
