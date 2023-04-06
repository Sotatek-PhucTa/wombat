import { Address, Deployment, DeploymentOrAddress, Network, PartialRecord } from '..'
import { getAddress } from '../../utils'
import { getCurrentNetwork } from '../network'

// style note: sort alphabetically.
export enum Token {
  BOB,
  FXS,
  HAY,
  MGP,
  MIM,
  PSTAKE,
  QI,
  QUO,
  RT1, // TestERC20
  RT2, // TestERC20
  SD,
  SPELL,
  USDC,
  USDPlus,
  USDT,
  USDTPlus,
  WETH,
  WMX,
  WOM,
  frxETH,
  iUSD,
  mWOM,
  qWOM,
  axlUSDC,
  testFRAX, // TestERC20
  vUSDC,
  wmxWOM,
}

export async function getTokenAddress(token: Token): Promise<string> {
  const network = await getCurrentNetwork()
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
  [Token.HAY]: {
    // https://www.coingecko.com/en/coins/destablecoin-hay
    [Network.BSC_MAINNET]: Address('0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5'),
  },
  [Token.MGP]: {
    // https://www.coingecko.com/en/coins/magpie
    [Network.BSC_MAINNET]: Address('0xd06716e1ff2e492cc5034c2e81805562dd3b45fa'),
    [Network.ARBITRUM_MAINNET]: Address('0xa61F74247455A40b01b0559ff6274441FAfa22A3'),
  },
  [Token.MIM]: {
    // https://www.coingecko.com/en/coins/magic-internet-money
    [Network.BSC_MAINNET]: Address('0xfe19f0b51438fd612f6fd59c1dbb3ea319f433ba'),
    [Network.ARBITRUM_MAINNET]: Address('0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a'),
  },
  [Token.PSTAKE]: {
    // https://www.coingecko.com/en/coins/pstake-finance
    [Network.BSC_MAINNET]: Address('0x4C882ec256823eE773B25b414d36F92ef58a7c0C'),
  },
  [Token.QI]: {
    // https://docs.mai.finance/functions/smart-contract-addresses
    [Network.ARBITRUM_MAINNET]: Address('0xb9c8f0d3254007ee4b98970b94544e473cd610ec'),
  },
  [Token.QUO]: {
    // https://www.coingecko.com/en/coins/quoll-finance
    [Network.BSC_MAINNET]: Address('0x08b450e4a48c04cdf6db2bd4cf24057f7b9563ff'),
    [Network.BSC_TESTNET]: Address('0x458c742849d041723efadd9a31153233de442b9b'),
    [Network.ARBITRUM_MAINNET]: Address('0xf00D8790A76ee5A5Dbc10eaCac39151aa2af0331'),
  },
  [Token.RT1]: {
    // TestERC20
    [Network.BSC_TESTNET]: Address('0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc'),
  },
  [Token.RT2]: {
    // TestERC20
    [Network.BSC_TESTNET]: Address('0x615f8656b763ff4a6a82b3cbbd54d392834df13f'),
  },
  [Token.SD]: {
    // https://www.coingecko.com/en/coins/stader
    [Network.BSC_MAINNET]: Address('0x3BC5AC0dFdC871B365d159f728dd1B9A0B5481E8'),
  },
  [Token.SPELL]: {
    // https://www.coingecko.com/en/coins/spell-token
    [Network.BSC_MAINNET]: Address('0x9Fe28D11ce29E340B7124C493F59607cbAB9ce48'),
    [Network.ARBITRUM_MAINNET]: Address('0x3e6648c5a70a150a88bce65f4ad4d506fe15d2af'),
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
  [Token.WETH]: {
    // https://arbiscan.io/token/0x82af49447d8a07e3bd95bd0d56f35241523fbab1
    [Network.ARBITRUM_MAINNET]: Address('0x82af49447d8a07e3bd95bd0d56f35241523fbab1'),
  },
  [Token.WMX]: {
    // https://www.coingecko.com/en/coins/wombex
    [Network.BSC_MAINNET]: Address('0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD'),
    [Network.ARBITRUM_MAINNET]: Address('0x5190F06EaceFA2C552dc6BD5e763b81C73293293'),
  },
  [Token.WOM]: {
    // https://www.coingecko.com/en/coins/wombat-exchange
    [Network.HARDHAT]: Deployment('WombatToken'),
    [Network.ARBITRUM_MAINNET]: Address('0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96'),
  },
  [Token.frxETH]: {
    // https://arbiscan.io/token/0x178412e79c25968a32e89b11f63b33f733770c2a
    [Network.ARBITRUM_MAINNET]: Address('0x178412e79c25968a32e89b11f63b33f733770c2a'),
  },
  [Token.iUSD]: {
    // https://www.coingecko.com/en/coins/izumi-bond-usd
    [Network.BSC_MAINNET]: Address('0x0A3BB08b3a15A19b4De82F8AcFc862606FB69A2D'),
  },
  [Token.mWOM]: {
    // https://bscscan.com/address/0x027a9d301FB747cd972CFB29A63f3BDA551DFc5c
    [Network.BSC_MAINNET]: Address('0x027a9d301FB747cd972CFB29A63f3BDA551DFc5c'),
    // https://arbiscan.io/address/0x509FD25EE2AC7833a017f17Ee8A6Fb4aAf947876
    [Network.ARBITRUM_MAINNET]: Address('0x509FD25EE2AC7833a017f17Ee8A6Fb4aAf947876'),
  },
  [Token.qWOM]: {
    // https://bscscan.com/address/0x0fE34B8aaAf3f522A6088E278936D10F934c0b19
    [Network.BSC_MAINNET]: Address('0x0fE34B8aaAf3f522A6088E278936D10F934c0b19'),
    // https://arbiscan.io/address/0x388D157F0BFdc1d30357AF63a8be10BfF8474f4e
    [Network.ARBITRUM_MAINNET]: Address('0x388D157F0BFdc1d30357AF63a8be10BfF8474f4e'),
  },
  [Token.axlUSDC]: {
    // https://www.coingecko.com/en/coins/axelar-usdc
    [Network.BSC_MAINNET]: Address('0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3'),
  },
  [Token.testFRAX]: {
    // TestERC20
    [Network.BSC_TESTNET]: Address('0xa5c67cD016df71f9CDCfd9e76A749a1DDca6209d'),
  },
  [Token.vUSDC]: {
    [Network.HARDHAT]: Deployment('vUSDC'),
  },
  [Token.wmxWOM]: {
    // https://bscscan.com/address/0x0415023846Ff1C6016c4d9621de12b24B2402979
    [Network.BSC_MAINNET]: Address('0x0415023846Ff1C6016c4d9621de12b24B2402979'),
    // https://arbiscan.io/address/0xEfF2B1353Cdcaa2C3279C2bfdE72120c7FfB5E24
    [Network.ARBITRUM_MAINNET]: Address('0xEfF2B1353Cdcaa2C3279C2bfdE72120c7FfB5E24'),
  },
}
