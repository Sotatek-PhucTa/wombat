import { Address, DeploymentOrAddress, Network, PartialRecord } from '..'
import { getCurrentNetwork } from '../network'
import { getAddress } from '../../utils'

// Enum of external contract that are not tokens.
// style note: sort alphabetically.
export enum ExternalContract {
  MagpieVeWomProxy,
  QuollVeWomProxy,
  SkimAdmin,
  WombexVeWomProxy,
}

export async function getContractAddress(contract: ExternalContract): Promise<string> {
  const network = await getCurrentNetwork()
  const deploymentOrAddress = contractRegistry[contract][network]
  if (!deploymentOrAddress) {
    throw new Error(`No config found for contract ${ExternalContract[contract]} in network ${network}`)
  } else {
    return getAddress(deploymentOrAddress)
  }
}

// registry of contract address. Used by getContractAddress only. Do not export.
const contractRegistry: Record<ExternalContract, PartialRecord<Network, DeploymentOrAddress>> = {
  [ExternalContract.MagpieVeWomProxy]: {
    // https://arbiscan.io/address/0x3CbFC97f87f534b42bb58276B7b5dCaD29E57EAc
    [Network.ARBITRUM_MAINNET]: Address('0x3CbFC97f87f534b42bb58276B7b5dCaD29E57EAc'),
  },
  [ExternalContract.QuollVeWomProxy]: {
    [Network.ARBITRUM_MAINNET]: Address('0x277Cd4b508aFbb75d182870409bBf610AFab5c7b'),
  },
  [ExternalContract.SkimAdmin]: {
    [Network.BSC_MAINNET]: Address('0xa772b0BA6042b9416a619f6638dcfEaC4a8B31fF'),
    [Network.ARBITRUM_MAINNET]: Address('0x3ca375b8107cB2c7f520cA87b2DeF8dC5040aeb4'),
  },
  [ExternalContract.WombexVeWomProxy]: {
    // https://arbiscan.io/address/0x24D2f6be2bF9cdf3627f720cf09D4551580C1eC1
    [Network.ARBITRUM_MAINNET]: Address('0x24D2f6be2bF9cdf3627f720cf09D4551580C1eC1'),
  },
}
