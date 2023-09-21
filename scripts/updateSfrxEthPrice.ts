import { BigNumber, Contract } from 'ethers'
import { confirmTxn, getDeployedContract } from '../utils'
import { formatEther } from 'ethers/lib/utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { assert } from 'chai'
import { ethers, getNamedAccounts } from 'hardhat'
import { Provider } from '@ethersproject/providers'
import { ExternalContract, getContractAddress } from '../config/contract'
import { Network } from '../types'
import { getCurrentNetwork } from '../types/network'

main()

async function main() {
  const network = getCurrentNetwork()
  const { deployer } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  const price = await getSfrxETHPrice()
  const priceFeed = await getDeployedContract(
    'GovernedPriceFeed',
    'PriceFeed_GovernedPriceFeed_Asset_frxETH_Pool_sfrxETH'
  )
  assert(
    await priceFeed.hasRole(await priceFeed.ROLE_OPERATOR(), deployerSigner.address),
    `User ${deployerSigner.address} is not authorized to operate`
  )

  await confirmTxn(priceFeed.connect(deployerSigner).setLatestPrice(price))
  console.log(`[${network}] Price feed price set to ${formatEther(price)}`)
}

async function getSfrxETHPrice(): Promise<BigNumber> {
  const abi = [
    {
      inputs: [],
      name: 'pricePerShare',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  ]
  const address = await getContractAddress(ExternalContract.sfrxETHStakingManager, Network.ETHEREUM_MAINNET)
  const contract = new Contract(address, abi, await getEthMainnetProvider())
  return contract.pricePerShare()
}

async function getEthMainnetProvider(): Promise<Provider> {
  return new ethers.providers.JsonRpcProvider('https://eth.llamarpc.com')
}
