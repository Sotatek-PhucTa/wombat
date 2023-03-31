import { expect } from 'chai'
import { BRIBE_MAPS, REWARDERS_MAP } from '../../tokens.config'
import { IRewarder, Network, TokenMap } from '../../types'
import { ethers } from 'hardhat'

describe('RewarderBribeConfig', function () {
  Object.values(Network).map((network) => {
    it(`${network} rewarder config ok`, function () {
      verify(REWARDERS_MAP[network] || {})
    })
    it(`${network} bribe config ok`, function () {
      verify(BRIBE_MAPS[network] || {})
    })
  })

  function verify(config: TokenMap<IRewarder>) {
    for (const rewarder of Object.values(config)) {
      expect(rewarder.rewardToken != ethers.constants.AddressZero || rewarder.rewardTokens.length > 0).to.be.true
      expect(rewarder.secondsToStart || rewarder.startTimestamp).to.exist
    }
  }
})
