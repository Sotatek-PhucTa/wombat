import { BigNumberish, Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { getTestERC20 } from '../utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { expect } from 'chai'

describe('[Rewarder]', function () {
  const vUSDCDecimals = 8
  const USDCDecimals = 18

  let owner: SignerWithAddress
  let user: SignerWithAddress
  let master: Contract
  let USDC: Contract
  let vUSDC: Contract

  beforeEach(async function () {
    await deployments.fixture(['MockTokens'])
    ;[owner, user] = await ethers.getSigners()
    master = await ethers.deployContract('RewarderCaller')

    USDC = await getTestERC20('USDC')
    expect(await USDC.decimals()).to.eq(USDCDecimals)

    vUSDC = await getTestERC20('vUSDC')
    expect(await vUSDC.decimals()).to.eq(vUSDCDecimals)

    // Note: rewarder use master's LP balance as total share
    USDC.faucet(parseUSDC('1'))
    USDC.transfer(master.address, parseUSDC('1'))
  })

  describe('vUSDC (8 decimal)', function () {
    it('rewards 1 vUSDC/s', async function () {
      const vUSDCRewarder = await deployRewarder({
        rewardToken: vUSDC.address,
        tokenPerSec: parseVUSDC('1'),
      })
      await master.onReward(vUSDCRewarder.address, user.address, /*lpAmount=*/ parseEther('1'))
      await time.increase(3600) // T+1h
      const [rewards] = await vUSDCRewarder.pendingTokens(user.address)
      expect(rewards).to.eql(parseVUSDC('3600'))
    })
  })

  describe('USDC (18 decimal)', function () {
    it('rewards 1 USDC/s', async function () {
      const USDCRewarder = await deployRewarder({
        rewardToken: USDC.address,
        tokenPerSec: parseUSDC('1'),
      })
      await master.onReward(USDCRewarder.address, user.address, /*lpAmount=*/ parseEther('1'))
      await time.increase(3600) // T+1h
      const [rewards] = await USDCRewarder.pendingTokens(user.address)
      expect(rewards).to.eql(parseUSDC('3600'))
    })
  })

  interface RewardInfo {
    rewardToken: string
    tokenPerSec: BigNumberish
  }

  async function deployRewarder(rewardInfo: RewardInfo) {
    return ethers.deployContract('MultiRewarderPerSec', [
      /*master=*/ master.address,
      // lpToken must have 18 decimals!
      /*lpToken=*/ USDC.address,
      (await time.latest()) + 1,
      /*rewardToken=*/ rewardInfo.rewardToken,
      /*tokenPerSec=*/ rewardInfo.tokenPerSec, // must match rewardToken decimals!
    ])
  }

  function parseUSDC(value: string) {
    return parseUnits(value, USDCDecimals)
  }

  function parseVUSDC(value: string) {
    return parseUnits(value, vUSDCDecimals)
  }
})
