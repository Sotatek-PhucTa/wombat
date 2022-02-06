import { BigNumberish } from 'ethers'
import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'

export async function advanceBlock() {
  return ethers.provider.send('evm_mine', [])
}

export async function advanceBlockTo(blockNumber: number) {
  for (let i = await ethers.provider.getBlockNumber(); i < blockNumber; i++) {
    await advanceBlock()
  }
}

/* eslint-disable  @typescript-eslint/no-explicit-any */
export async function increase(value: any) {
  await ethers.provider.send('evm_increaseTime', [Number(value)])
  await advanceBlock()
}

export async function increaseTo(target: any) {
  const now = await latest()
  if (Number(now) > target) throw Error(`Cannot increase current time (${now}) to a moment in the past (${target})`)
  const diff = target - Number(now)
  return increase(diff)
}

export async function latest() {
  const block = await ethers.provider.getBlock('latest')
  return BigNumber.from(block.timestamp)
}

export async function advanceTimeAndBlock(time: number) {
  await advanceTime(time)
  await advanceBlock()
}

export async function advanceTime(time: number) {
  await ethers.provider.send('evm_increaseTime', [time])
}

export const duration = {
  seconds: function (val: BigNumberish) {
    return BigNumber.from(val)
  },
  minutes: function (val: BigNumberish) {
    return BigNumber.from(val).mul(this.seconds('60'))
  },
  hours: function (val: BigNumberish) {
    return BigNumber.from(val).mul(this.minutes('60'))
  },
  days: function (val: BigNumberish) {
    return BigNumber.from(val).mul(this.hours('24'))
  },
  weeks: function (val: BigNumberish) {
    return BigNumber.from(val).mul(this.days('7'))
  },
  years: function (val: BigNumberish) {
    return BigNumber.from(val).mul(this.days('365'))
  },
}
