import { Address, Deployment, DeploymentOrAddress, Network, PartialRecord } from '.'
import { getNetwork } from './network'
import { getAddress } from '../utils'

// style note: sort alphabetically.
export enum Token {
  BOB,
  FXS,
  MGP,
  MIM,
  QUO,
  USDC,
  USDPlus,
  USDT,
  USDTPlus,
  WMX,
  WOM,
}

export async function getTokenAddress(token: Token): Promise<string> {
  const network = await getNetwork()
  const deploymentOrAddress = tokenRegistry[token][network]
  if (!deploymentOrAddress) {
    throw new Error(`No config found for token ${Token[token]} in network ${network}`)
  } else {
    return getAddress(deploymentOrAddress)
  }
}

// registry of token address. Used by getTokenAddress only. Do not export.
const tokenRegistry: Record<Token, PartialRecord<Network, DeploymentOrAddress>> = {
  [Token.BOB]: {
    // https://www.coingecko.com/en/coins/bob
    [Network.BSC_MAINNET]: Address('0xB0B195aEFA3650A6908f15CdaC7D92F8a5791B0B'),
    [Network.ARBITRUM_MAINNET]: Address('0xB0B195aEFA3650A6908f15CdaC7D92F8a5791B0B'),
  },
  [Token.FXS]: {
    // https://www.coingecko.com/en/coins/frax-share
    [Network.ARBITRUM_MAINNET]: Address('0x9d2f299715d94d8a7e6f5eaa8e654e8c74a988a7'),
  },
  [Token.MGP]: {
    // https://www.coingecko.com/en/coins/magpie
    [Network.BSC_MAINNET]: Address('0xd06716e1ff2e492cc5034c2e81805562dd3b45fa'),
    [Network.ARBITRUM_MAINNET]: Address('0xa61F74247455A40b01b0559ff6274441FAfa22A3'),
  },
  [Token.MIM]: {
    // https://www.coingecko.com/en/coins/magic-internet-money
    [Network.ARBITRUM_MAINNET]: Address('0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a'),
  },
  [Token.QUO]: {
    // https://www.coingecko.com/en/coins/quoll-finance
    [Network.BSC_MAINNET]: Address('0x08b450e4a48c04cdf6db2bd4cf24057f7b9563ff'),
  },
  [Token.USDC]: {
    // https://www.coingecko.com/en/coins/usd-coin
    [Network.ARBITRUM_MAINNET]: Address('0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'),
  },
  [Token.USDPlus]: {
    // https://www.coingecko.com/en/coins/usdplus
    [Network.BSC_MAINNET]: Address('0xe80772eaf6e2e18b651f160bc9158b2a5cafca65'),
    [Network.ARBITRUM_MAINNET]: Address('0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65'),
  },
  [Token.USDT]: {
    // https://www.coingecko.com/en/coins/tether
    [Network.BSC_MAINNET]: Address('0x55d398326f99059fF775485246999027B3197955'),
    [Network.ARBITRUM_MAINNET]: Address('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'),
  },
  [Token.USDTPlus]: {
    // not yet on coingecko.
    // https://bscscan.com/address/0x5335E87930b410b8C5BB4D43c3360ACa15ec0C8C
    [Network.BSC_MAINNET]: Address('0x5335E87930b410b8C5BB4D43c3360ACa15ec0C8C'),
  },
  [Token.WMX]: {
    // https://www.coingecko.com/en/coins/wombex
    [Network.BSC_MAINNET]: Address('0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD'),
    [Network.ARBITRUM_MAINNET]: Address('0x5190F06EaceFA2C552dc6BD5e763b81C73293293'),
  },
  [Token.WOM]: {
    [Network.HARDHAT]: Deployment('WombatToken'),
  },
}
