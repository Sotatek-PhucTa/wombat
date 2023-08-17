import { BigNumberish } from 'ethers'
import { formatEther, parseEther } from 'ethers/lib/utils'
import { deployments, ethers, getNamedAccounts, network } from 'hardhat'
import { CrossChainPool, WormholeAdaptor } from '../build/typechain'
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
const DELIVERY_GAS_LIMIT = 200000
const RECEIVER_VALUE = parseEther('0.005')
const REDELIVERY_SEQ = 9568

async function send(
  fromToken: string,
  toToken: string,
  targetChain: number,
  fromAmount: BigNumberish,
  minimumCreditAmount: BigNumberish,
  minimumToAmount: BigNumberish,
  receiverValue: BigNumberish,
  deliveryGasLimit: BigNumberish
) {
  console.log('send...')
  const { deployer } = await getNamedAccounts()
  const poolAddress = (await deployments.get('CrossChainPool_Stablecoin_Pool')).address
  const pool = (await ethers.getContractAt('CrossChainPool', poolAddress)) as CrossChainPool

  const adaptorAddress = (await deployments.get('WormholeAdaptor_Stablecoin_Pool')).address
  const adaptor = (await ethers.getContractAt('WormholeAdaptor', adaptorAddress)) as WormholeAdaptor

  console.log('delivery gas limit: ', deliveryGasLimit)
  const value = await adaptor.estimateDeliveryFee(targetChain, RECEIVER_VALUE, deliveryGasLimit)
  console.log('value: ', formatEther(value.nativePriceQuote))

  // swap
  const txn = await pool.swapTokensForTokensCrossChain(
    fromToken,
    toToken,
    targetChain,
    fromAmount,
    minimumCreditAmount,
    minimumToAmount,
    deployer,
    receiverValue,
    deliveryGasLimit,
    { value: value.nativePriceQuote }
  )

  const result = await txn.wait()
  console.log('txn:', result.transactionHash)
}

async function resend(
  sourceChain: number,
  sequence: number,
  targetChain: number,
  receiverValue: BigNumberish,
  deliveryGasLimit: BigNumberish
) {
  console.log('resend...')

  const adaptorAddress = (await deployments.get('WormholeAdaptor_Stablecoin_Pool')).address
  const adaptor = (await ethers.getContractAt('WormholeAdaptor', adaptorAddress)) as WormholeAdaptor

  console.log('re-delivery gas limit: ', deliveryGasLimit)
  const { nativePriceQuote } = await adaptor.estimateRedeliveryFee(targetChain, receiverValue, deliveryGasLimit)
  console.log('value: ', formatEther(nativePriceQuote))

  // resend
  const txn = await adaptor.requestResend(sourceChain, sequence, targetChain, receiverValue, deliveryGasLimit, {
    value: nativePriceQuote,
  })
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
    await send(busdAddr, FUJI_VUSDC, targetChain, parseEther('1'), 0, 0, RECEIVER_VALUE, DELIVERY_GAS_LIMIT)
  } else if (network.name === Network.AVALANCHE_TESTNET) {
    await send(busdAddr, BSC_TESTNET_VUSDC, targetChain, parseEther('1'), 0, 0, RECEIVER_VALUE, DELIVERY_GAS_LIMIT)
  }
}

// Run the script
run()

// resend(
//   wormholeNetworkAddress[Network.AVALANCHE_TESTNET],
//   REDELIVERY_SEQ,
//   wormholeNetworkAddress[Network.BSC_TESTNET],
//   RECEIVER_VALUE,
//   DELIVERY_GAS_LIMIT
// )
