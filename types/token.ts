import { Deployment, DeploymentOrAddress, Network, PartialRecord } from '.'
import { getNetwork } from './network'
import { getAddress } from '../utils'

export enum Token {
  WOM,
  USDT,
}

export async function getTokenAddress(token: Token): Promise<string> {
  const network = await getNetwork()
  const deploymentOrAddress = registry[token][network]
  if (!deploymentOrAddress) {
    throw new Error(`No config found for token ${Token[token]} in network ${network}`)
  } else {
    return getAddress(deploymentOrAddress)
  }
}

// registry of token address. Used by getTokenAddress only. Do not export.
const registry: Record<Token, PartialRecord<Network, DeploymentOrAddress>> = {
  [Token.WOM]: {
    [Network.HARDHAT]: Deployment('WombatToken'),
  },
  [Token.USDT]: {},
}
