import { expect } from 'chai'
import { ethers } from 'hardhat'
import { BRIBE_MAPS, IRewarder, REWARDERS_MAP } from '../../tokens.config'

describe('RewarderBribeConfig', function () {
  ;['bsc_mainnet', 'bsc_testnet'].map((network) => {
    it(`${network} rewarder config ok`, function () {
      verify(REWARDERS_MAP[network])
    })
    it(`${network} bribe config ok`, function () {
      verify(BRIBE_MAPS[network])
    })
  })

  function verify(config: { [token: string]: IRewarder }) {
    for (const rewarder of Object.values(config)) {
      expect(rewarder.lpToken).to.not.eq(ethers.constants.AddressZero)
      expect(rewarder.rewardToken).to.not.eq(ethers.constants.AddressZero)
      expect(rewarder.secondsToStart || rewarder.startTimestamp).to.not.be.undefined
    }
  }
})
