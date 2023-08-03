import { BigNumber, BigNumberish } from 'ethers'
import { epoch_duration_seconds } from './epoch'

export function convertTokenPerSecToTokenPerEpoch(reward: BigNumberish): BigNumber {
  return BigNumber.from(reward).mul(epoch_duration_seconds)
}

export function convertTokenPerEpochToTokenPerSec(reward: BigNumberish): BigNumber {
  return BigNumber.from(reward).div(epoch_duration_seconds)
}

export function convertTokenPerMonthToTokenPerSec(reward: BigNumberish): BigNumber {
  return BigNumber.from(reward).div(30 * 24 * 3600)
}
