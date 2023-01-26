import { ethers } from 'hardhat'
import { getTestERC20 } from '../utils'

export async function deployTestAsset(tokenSymbol: string) {
  const erc20 = await getTestERC20(tokenSymbol)
  return ethers.deployContract('Asset', [erc20.address, `${tokenSymbol} Asset`, `LP-${tokenSymbol}`])
}
