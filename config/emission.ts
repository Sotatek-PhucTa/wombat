import { BigNumber, BigNumberish } from 'ethers'
import { epoch_duration_seconds } from './epoch'

export function convertTokenPerEpochToTokenPerSec(reward: BigNumberish): BigNumber {
  return BigNumber.from(reward).div(epoch_duration_seconds)
}
