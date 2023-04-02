import { Address, DeploymentOrAddress, Network, PartialRecord } from '..'
import { getNetwork } from '../network'
import { getAddress } from '../../utils'

// Enum of external contract that are not tokens.
// style note: sort alphabetically.
export enum Contract {
  SkimAdmin,
}

export async function getContractAddress(contract: Contract): Promise<string> {
  const network = await getNetwork()
  const deploymentOrAddress = contractRegistry[contract][network]
  if (!deploymentOrAddress) {
    throw new Error(`No config found for contract ${Contract[contract]} in network ${network}`)
  } else {
    return getAddress(deploymentOrAddress)
  }
}

// registry of contract address. Used by getContractAddress only. Do not export.
const contractRegistry: Record<Contract, PartialRecord<Network, DeploymentOrAddress>> = {
  [Contract.SkimAdmin]: {
    [Network.BSC_MAINNET]: Address('0xD9fCDFFEd5cA34Ef21661Ec6Fe3AEb742db6331e'),
    [Network.ARBITRUM_MAINNET]: Address('0x145F2a1aa70098031629606d856591dA0C717554'),
  },
}
