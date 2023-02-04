import { ethers } from 'hardhat'
import chai from 'chai'
import { BigNumber, BigNumberish, Contract } from 'ethers'

const { expect } = chai

export function toWei(amount: BigNumberish, tokenDecimals: BigNumberish): BigNumber {
  return ethers.utils.parseUnits(amount.toString(), tokenDecimals)
}

export const expectAssetValues = async (
  asset: Contract,
  decimals: number,
  { cash, liability, tokenBN }: { cash: string; liability: string; tokenBN: string }
): Promise<void> => {
  const expectedCashBN = toWei(cash, 18)

  expect(await asset.cash()).to.be.equal(expectedCashBN)
  expect(await asset.liability()).to.be.equal(toWei(liability, 18))
  expect(await asset.underlyingTokenBalance()).to.be.equal(toWei(tokenBN, decimals))
}
