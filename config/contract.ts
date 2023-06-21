import { Address, DeploymentOrAddress, Network, PartialRecord } from '../types'
import { getCurrentNetwork } from '../types/network'
import { getAddress } from '../utils'

// Enum of external contract that are not tokens.
// style note: sort alphabetically.
export enum ExternalContract {
  AnkrBNBOracle,
  AnkrBribeOperator,
  AnkrETHOracle,
  BNBxOracle,
  BNByOracle,
  ChainlinkOracleWstETH,
  FraxBribeOperator,
  JonesDaoBribeOperator,
  MagpieBribeOperator,
  MagpieVeWomProxy,
  PythOracle,
  QuollBribeOperator,
  QuollVeWomProxy,
  SkimAdmin,
  StkBNBOracle,
  TenFiBribeOperator,
  WombexBribeOperator,
  WombexVeWomProxy,
  jUSDCOracle,
  wBETHOracle,
}

export async function getContractAddress(contract: ExternalContract): Promise<string> {
  const network = getCurrentNetwork()
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
  [ExternalContract.AnkrBNBOracle]: {
    [Network.BSC_MAINNET]: Address('0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827'),
  },
  [ExternalContract.AnkrBribeOperator]: {
    [Network.BSC_MAINNET]: Address('0xAE1c38847Fb90A13a2a1D7E5552cCD80c62C6508'),
    [Network.ARBITRUM_MAINNET]: Address('0xAE1c38847Fb90A13a2a1D7E5552cCD80c62C6508'),
  },
  [ExternalContract.AnkrETHOracle]: {
    [Network.BSC_MAINNET]: Address('0xe05A08226c49b636ACf99c40Da8DC6aF83CE5bB3'),
    [Network.ARBITRUM_MAINNET]: Address('0xe05A08226c49b636ACf99c40Da8DC6aF83CE5bB3'),
  },
  [ExternalContract.BNBxOracle]: {
    [Network.BSC_MAINNET]: Address('0x7276241a669489E4BBB76f63d2A43Bfe63080F2F'),
  },
  [ExternalContract.BNByOracle]: {
    // https://bscscan.com/address/0x5e259cdbC6A3b7CeA735C906E585cba36Cca7f44
    [Network.BSC_MAINNET]: Address('0x5e259cdbC6A3b7CeA735C906E585cba36Cca7f44'),
  },
  [ExternalContract.ChainlinkOracleWstETH]: {
    // https://data.chain.link/arbitrum/mainnet/crypto-eth/wsteth-steth%20exchangerate
    [Network.ARBITRUM_MAINNET]: Address('0xB1552C5e96B312d0Bf8b554186F846C40614a540'),
  },
  [ExternalContract.FraxBribeOperator]: {
    [Network.BSC_MAINNET]: Address('0x6e74053a3798e0fC9a9775F7995316b27f21c4D2'),
    [Network.ARBITRUM_MAINNET]: Address('0x6e74053a3798e0fC9a9775F7995316b27f21c4D2'),
  },
  [ExternalContract.JonesDaoBribeOperator]: {
    [Network.ARBITRUM_MAINNET]: Address('0xDD0556DDCFE7CdaB3540E7F09cB366f498d90774'),
  },
  [ExternalContract.MagpieBribeOperator]: {
    [Network.BSC_MAINNET]: Address('0xf433c2A2D6FACeCDd9Edd7B8cE9cEaaB96F41866'),
    [Network.ARBITRUM_MAINNET]: Address('0xf433c2A2D6FACeCDd9Edd7B8cE9cEaaB96F41866'),
  },
  [ExternalContract.MagpieVeWomProxy]: {
    // https://arbiscan.io/address/0x3CbFC97f87f534b42bb58276B7b5dCaD29E57EAc
    [Network.ARBITRUM_MAINNET]: Address('0x3CbFC97f87f534b42bb58276B7b5dCaD29E57EAc'),
  },
  [ExternalContract.PythOracle]: {
    // https://docs.pyth.network/pythnet-price-feeds/evm
    [Network.BSC_MAINNET]: Address('0x4D7E825f80bDf85e913E0DD2A2D54927e9dE1594'),
    [Network.BSC_TESTNET]: Address('0xd7308b14BF4008e7C7196eC35610B1427C5702EA'),
  },
  [ExternalContract.QuollBribeOperator]: {
    [Network.BSC_MAINNET]: Address('0x20A62EDcE0e18683D081744b1789A614d1De6397'),
    [Network.ARBITRUM_MAINNET]: Address('0x20A62EDcE0e18683D081744b1789A614d1De6397'),
  },
  [ExternalContract.QuollVeWomProxy]: {
    [Network.ARBITRUM_MAINNET]: Address('0x277Cd4b508aFbb75d182870409bBf610AFab5c7b'),
  },
  [ExternalContract.SkimAdmin]: {
    [Network.BSC_MAINNET]: Address('0xa772b0BA6042b9416a619f6638dcfEaC4a8B31fF'),
    [Network.ARBITRUM_MAINNET]: Address('0x3ca375b8107cB2c7f520cA87b2DeF8dC5040aeb4'),
  },
  [ExternalContract.StkBNBOracle]: {
    [Network.BSC_MAINNET]: Address('0xC228CefDF841dEfDbD5B3a18dFD414cC0dbfa0D8'),
  },
  [ExternalContract.TenFiBribeOperator]: {
    [Network.BSC_MAINNET]: Address('0x393c7C3EbCBFf2c1138D123df5827e215458F0c4'),
  },
  [ExternalContract.WombexBribeOperator]: {
    [Network.BSC_MAINNET]: Address('0x35D32110d9a6f02d403061C851618756B3bC597F'),
    [Network.ARBITRUM_MAINNET]: Address('0x7429A2e8dC807c9e13Bb65edb335D6E01051aE64'),
  },
  [ExternalContract.WombexVeWomProxy]: {
    // https://arbiscan.io/address/0x24D2f6be2bF9cdf3627f720cf09D4551580C1eC1
    [Network.ARBITRUM_MAINNET]: Address('0x24D2f6be2bF9cdf3627f720cf09D4551580C1eC1'),
  },
  [ExternalContract.jUSDCOracle]: {
    // https://arbiscan.io/address/0xEE5828181aFD52655457C2793833EbD7ccFE86Ac
    [Network.ARBITRUM_MAINNET]: Address('0xEE5828181aFD52655457C2793833EbD7ccFE86Ac'),
  },
  [ExternalContract.wBETHOracle]: {
    // https://bscscan.com/address/0xa2E3356610840701BDf5611a53974510Ae27E2e1
    [Network.BSC_MAINNET]: Address('0xa2E3356610840701BDf5611a53974510Ae27E2e1'),
  },
}
