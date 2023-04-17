import { Address, DeploymentOrAddress, Network, PartialRecord } from '../types'
import { getCurrentNetwork } from '../types/network'
import { getAddress } from '../utils'

// Enum of external contract that are not tokens.
// style note: sort alphabetically.
export enum ExternalContract {
  AnkrBribeOperator,
  BNByOracle,
  FraxBribeOperator,
  MagpieVeWomProxy,
  QuollBribeOperator,
  QuollVeWomProxy,
  SkimAdmin,
  TenFiBribeOperator,
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

export async function getContractAddressOrDefault(
  contract: ExternalContract | undefined,
  defaultValue: string
): Promise<string> {
  if (contract === undefined) {
    return defaultValue
  } else {
    return getContractAddress(contract)
  }
}

// registry of contract address. Used by getContractAddress only. Do not export.
const contractRegistry: Record<ExternalContract, PartialRecord<Network, DeploymentOrAddress>> = {
  [ExternalContract.AnkrBribeOperator]: {
    [Network.BSC_MAINNET]: Address('0xAE1c38847Fb90A13a2a1D7E5552cCD80c62C6508'),
  },
  [ExternalContract.BNByOracle]: {
    // https://bscscan.com/address/0xf68d19881d0de14066926313b148f8ab07876988
    [Network.BSC_MAINNET]: Address('0xf68d19881d0de14066926313b148f8ab07876988'),
  },
  [ExternalContract.FraxBribeOperator]: {
    [Network.BSC_MAINNET]: Address('0x6e74053a3798e0fC9a9775F7995316b27f21c4D2'),
    [Network.ARBITRUM_MAINNET]: Address('0x6e74053a3798e0fC9a9775F7995316b27f21c4D2'),
  },
  [ExternalContract.MagpieVeWomProxy]: {
    // https://arbiscan.io/address/0x3CbFC97f87f534b42bb58276B7b5dCaD29E57EAc
    [Network.ARBITRUM_MAINNET]: Address('0x3CbFC97f87f534b42bb58276B7b5dCaD29E57EAc'),
  },
  [ExternalContract.QuollBribeOperator]: {
    [Network.ARBITRUM_MAINNET]: Address('0x20A62EDcE0e18683D081744b1789A614d1De6397'),
  },
  [ExternalContract.QuollVeWomProxy]: {
    [Network.ARBITRUM_MAINNET]: Address('0x277Cd4b508aFbb75d182870409bBf610AFab5c7b'),
  },
  [ExternalContract.SkimAdmin]: {
    [Network.BSC_MAINNET]: Address('0xa772b0BA6042b9416a619f6638dcfEaC4a8B31fF'),
    [Network.ARBITRUM_MAINNET]: Address('0x3ca375b8107cB2c7f520cA87b2DeF8dC5040aeb4'),
  },
  [ExternalContract.TenFiBribeOperator]: {
    [Network.BSC_MAINNET]: Address('0x393c7c3ebcbff2c1138d123df5827e215458f0c4'),
  },
  [ExternalContract.WombexVeWomProxy]: {
    // https://arbiscan.io/address/0x24D2f6be2bF9cdf3627f720cf09D4551580C1eC1
    [Network.ARBITRUM_MAINNET]: Address('0x24D2f6be2bF9cdf3627f720cf09D4551580C1eC1'),
  },
}
