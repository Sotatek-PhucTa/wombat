import { Address, Deployment, ILayerZeroConfig, Network, PartialRecord } from '../types'
import { injectForkNetwork } from './pools.config'

export const LAYERZERO_CONFIG_MAPS: PartialRecord<Network, ILayerZeroConfig> = injectForkNetwork<ILayerZeroConfig>({
  // devnet
  [Network.HARDHAT]: {
    endpoint: Deployment('LZEndpointMock'),
    chainId: 65535, // mock chainId
  },
  [Network.LOCALHOST]: {
    endpoint: Deployment('LZEndpointMock'),
    chainId: 65535, // mock chainId
  },
  // testnet https://layerzero.gitbook.io/docs/technical-reference/testnet/testnet-addresses
  [Network.BSC_TESTNET]: {
    endpoint: Address('0x6Fcb97553D41516Cb228ac03FdC8B9a0a9df04A1'),
    chainId: 10102,
  },
  [Network.AVALANCHE_TESTNET]: {
    endpoint: Address('0x93f54D755A063cE7bB9e6Ac47Eccc8e33411d706'),
    chainId: 10106,
  },
  // mainnet https://layerzero.gitbook.io/docs/technical-reference/mainnet/supported-chain-ids
})
