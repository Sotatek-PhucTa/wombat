import { Address, Deployment, DeploymentOrAddress, Network, PartialRecord, Unknown } from '../types'
import { getAddress } from '../utils'
import { getCurrentNetwork } from '../types/network'
import { ethers } from 'hardhat'

// style note: sort alphabetically.
export enum Token {
  ANGLE,
  ANKR,
  ARB,
  BENQI,
  BNBx,
  BNBy,
  BOB,
  BTC,
  BUSD,
  CUSD,
  DAI,
  DAIPlus,
  DOLA,
  ETH,
  ETHx,
  EUROC,
  EURe,
  FIS,
  FRAX,
  FXS,
  HAY,
  HZN,
  JONES,
  MAI,
  MGP,
  MIM,
  NO_WRAPPED_NATIVE_TOKEN,
  OP,
  PENDLE,
  PNP,
  PSTAKE,
  QI,
  QUO,
  RT1,
  RT2,
  SABLE,
  sAVAX,
  SD,
  SPELL,
  SnBNB,
  TENFI,
  TUSD,
  UNKNOWN,
  USDbC,
  USDC,
  USDCe,
  USDD,
  USDPlus,
  USDS,
  USDT,
  USDTPlus,
  USDV,
  WAVAX,
  WBNB,
  WETH,
  WMATIC,
  WMX,
  WOM,
  WXDAI,
  agEUR,
  ankrBNB,
  ankrETH,
  axlUSDC,
  ePendle,
  fUSDC,
  frxETH,
  iUSD,
  jUSDC,
  mPendle,
  mWOM,
  multiANKR,
  qWOM,
  rBNB,
  sfrxETH,
  stkBNB,
  testFRAX,
  vUSDC,
  wBETH,
  wmxWOM,
  wstETH,
  xEQB,
  zBNB,
  zUSD,
}

export function getTokenDeploymentOrAddress(token: Token, network?: Network): DeploymentOrAddress {
  const networkSpecified = network !== undefined
  if (network === undefined) network = getCurrentNetwork()
  const deploymentOrAddress = tokenRegistry[token][network]
  if (!deploymentOrAddress) {
    throw new Error(`No config found for token ${Token[token]} in network ${network}`)
  } else {
    if (networkSpecified && deploymentOrAddress.type == 'deployment') {
      deploymentOrAddress.network = network
    }
    return deploymentOrAddress
  }
}

export async function getTokenAddress(token: Token): Promise<string> {
  return getAddress(getTokenDeploymentOrAddress(token))
}

// registry of token address. Used by getTokenAddress only. Do not export.
const tokenRegistry: Record<Token, PartialRecord<Network, DeploymentOrAddress>> = {
  [Token.ANGLE]: {
    // https://developers.angle.money/overview/smart-contracts/mainnet-contracts
    [Network.ETHEREUM_MAINNET]: Address('0x31429d1856aD1377A8A0079410B297e1a9e214c2'),
  },
  [Token.ANKR]: {
    // https://www.coingecko.com/en/coins/ankr-network
    [Network.BSC_MAINNET]: Address('0xf307910A4c7bbc79691fD374889b36d8531B08e3'),
    [Network.ARBITRUM_MAINNET]: Address('0xAeAeeD23478c3a4b798e4ed40D8B7F41366Ae861'),
  },
  [Token.ARB]: {
    [Network.ARBITRUM_MAINNET]: Address('0x912CE59144191C1204E64559FE8253a0e49E6548'),
  },
  [Token.BENQI]: {
    [Network.AVALANCHE_MAINNET]: Address('0x8729438EB15e2C8B576fCc6AeCdA6A148776C0F5'),
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
  [Token.BTC]: {
    [Network.BSC_TESTNET]: Deployment('BTC'),
    [Network.BSC_MAINNET]: Address('0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c'),
  },
  [Token.BUSD]: {
    [Network.HARDHAT]: Deployment('BUSD'),
    [Network.LOCALHOST]: Deployment('BUSD'),
    [Network.BSC_TESTNET]: Deployment('BUSD'),
    [Network.AVALANCHE_TESTNET]: Deployment('BUSD'),
    // https://bscscan.com/address/0xe9e7cea3dedca5984780bafc599bd69add087d56
    [Network.BSC_MAINNET]: Address('0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'),
    [Network.ZKSYNC_MAINNET]: Address('0x2039bb4116B4EFc145Ec4f0e2eA75012D6C0f181'),
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
    [Network.POLYGON_ZKEVM_MAINNET]: Address('0xC5015b9d9161Dca7e18e32f6f25C4aD850731Fd4'),
  },
  [Token.DAIPlus]: {
    [Network.ARBITRUM_MAINNET]: Address('0xeb8E93A0c7504Bffd8A8fFa56CD754c63aAeBFe8'),
  },
  [Token.DOLA]: {
    // https://optimistic.etherscan.io/address/0x8aE125E8653821E851F12A49F7765db9a9ce7384
    [Network.OPTIMISM_MAINNET]: Address('0x8aE125E8653821E851F12A49F7765db9a9ce7384'),
  },
  [Token.ETH]: {
    [Network.BSC_TESTNET]: Deployment('ETH'),
    // https://bscscan.com/address/0x2170Ed0880ac9A755fd29B2688956BD959F933F8
    [Network.BSC_MAINNET]: Address('0x2170Ed0880ac9A755fd29B2688956BD959F933F8'),
  },
  [Token.ETHx]: {
    // https://staderlabs.gitbook.io/ethereum/smart-contracts
    [Network.ETHEREUM_MAINNET]: Address('0xA35b1B31Ce002FBF2058D22F30f95D405200A15b'),
  },
  [Token.EUROC]: {
    // https://www.coingecko.com/en/coins/euro-coin
    [Network.ETHEREUM_MAINNET]: Address('0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c'),
  },
  [Token.EURe]: {
    // https://etherscan.io/address/0x3231cb76718cdef2155fc47b5286d82e6eda273f
    [Network.ETHEREUM_MAINNET]: Address('0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f'),
  },
  [Token.FIS]: {
    [Network.BSC_MAINNET]: Address('0xF4bafAEAE73a4A7C8b6479970075e91e641fB1FC'),
  },
  [Token.FRAX]: {
    // https://www.coingecko.com/en/coins/frax
    [Network.BSC_MAINNET]: Address('0x90C97F71E18723b0Cf0dfa30ee176Ab653E89F40'),
    [Network.ARBITRUM_MAINNET]: Address('0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F'),
    [Network.ETHEREUM_MAINNET]: Address('0x853d955aCEf822Db058eb8505911ED77F175b99e'),
    [Network.OPTIMISM_MAINNET]: Address('0x2E3D870790dC77A83DD1d18184Acc7439A53f475'),
  },
  [Token.FXS]: {
    // https://www.coingecko.com/en/coins/frax-share
    [Network.BSC_MAINNET]: Address('0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE'),
    [Network.ARBITRUM_MAINNET]: Address('0x9d2F299715D94d8A7E6F5eaa8E654E8c74a988A7'),
    [Network.ETHEREUM_MAINNET]: Address('0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0'),
    [Network.OPTIMISM_MAINNET]: Address('0x67CCEA5bb16181E7b4109c9c2143c24a1c2205Be'),
  },
  [Token.HAY]: {
    // https://www.coingecko.com/en/coins/destablecoin-hay
    [Network.BSC_MAINNET]: Address('0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5'),
  },
  [Token.HZN]: {
    // https://bscscan.com/address/0xc0eff7749b125444953ef89682201fb8c6a917cd
    [Network.BSC_MAINNET]: Address('0xC0eFf7749b125444953ef89682201Fb8c6A917CD'),
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
  [Token.multiANKR]: {
    // deprecated ANKR that was bridged from multichain
    [Network.ARBITRUM_MAINNET]: Address('0x46F74778b265Df3a15EC9695CCd2fD3869ca848c'),
  },
  [Token.NO_WRAPPED_NATIVE_TOKEN]: {
    // Workaround for WombatRouter because Skale doesn't have wrap native token
    [Network.SKALE_TESTNET]: Address('0x0000000000000000000000000000000000000001'),
  },
  [Token.OP]: {
    // https://www.coingecko.com/en/coins/optimism
    [Network.OPTIMISM_MAINNET]: Address('0x4200000000000000000000000000000000000042'),
  },
  [Token.PENDLE]: {
    // https://arbiscan.io/address/0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8
    [Network.ARBITRUM_MAINNET]: Address('0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8'),
  },
  [Token.PNP]: {
    // https://arbiscan.io/address/0x2Ac2B254Bc18cD4999f64773a966E4f4869c34Ee
    [Network.ARBITRUM_MAINNET]: Address('0x2Ac2B254Bc18cD4999f64773a966E4f4869c34Ee'),
  },
  [Token.PSTAKE]: {
    // https://www.coingecko.com/en/coins/pstake-finance
    [Network.BSC_MAINNET]: Address('0x4C882ec256823eE773B25b414d36F92ef58a7c0C'),
  },
  // note: not to be confused with BENQI
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
  [Token.SABLE]: {
    [Network.BSC_MAINNET]: Address('0x1eE098cBaF1f846d5Df1993f7e2d10AFb35A878d'),
    [Network.BASE_MAINNET]: Address('0xE5393cdBC4Fe7B62F1d76A990Ca7Da17ad718313'),
  },
  [Token.sAVAX]: {
    [Network.AVALANCHE_MAINNET]: Address('0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE'),
  },
  [Token.SD]: {
    // https://www.coingecko.com/en/coins/stader
    [Network.BSC_MAINNET]: Address('0x3BC5AC0dFdC871B365d159f728dd1B9A0B5481E8'),
    [Network.ETHEREUM_MAINNET]: Address('0x30D20208d987713f46DFD34EF128Bb16C404D10f'),
  },
  [Token.SPELL]: {
    // https://www.coingecko.com/en/coins/spell-token
    [Network.BSC_MAINNET]: Address('0x9Fe28D11ce29E340B7124C493F59607cbAB9ce48'),
    [Network.ARBITRUM_MAINNET]: Address('0x3E6648C5a70A150A88bCE65F4aD4d506Fe15d2AF'),
  },
  [Token.SnBNB]: {
    [Network.BSC_MAINNET]: Address('0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B'),
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
  [Token.USDbC]: {
    // https://basescan.org/address/0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca
    [Network.BASE_MAINNET]: Address('0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'),
  },
  [Token.USDC]: {
    [Network.HARDHAT]: Deployment('USDC'),
    [Network.LOCALHOST]: Deployment('USDC'),
    [Network.BSC_TESTNET]: Deployment('USDC'),
    [Network.POLYGON_TESTNET]: Deployment('USDC'),
    [Network.SKALE_TESTNET]: Deployment('USDC'),
    [Network.SCROLL_TESTNET]: Deployment('USDC'),
    [Network.ZKSYNC_TESTNET]: Deployment('USDC'),
    // https://www.coingecko.com/en/coins/usd-coin
    [Network.BSC_MAINNET]: Address('0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'),
    [Network.ARBITRUM_MAINNET]: Address('0xaf88d065e77c8cC2239327C5EDb3A432268e5831'),
    [Network.OPTIMISM_MAINNET]: Address('0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'),
    [Network.ETHEREUM_MAINNET]: Address('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
    [Network.BASE_MAINNET]: Address('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),
    [Network.AVALANCHE_MAINNET]: Address('0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E'),
    [Network.SCROLL_MAINNET]: Address('0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4'),
    [Network.GNOSIS_MAINNET]: Address('0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83'),
    [Network.POLYGON_ZKEVM_MAINNET]: Address('0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035'),
    [Network.ZKSYNC_MAINNET]: Address('0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4'),
  },
  [Token.USDCe]: {
    [Network.ARBITRUM_MAINNET]: Address('0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'),
    [Network.OPTIMISM_MAINNET]: Address('0x7F5c764cBc14f9669B88837ca1490cCa17c31607'),
    [Network.POLYGON_MAINNET]: Address('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'),
  },
  [Token.USDD]: {
    [Network.BSC_MAINNET]: Address('0xd17479997F34dd9156Deef8F95A52D81D265be9c'),
  },
  [Token.USDPlus]: {
    // https://www.coingecko.com/en/coins/usdplus
    [Network.BSC_MAINNET]: Address('0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65'),
    [Network.ARBITRUM_MAINNET]: Address('0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65'),
  },
  [Token.USDS]: {
    [Network.BSC_MAINNET]: Address('0x0c6Ed1E73BA73B8441868538E210ebD5DD240FA0'),
    [Network.BASE_MAINNET]: Address('0xecf3e9B8ccb6F4A6EFD68058FD706561c1727031'),
  },
  [Token.USDT]: {
    [Network.HARDHAT]: Deployment('USDT'),
    [Network.LOCALHOST]: Deployment('USDT'),
    [Network.BSC_TESTNET]: Deployment('USDT'),
    [Network.POLYGON_TESTNET]: Deployment('USDT'),
    [Network.SKALE_TESTNET]: Deployment('USDT'),
    [Network.SCROLL_TESTNET]: Deployment('USDT'),
    [Network.ZKSYNC_TESTNET]: Deployment('USDT'),
    // https://www.coingecko.com/en/coins/tether
    [Network.BSC_MAINNET]: Address('0x55d398326f99059fF775485246999027B3197955'),
    [Network.ARBITRUM_MAINNET]: Address('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'),
    [Network.OPTIMISM_MAINNET]: Address('0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'),
    [Network.ETHEREUM_MAINNET]: Address('0xdAC17F958D2ee523a2206206994597C13D831ec7'),
    [Network.POLYGON_MAINNET]: Address('0xc2132D05D31c914a87C6611C10748AEb04B58e8F'),
    [Network.AVALANCHE_MAINNET]: Address('0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7'),
    [Network.SCROLL_MAINNET]: Address('0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df'),
    [Network.GNOSIS_MAINNET]: Address('0x4ECaBa5870353805a9F068101A40E0f32ed605C6'),
    [Network.POLYGON_ZKEVM_MAINNET]: Address('0x1E4a5963aBFD975d8c9021ce480b42188849D41d'),
    // https://explorer.zksync.io/tokenlist
    [Network.ZKSYNC_MAINNET]: Address('0x493257fD37EDB34451f62EDf8D2a0C418852bA4C'),
  },
  [Token.USDTPlus]: {
    // not yet on coingecko.
    // https://bscscan.com/address/0x5335E87930b410b8C5BB4D43c3360ACa15ec0C8C
    [Network.BSC_MAINNET]: Address('0x5335E87930b410b8C5BB4D43c3360ACa15ec0C8C'),
  },
  [Token.USDV]: {
    // https://docs.usdv.money/docs/contracts/mainnet
    [Network.OPTIMISM_MAINNET]: Address('0x323665443CEf804A3b5206103304BD4872EA4253'),
    [Network.ETHEREUM_MAINNET]: Address('0x0E573Ce2736Dd9637A0b21058352e1667925C7a8'),
    [Network.BSC_MAINNET]: Address('0x323665443CEf804A3b5206103304BD4872EA4253'),
    [Network.AVALANCHE_MAINNET]: Address('0x323665443CEf804A3b5206103304BD4872EA4253'),
    [Network.ARBITRUM_MAINNET]: Address('0x323665443CEf804A3b5206103304BD4872EA4253'),
  },
  [Token.WAVAX]: {
    [Network.AVALANCHE_TESTNET]: Address('0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3'),
    // https://snowtrace.io/address/0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7
    [Network.AVALANCHE_MAINNET]: Address('0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'),
  },
  [Token.WBNB]: {
    [Network.BSC_TESTNET]: Address('0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'),
    // https://www.coingecko.com/en/coins/wbnb
    [Network.BSC_MAINNET]: Address('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),
  },
  [Token.WETH]: {
    // https://sepolia-blockscout.scroll.io/address/0x5300000000000000000000000000000000000004
    [Network.SCROLL_TESTNET]: Address('0x5300000000000000000000000000000000000004'),
    // https://goerli.explorer.zksync.io/address/0x20b28B1e4665FFf290650586ad76E977EAb90c5D
    [Network.ZKSYNC_TESTNET]: Address('0x20b28B1e4665FFf290650586ad76E977EAb90c5D'),
    // https://arbiscan.io/token/0x82af49447d8a07e3bd95bd0d56f35241523fbab1
    [Network.ARBITRUM_MAINNET]: Address('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'),
    // https://optimistic.etherscan.io/token/0x4200000000000000000000000000000000000006
    [Network.OPTIMISM_MAINNET]: Address('0x4200000000000000000000000000000000000006'),
    // https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    [Network.ETHEREUM_MAINNET]: Address('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
    // https://basescan.org/token/0x4200000000000000000000000000000000000006
    [Network.BASE_MAINNET]: Address('0x4200000000000000000000000000000000000006'),
    // https://scrollscan.com/address/0x5300000000000000000000000000000000000004
    [Network.SCROLL_MAINNET]: Address('0x5300000000000000000000000000000000000004'),
    // https://explorer.zksync.io/address/0x5aea5775959fbc2557cc8789bc1bf90a239d9a91#contract
    [Network.ZKSYNC_MAINNET]: Address('0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91'),
    // https://zkevm.polygonscan.com/address/0x4f9a0e7fd2bf6067db6994cf12e4495df938e6e9
    [Network.POLYGON_ZKEVM_MAINNET]: Address('0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9'),
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
    [Network.BSC_TESTNET]: Deployment('WombatToken'),
    [Network.BSC_MAINNET]: Deployment('WombatToken'),
    [Network.AVALANCHE_TESTNET]: Deployment('WombatToken'),
    [Network.POLYGON_TESTNET]: Deployment('WombatToken'),
    [Network.SKALE_TESTNET]: Deployment('WombatToken'),
    [Network.SCROLL_TESTNET]: Deployment('WombatToken'),
    [Network.POLYGON_MAINNET]: Address('0x77749d37A87BFf80060c00152B213F61341A6de5'),
    [Network.BASE_MAINNET]: Address('0xD9541B08B375D58ae104EC247d7443D2D7235D64'),
    [Network.AVALANCHE_MAINNET]: Address('0xa15E4544D141aa98C4581a1EA10Eb9048c3b3382'),
    [Network.ZKSYNC_TESTNET]: Address(ethers.constants.AddressZero),
    [Network.ARBITRUM_MAINNET]: Address('0x7B5EB3940021Ec0e8e463D5dBB4B7B09a89DDF96'),
    [Network.OPTIMISM_MAINNET]: Address('0xD2612B256F6f76feA8C6fbca0BF3166D0d13a668'),
    [Network.ETHEREUM_MAINNET]: Address('0xc0B314a8c08637685Fc3daFC477b92028c540CFB'),
    [Network.SCROLL_MAINNET]: Address(ethers.constants.AddressZero),
    [Network.GNOSIS_MAINNET]: Address(ethers.constants.AddressZero),
    [Network.POLYGON_ZKEVM_MAINNET]: Address(ethers.constants.AddressZero),
    [Network.ZKSYNC_MAINNET]: Address(ethers.constants.AddressZero),
  },
  [Token.WXDAI]: {
    [Network.GNOSIS_MAINNET]: Address('0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d'),
  },
  [Token.agEUR]: {
    // https://developers.angle.money/overview/smart-contracts/mainnet-contracts
    [Network.ETHEREUM_MAINNET]: Address('0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8'),
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
    [Network.BSC_TESTNET]: Deployment('axlUSDC'),
    [Network.POLYGON_TESTNET]: Deployment('axlUSDC'),
    // https://www.coingecko.com/en/coins/axelar-usdc
    [Network.BSC_MAINNET]: Address('0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3'),
  },
  [Token.ePendle]: {
    // https://arbiscan.io/address/0xd4848211b699503c772aa1bc7d33b433c4242ac3
    [Network.ARBITRUM_MAINNET]: Address('0xd4848211B699503C772aA1Bc7D33b433C4242Ac3'),
  },
  [Token.fUSDC]: {
    // https://arbiscan.io/address/0x4cfa50b7ce747e2d61724fcac57f24b748ff2b2a
    [Network.ARBITRUM_MAINNET]: Address('0x4CFA50B7Ce747e2D61724fcAc57f24B748FF2b2A'),
  },
  [Token.frxETH]: {
    // https://docs.frax.finance/smart-contracts/frxeth-and-sfrxeth-contract-addresses
    [Network.BSC_MAINNET]: Address('0x64048A7eEcF3a2F1BA9e144aAc3D7dB6e58F555e'),
    [Network.ARBITRUM_MAINNET]: Address('0x178412e79c25968a32e89b11f63B33F733770c2A'),
    [Network.ETHEREUM_MAINNET]: Address('0x5E8422345238F34275888049021821E8E08CAa1f'),
    [Network.OPTIMISM_MAINNET]: Address('0x6806411765Af15Bddd26f8f544A34cC40cb9838B'),
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
  [Token.mPendle]: {
    // https://arbiscan.io/address/0xB688BA096b7Bb75d7841e47163Cd12D18B36A5bF
    [Network.ARBITRUM_MAINNET]: Address('0xB688BA096b7Bb75d7841e47163Cd12D18B36A5bF'),
  },
  [Token.mWOM]: {
    // https://bscscan.com/address/0x027a9d301FB747cd972CFB29A63f3BDA551DFc5c
    [Network.BSC_MAINNET]: Address('0x027a9d301FB747cd972CFB29A63f3BDA551DFc5c'),
    // https://arbiscan.io/address/0x509FD25EE2AC7833a017f17Ee8A6Fb4aAf947876
    [Network.ARBITRUM_MAINNET]: Address('0x509FD25EE2AC7833a017f17Ee8A6Fb4aAf947876'),
    [Network.ETHEREUM_MAINNET]: Address('0xca9Fb45f6600ee6e47E73666A6B7Dd407d131F96'),
  },
  [Token.qWOM]: {
    // https://bscscan.com/address/0x0fE34B8aaAf3f522A6088E278936D10F934c0b19
    [Network.BSC_MAINNET]: Address('0x0fE34B8aaAf3f522A6088E278936D10F934c0b19'),
    // https://arbiscan.io/address/0x388D157F0BFdc1d30357AF63a8be10BfF8474f4e
    [Network.ARBITRUM_MAINNET]: Address('0x388D157F0BFdc1d30357AF63a8be10BfF8474f4e'),
  },
  [Token.rBNB]: {
    // https://bscscan.com/address/0xF027E525D491ef6ffCC478555FBb3CFabB3406a6
    [Network.BSC_MAINNET]: Address('0xF027E525D491ef6ffCC478555FBb3CFabB3406a6'),
  },
  [Token.sfrxETH]: {
    // https://docs.frax.finance/smart-contracts/frxeth-and-sfrxeth-contract-addresses
    [Network.BSC_MAINNET]: Address('0x3Cd55356433C89E50DC51aB07EE0fa0A95623D53'),
    [Network.ARBITRUM_MAINNET]: Address('0x95aB45875cFFdba1E5f451B950bC2E42c0053f39'),
    [Network.ETHEREUM_MAINNET]: Address('0xac3E018457B222d93114458476f3E3416Abbe38F'),
    [Network.OPTIMISM_MAINNET]: Address('0x484c2D6e3cDd945a8B2DF735e079178C1036578c'),
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
    [Network.ETHEREUM_MAINNET]: Address('0xEfF2B1353Cdcaa2C3279C2bfdE72120c7FfB5E24'),
  },
  [Token.wstETH]: {
    // https://www.coingecko.com/en/coins/wrapped-steth
    [Network.ARBITRUM_MAINNET]: Address('0x5979D7b546E38E414F7E9822514be443A4800529'),
    [Network.ETHEREUM_MAINNET]: Address('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0'),
  },
  [Token.xEQB]: {
    // https://arbiscan.io/address/0x96C4A48Abdf781e9c931cfA92EC0167Ba219ad8E
    [Network.ARBITRUM_MAINNET]: Address('0x96C4A48Abdf781e9c931cfA92EC0167Ba219ad8E'),
  },
  [Token.zBNB]: {
    // https://bscscan.com/address/0x6DEdCEeE04795061478031b1DfB3c1ddCA80B204
    [Network.BSC_MAINNET]: Address('0x6DEdCEeE04795061478031b1DfB3c1ddCA80B204'),
  },
  [Token.zUSD]: {
    // https://bscscan.com/address/0xF0186490B18CB74619816CfC7FeB51cdbe4ae7b9
    [Network.BSC_MAINNET]: Address('0xF0186490B18CB74619816CfC7FeB51cdbe4ae7b9'),
  },
}
