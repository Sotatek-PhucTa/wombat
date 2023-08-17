import { Signer } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { getDeployedContract, confirmTxn } from '.'

export async function faucet(signer: Signer, tokenSymbol: string, amount = '100000') {
  const token = await getDeployedContract('TestERC20', tokenSymbol)
  const decimals = await token.decimals()
  await confirmTxn(token.connect(signer).faucet(parseUnits(amount, decimals)))
}
