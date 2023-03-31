import { Network } from '../types'
import hre from 'hardhat'

// Use this utility to look up network related config. Fork network precedes hardhat network.
// For example, if we are forking bsc_mainnet and running inside hardhat network, this returns bsc_mainnet.
// REQUIRES: hardhat runtime to be initialized. Therefore, we can't put this in types/index.ts, which is used by
// hardhat.config.ts.
export async function getNetwork(): Promise<Network> {
  const network = process.env.FORK_NETWORK || ''
  if (Object.values(Network).includes(network as Network)) {
    return network as Network
  } else {
    return hre.network.name as Network
  }
}
