import { Address, Deployment, DeploymentOrAddress, Network, PartialRecord } from '../types'
import { getAddress } from '../utils'
import { getCurrentNetwork } from '../types/network'

// style note: sort alphabetically.
export enum Token {
  ANKR,
  ARB,
  BNBx,
  BNBy,
  BOB,
  BUSD,
  BTC,
  CUSD,
  DAI,
  DAIPlus,
  ETH,
  FRAX,
  FXS,
  HAY,
  JONES,
  MAI,
  MGP,
  MIM,
  PSTAKE,
  QI,
  QUO,
  RT1,
  RT2,
  SD,
  SPELL,
  TENFI,
  TUSD,
  UNKNOWN,
  USDC,
  USDCe,
  USDD,
  USDPlus,
  USDT,
  USDTPlus,
  WAVAX,
  WBNB,
  WETH,
  WMATIC,
  WMX,
  WOM,
  wstETH,
  ankrBNB,
  ankrETH,
  axlUSDC,
  frxETH,
  iUSD,
  jUSDC,
  mWOM,
  qWOM,
  sfrxETH,
  stkBNB,
  testFRAX,
  vUSDC,
  wBETH,
  wmxWOM,
}

export function getTokenDeploymentOrAddress(token: Token): DeploymentOrAddress {
  const network = getCurrentNetwork()
  const deploymentOrAddress = tokenRegistry[token][network]
  if (!deploymentOrAddress) {
    throw new Error(`No config found for token ${Token[token]} in network ${network}`)
  } else {
    return deploymentOrAddress
  }
}

export async function getTokenAddress(token: Token): Promise<string> {
  return getAddress(getTokenDeploymentOrAddress(token))
}

// registry of token address. Used by getTokenAddress only. Do not export.
const tokenRegistry: Record<Token, PartialRecord<Network, DeploymentOrAddress>> = {
  [Token.ANKR]: {
    // https://www.coingecko.com/en/coins/ankr-network
    [Network.BSC_MAINNET]: Address('0xf307910A4c7bbc79691fD374889b36d8531B08e3'),
    [Network.ARBITRUM_MAINNET]: Address('0x46F74778b265Df3a15EC9695CCd2fD3869ca848c'),
  },
  [Token.ARB]: {
    [Network.ARBITRUM_MAINNET]: Address('0x912CE59144191C1204E64559FE8253a0e49E6548'),
  },
  [Token.BNBx]: {
    [Network.BSC_MAINNET]: Address('0x1bdd3Cf7F79cfB8EdbB955f20ad99211551BA275'),
  },
  [Token.BNBy]: {
    // https://bscscan.com/address/0x6764506be2a755c18f4c70bDe4e63F26f9F62810
    [Network.BSC_MAINNET]: Address('0x6764506be2a755c18f4c70bDe4e63F26f9F62810'),
  },
  [Token.BOB]: {
    // https://www.coingecko.com/en/coins/bob
    [Network.BSC_MAINNET]: Address('0xB0B195aEFA3650A6908f15CdaC7D92F8a5791B0B'),
    [Network.ARBITRUM_MAINNET]: Address('0xB0B195aEFA3650A6908f15CdaC7D92F8a5791B0B'),
  },
  [Token.BUSD]: {
    [Network.HARDHAT]: Deployment('BUSD'),
    [Network.LOCALHOST]: Deployment('BUSD'),
    [Network.BSC_TESTNET]: Deployment('BUSD'),
    [Network.AVALANCHE_TESTNET]: Deployment('BUSD'),
    // https://bscscan.com/address/0xe9e7cea3dedca5984780bafc599bd69add087d56
    [Network.BSC_MAINNET]: Address('0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'),
  },
  [Token.BTC]: {
    [Network.BSC_TESTNET]: Deployment('BTC'),
    [Network.BSC_MAINNET]: Address('0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c'),
  },
  [Token.CUSD]: {
    [Network.BSC_MAINNET]: Address('0xFa4BA88Cf97e282c505BEa095297786c16070129'),
  },
  [Token.DAI]: {
    [Network.HARDHAT]: Deployment('DAI'),
    [Network.LOCALHOST]: Deployment('DAI'),
    [Network.BSC_TESTNET]: Deployment('DAI'),
    [Network.BSC_MAINNET]: Address('0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3'),
    [Network.ARBITRUM_MAINNET]: Address('0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'),
  },
  [Token.DAIPlus]: {
    [Network.ARBITRUM_MAINNET]: Address('0xeb8E93A0c7504Bffd8A8fFa56CD754c63aAeBFe8'),
  },
  [Token.ETH]: {
    [Network.BSC_TESTNET]: Deployment('ETH'),
    // https://bscscan.com/address/0x2170Ed0880ac9A755fd29B2688956BD959F933F8
    [Network.BSC_MAINNET]: Address('0x2170Ed0880ac9A755fd29B2688956BD959F933F8'),
  },
  [Token.FRAX]: {
    [Network.BSC_MAINNET]: Address('0x90C97F71E18723b0Cf0dfa30ee176Ab653E89F40'),
    [Network.ARBITRUM_MAINNET]: Address('0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F'),
  },
  [Token.FXS]: {
    // https://www.coingecko.com/en/coins/frax-share
    [Network.BSC_MAINNET]: Address('0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE'),
    [Network.ARBITRUM_MAINNET]: Address('0x9d2F299715D94d8A7E6F5eaa8E654E8c74a988A7'),
  },
  [Token.HAY]: {
    // https://www.coingecko.com/en/coins/destablecoin-hay
    [Network.BSC_MAINNET]: Address('0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5'),
  },
  [Token.JONES]: {
    // https://www.coingecko.com/en/coins/jones-dao
    [Network.ARBITRUM_MAINNET]: Address('0x10393c20975cF177a3513071bC110f7962CD67da'),
  },
  [Token.MAI]: {
    [Network.ARBITRUM_MAINNET]: Address('0x3F56e0c36d275367b8C502090EDF38289b3dEa0d'),
  },
  [Token.MGP]: {
    // https://www.coingecko.com/en/coins/magpie
    [Network.BSC_MAINNET]: Address('0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa'),
    [Network.ARBITRUM_MAINNET]: Address('0xa61F74247455A40b01b0559ff6274441FAfa22A3'),
  },
  [Token.MIM]: {
    // https://www.coingecko.com/en/coins/magic-internet-money
    [Network.BSC_MAINNET]: Address('0xfE19F0B51438fd612f6FD59C1dbB3eA319f433Ba'),
    [Network.ARBITRUM_MAINNET]: Address('0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A'),
  },
  [Token.PSTAKE]: {
    // https://www.coingecko.com/en/coins/pstake-finance
    [Network.BSC_MAINNET]: Address('0x4C882ec256823eE773B25b414d36F92ef58a7c0C'),
  },
  [Token.QI]: {
    // https://docs.mai.finance/functions/smart-contract-addresses
    [Network.ARBITRUM_MAINNET]: Address('0xB9C8F0d3254007eE4b98970b94544e473Cd610EC'),
  },
  [Token.QUO]: {
    // https://www.coingecko.com/en/coins/quoll-finance
    [Network.BSC_MAINNET]: Address('0x08b450e4a48C04CDF6DB2bD4cf24057f7B9563fF'),
    [Network.BSC_TESTNET]: Address('0x458C742849d041723EfadD9a31153233de442B9b'),
    [Network.ARBITRUM_MAINNET]: Address('0xf00D8790A76ee5A5Dbc10eaCac39151aa2af0331'),
  },
  [Token.RT1]: {
    // TestERC20
    [Network.BSC_TESTNET]: Address('0x9bbC325Eb7a7367bE610bCe614C91EF7F29c69dc'),
  },
  [Token.RT2]: {
    // TestERC20
    [Network.BSC_TESTNET]: Address('0x615F8656b763FF4A6a82B3cbBd54d392834df13F'),
  },
  [Token.SD]: {
    // https://www.coingecko.com/en/coins/stader
    [Network.BSC_MAINNET]: Address('0x3BC5AC0dFdC871B365d159f728dd1B9A0B5481E8'),
  },
  [Token.SPELL]: {
    // https://www.coingecko.com/en/coins/spell-token
    [Network.BSC_MAINNET]: Address('0x9Fe28D11ce29E340B7124C493F59607cbAB9ce48'),
    [Network.ARBITRUM_MAINNET]: Address('0x3E6648C5a70A150A88bCE65F4aD4d506Fe15d2AF'),
  },
  [Token.TENFI]: {
    // https://www.coingecko.com/en/coins/ten
    [Network.BSC_MAINNET]: Address('0xd15C444F1199Ae72795eba15E8C1db44E47abF62'),
  },
  [Token.TUSD]: {
    [Network.HARDHAT]: Deployment('TUSD'),
    [Network.LOCALHOST]: Deployment('TUSD'),
    [Network.BSC_TESTNET]: Deployment('TUSD'),
    [Network.BSC_MAINNET]: Address('0x14016E85a25aeb13065688cAFB43044C2ef86784'),
  },
  [Token.UNKNOWN]: {
    // Cannot be resolved on any network.
  },
  [Token.USDC]: {
    [Network.HARDHAT]: Deployment('USDC'),
    [Network.LOCALHOST]: Deployment('USDC'),
    [Network.BSC_TESTNET]: Deployment('USDC'),
    // https://www.coingecko.com/en/coins/usd-coin
    [Network.BSC_MAINNET]: Address('0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'),
    [Network.ARBITRUM_MAINNET]: Address('0xaf88d065e77c8cC2239327C5EDb3A432268e5831'),
    [Network.OPTIMISM_MAINNET]: Address('0x7F5c764cBc14f9669B88837ca1490cCa17c31607'),
    [Network.ETHEREUM_MAINNET]: Address('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
  },
  [Token.USDCe]: {
    [Network.ARBITRUM_MAINNET]: Address('0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'),
  },
  [Token.USDD]: {
    [Network.BSC_MAINNET]: Address('0xd17479997F34dd9156Deef8F95A52D81D265be9c'),
  },
  [Token.USDPlus]: {
    // https://www.coingecko.com/en/coins/usdplus
    [Network.BSC_MAINNET]: Address('0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65'),
    [Network.ARBITRUM_MAINNET]: Address('0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65'),
  },
  [Token.USDT]: {
    [Network.HARDHAT]: Deployment('USDT'),
    [Network.LOCALHOST]: Deployment('USDT'),
    [Network.BSC_TESTNET]: Deployment('USDT'),
    // https://www.coingecko.com/en/coins/tether
    [Network.BSC_MAINNET]: Address('0x55d398326f99059fF775485246999027B3197955'),
    [Network.ARBITRUM_MAINNET]: Address('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'),
    [Network.OPTIMISM_MAINNET]: Address('0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'),
    [Network.ETHEREUM_MAINNET]: Address('0xdAC17F958D2ee523a2206206994597C13D831ec7'),
  },
  [Token.USDTPlus]: {
    // not yet on coingecko.
    // https://bscscan.com/address/0x5335E87930b410b8C5BB4D43c3360ACa15ec0C8C
    [Network.BSC_MAINNET]: Address('0x5335E87930b410b8C5BB4D43c3360ACa15ec0C8C'),
  },
  [Token.WAVAX]: {
    [Network.AVALANCHE_TESTNET]: Address('0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3'),
  },
  [Token.WBNB]: {
    [Network.BSC_TESTNET]: Address('0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'),
    // https://www.coingecko.com/en/coins/wbnb
    [Network.BSC_MAINNET]: Address('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),
  },
  [Token.WETH]: {
    // https://arbiscan.io/token/0x82af49447d8a07e3bd95bd0d56f35241523fbab1
    [Network.ARBITRUM_MAINNET]: Address('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'),
    // https://optimistic.etherscan.io/token/0x4200000000000000000000000000000000000006
    [Network.OPTIMISM_MAINNET]: Address('0x4200000000000000000000000000000000000006'),
    // https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    [Network.ETHEREUM_MAINNET]: Address('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
  },
  [Token.WMATIC]: {
    [Network.POLYGON_MAINNET]: Address('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'),
    [Network.POLYGON_TESTNET]: Address('0x4Bab602423C8a009ca8c25eF6e3D64367789C8a9'),
  },
  [Token.WMX]: {
    // https://www.coingecko.com/en/coins/wombex
    [Network.BSC_MAINNET]: Address('0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD'),
    [Network.ARBITRUM_MAINNET]: Address('0x5190F06EaceFA2C552dc6BD5e763b81C73293293'),
  },
  [Token.WOM]: {
    // https://www.coingecko.com/en/coins/wombat-exchange
    [Network.HARDHAT]: Deployment('WombatToken'),
    [Network.LOCALHOST]: Deployment('WombatToken'),
    [Network.BSC_MAINNET]: Deployment('WombatToken'),
    [Network.ARBITRUM_MAINNET]: Address('0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96'),
    [Network.OPTIMISM_MAINNET]: Address('0xD2612B256F6f76feA8C6fbca0BF3166D0d13a668'),
    [Network.ETHEREUM_MAINNET]: Address('0xc0B314a8c08637685Fc3daFC477b92028c540CFB'),
  },
  [Token.wstETH]: {
    // https://www.coingecko.com/en/coins/wrapped-steth
    [Network.ARBITRUM_MAINNET]: Address('0x5979D7b546E38E414F7E9822514be443A4800529'),
  },
  [Token.ankrBNB]: {
    // https://bscscan.com/address/0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827
    [Network.BSC_MAINNET]: Address('0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827'),
  },
  [Token.ankrETH]: {
    // https://www.ankr.com/docs/staking-extra/staking-smart-contracts/
    [Network.BSC_MAINNET]: Address('0xe05A08226c49b636ACf99c40Da8DC6aF83CE5bB3'),
    [Network.ARBITRUM_MAINNET]: Address('0xe05A08226c49b636ACf99c40Da8DC6aF83CE5bB3'),
  },
  [Token.axlUSDC]: {
    // https://www.coingecko.com/en/coins/axelar-usdc
    [Network.BSC_MAINNET]: Address('0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3'),
  },
  [Token.frxETH]: {
    // https://docs.frax.finance/smart-contracts/frxeth-and-sfrxeth-contract-addresses
    [Network.BSC_MAINNET]: Address('0x64048A7eEcF3a2F1BA9e144aAc3D7dB6e58F555e'),
    [Network.ARBITRUM_MAINNET]: Address('0x178412e79c25968a32e89b11f63B33F733770c2A'),
  },
  [Token.stkBNB]: {
    [Network.BSC_MAINNET]: Address('0xc2E9d07F66A89c44062459A47a0D2Dc038E4fb16'),
  },
  [Token.iUSD]: {
    // https://www.coingecko.com/en/coins/izumi-bond-usd
    [Network.BSC_MAINNET]: Address('0x0A3BB08b3a15A19b4De82F8AcFc862606FB69A2D'),
  },
  [Token.jUSDC]: {
    // https://arbiscan.io/address/0xe66998533a1992ecE9eA99cDf47686F4fc8458E0
    [Network.ARBITRUM_MAINNET]: Address('0xe66998533a1992ecE9eA99cDf47686F4fc8458E0'),
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
  [Token.sfrxETH]: {
    // https://docs.frax.finance/smart-contracts/frxeth-and-sfrxeth-contract-addresses
    [Network.BSC_MAINNET]: Address('0x3Cd55356433C89E50DC51aB07EE0fa0A95623D53'),
    [Network.ARBITRUM_MAINNET]: Address('0x95aB45875cFFdba1E5f451B950bC2E42c0053f39'),
  },
  [Token.testFRAX]: {
    // TestERC20
    [Network.BSC_TESTNET]: Address('0xa5c67cD016df71f9CDCfd9e76A749a1DDca6209d'),
  },
  [Token.vUSDC]: {
    [Network.HARDHAT]: Deployment('vUSDC'),
    [Network.LOCALHOST]: Deployment('vUSDC'),
    [Network.BSC_TESTNET]: Deployment('vUSDC'),
    [Network.AVALANCHE_TESTNET]: Deployment('vUSDC'),
  },
  [Token.wBETH]: {
    // https://bscscan.com/address/0xa2E3356610840701BDf5611a53974510Ae27E2e1
    [Network.BSC_MAINNET]: Address('0xa2E3356610840701BDf5611a53974510Ae27E2e1'),
  },
  [Token.wmxWOM]: {
    // https://bscscan.com/address/0x0415023846Ff1C6016c4d9621de12b24B2402979
    [Network.BSC_MAINNET]: Address('0x0415023846Ff1C6016c4d9621de12b24B2402979'),
    // https://arbiscan.io/address/0xEfF2B1353Cdcaa2C3279C2bfdE72120c7FfB5E24
    [Network.ARBITRUM_MAINNET]: Address('0xEfF2B1353Cdcaa2C3279C2bfdE72120c7FfB5E24'),
  },
}
