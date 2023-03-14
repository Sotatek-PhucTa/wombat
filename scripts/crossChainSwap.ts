import { BigNumberish } from 'ethers'
import { formatEther, parseEther } from 'ethers/lib/utils'
import { deployments, ethers, getNamedAccounts, network } from 'hardhat'
import { MegaPool, WormholeAdaptor } from '../build/typechain'
import { Network } from '../types'

/**
 * This script is able to swap tokens cross-chain by calling `send`
 * In case of delivery failure (probably due to `DELIVERY_GAS_LIMIT` not enough), one can use `resend` to attempt retransmission
 */

// configurations
const wormholeNetworkAddress: Record<string, number> = {
  [Network.BSC_TESTNET]: 4,
  [Network.AVALANCHE_TESTNET]: 6,
}
const FUJI_VUSDC = '0x8Cfa834ebBE803294020b08c521aA4637cB3dC1A'
const BSC_TESTNET_VUSDC = '0x9cc77B893d40861854fD90Abaf8414a5bD2bEcf8'

// parameters
const DELIVERY_GAS_LIMIT = 150000
const RECEIVE_VALUE = 0
const NONCE = 1

async function send(
  fromToken: string,
  toToken: string,
  targetChain: number,
  fromAmount: BigNumberish,
  minimumCreditAmount: BigNumberish,
  minimumToAmount: BigNumberish,
  deliveryGasLimit: number
) {
  console.log('send...')
  const { deployer } = await getNamedAccounts()
  const poolAddress = (await deployments.get('MegaPool')).address
  const pool = (await ethers.getContractAt('MegaPool', poolAddress)) as MegaPool

  const adaptorAddress = (await deployments.get('WormholeAdaptor')).address
  const adaptor = (await ethers.getContractAt('WormholeAdaptor', adaptorAddress)) as WormholeAdaptor

  console.log('delivery gas limit: ', deliveryGasLimit)
  const value = await adaptor.estimateDeliveryFee(targetChain, deliveryGasLimit, RECEIVE_VALUE)
  console.log('value: ', formatEther(value))

  // swap
  const txn = await pool.swapTokensForTokensCrossChain(
    fromToken,
    toToken,
    targetChain,
    fromAmount,
    minimumCreditAmount,
    minimumToAmount,
    deployer,
    NONCE,
    { value: value }
  )

  const result = await txn.wait()
  console.log('txn:', result.transactionHash)
}

async function resend(txnHash: string, sourceChain: number, targetChain: number) {
  console.log('resend...')

  const adaptorAddress = (await deployments.get('WormholeAdaptor')).address
  const adaptor = (await ethers.getContractAt('WormholeAdaptor', adaptorAddress)) as WormholeAdaptor

  console.log('re-delivery gas limit: ', DELIVERY_GAS_LIMIT)
  const value = await adaptor.estimateRedeliveryFee(targetChain, DELIVERY_GAS_LIMIT)
  console.log('value: ', formatEther(value))

  // resend
  const txn = await adaptor.requestResend(sourceChain, txnHash, NONCE, targetChain, { value: value })
  const result = await txn.wait()
  console.log('txn:', result.transactionHash)
}

async function run() {
  const busdAddr = (await deployments.get('BUSD')).address
  let targetChain = 0
  if (network.name === Network.BSC_TESTNET) {
    targetChain = wormholeNetworkAddress[Network.AVALANCHE_TESTNET]
  } else if (network.name === Network.AVALANCHE_TESTNET) {
    targetChain = wormholeNetworkAddress[Network.BSC_TESTNET]
  }

  // should swap successfully
  if (network.name === Network.BSC_TESTNET) {
    await send(busdAddr, FUJI_VUSDC, targetChain, parseEther('10'), 0, 0, DELIVERY_GAS_LIMIT)
  } else if (network.name === Network.AVALANCHE_TESTNET) {
    await send(busdAddr, BSC_TESTNET_VUSDC, targetChain, parseEther('10'), 0, 0, DELIVERY_GAS_LIMIT)
  }

  // resend
  // await resend('0xa5f6126ee4ca1f57a02281f6117e0f316f9ca7814f220092dfdaab87fa022e9a', 6, 4)
}

// Run the script
run()
