import { parseEther, parseUnits } from 'ethers/lib/utils'
import { Address, Deployment, IRewarder, Network, TokenMap, Unknown } from '../types'
import { ExternalContract } from './contract'
import { convertTokenPerEpochToTokenPerSec } from './emission'
import { Epochs } from './epoch'
import { Token } from './token'
import { getCurrentNetwork } from '../types/network'
import assert from 'assert'

export function getRewarders(): TokenMap<IRewarder> {
  const network = getCurrentNetwork()
  return REWARDERS_MAP[network]
}

export function getBribes(): TokenMap<IRewarder> {
  const network = getCurrentNetwork()
  return BRIBE_MAPS[network]
}

// Private. Do not export.
const REWARDERS_MAP: Record<Network, TokenMap<IRewarder>> = {
  [Network.HARDHAT]: {
    ...createRewarderForDeployedAsset('Asset_MainPool_BUSD', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [parseEther('100')],
    }),
    ...createRewarderForDeployedAsset('Asset_MainPool_USDT', {
      rewardTokens: [Token.USDT, Token.WOM],
      tokenPerSec: [parseEther('12.3'), parseEther('100')],
    }),
  },
  [Network.BSC_MAINNET]: {
    HAY: {
      ...defaultRewarder(),
      lpToken: Address('0x1fa71DF4b344ffa5755726Ea7a9a56fbbEe0D38b'),
      rewardTokens: [Token.HAY],
      startTimestamp: 1674021600,
      tokenPerSec: [parseEther('0.005708').toBigInt()],
    },
    wmxWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x3C42E4F84573aB8c88c8E479b7dC38A7e678D688'),
      rewardTokens: [Token.WMX],
      startTimestamp: 1674021600,
      tokenPerSec: [parseEther('0.027').toBigInt()],
    },
    wmxWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xF9BdC872D75f76B946E0770f96851b1f2F653caC'),
      rewardTokens: [Token.WMX],
      startTimestamp: 1674021600,
      tokenPerSec: [parseEther('0.0116').toBigInt()],
    },
    mWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x1f502fF26dB12F8e41B373f36Dc0ABf2D7F6723E'),
      rewardTokens: [Token.MGP],
      startTimestamp: 1674021600,
      tokenPerSec: [parseEther('0.375').toBigInt()],
    },
    mWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xEABa290B154aF45DE72FDf2a40E56349e4E68AC2'),
      rewardTokens: [Token.MGP],
      startTimestamp: 1674021600,
      tokenPerSec: [parseEther('0.075').toBigInt()],
    },
    qWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x87073ba87517E7ca981AaE3636754bCA95C120E4'),
      rewardTokens: [Token.QUO],
      startTimestamp: 1674021600,
      tokenPerSec: [parseEther('0.13').toBigInt()],
    },
    qWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xB5c9368545A26b91d5f7340205e5d9559f48Bcf8'),
      rewardTokens: [Token.QUO],
      startTimestamp: 1674021600,
      tokenPerSec: [parseEther('0.1').toBigInt()],
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: Address('0x16B37225889A038FAD42efdED462821224A509A7'),
      rewardTokens: [Token.WOM],
    },
    BnbxPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0x0321D1D769cc1e81Ba21a157992b635363740f86'),
      rewardTokens: [Token.WOM],
    },
    stkBnb: {
      ...defaultRewarder(),
      lpToken: Address('0x0E202A0bCad2712d1fdeEB94Ec98C58bEeD0679f'),
      rewardTokens: [Token.WOM],
    },
    StkBnbPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0x6C7B407411b3DB90DfA25DA4aA66605438D378CE'),
      rewardTokens: [Token.WOM],
    },
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_ETH', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [0],
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_frxETH', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('3738'))],
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_sfrxETH', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [0],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_FRAX', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('11215'))],
    }),
    ...createRewarderForDeployedAsset('Asset_qWOMPool_WOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.QUO],
      operator: ExternalContract.QuollBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_qWOMPool_qWOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.QUO],
      operator: ExternalContract.QuollBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_mWOMPool_WOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.MGP],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_mWOMPool_mWOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.MGP],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_wmxWOMPool_WOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.WMX],
      operator: ExternalContract.WombexBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_wmxWOMPool_wmxWOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.WMX],
      operator: ExternalContract.WombexBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_wBETH_Pool_wBETH', {
      rewardTokens: [Token.WOM],
    }),
    ...createRewarderForDeployedAsset('Asset_wBETH_Pool_ETH', {
      rewardTokens: [Token.WOM],
    }),
    ...createRewarderForDeployedAsset('Asset_stables_01_FRAX', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('2355'))],
    }),
    ...createRewarderForDeployedAsset('Asset_BNBy_Pool_WBNB', {
      rewardTokens: [Token.TENFI],
      operator: ExternalContract.TenFiBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_BNBy_Pool_BNBy', {
      rewardTokens: [Token.TENFI],
      operator: ExternalContract.TenFiBribeOperator,
    }),
  },
  [Network.BSC_TESTNET]: {
    BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0xA1a8d6688A2DEF14d6bD3A76E3AA2bdB5670C567'),
      rewardTokens: [Token.RT1],
      tokenPerSec: [parseEther('0.1').toBigInt()],
    },
    USDC: {
      ...defaultRewarder(),
      lpToken: Address('0x61ABD791773a7E583aD439F558C6c0F157707e7b'),
      rewardTokens: [Token.RT2],
      tokenPerSec: [parseUnits('0.035', 8).toBigInt()],
    },
    FRAX_BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x0d3dBc403d121eB53d14E2FE2a98e78CA3E17c44'),
      rewardTokens: [Token.testFRAX],
      tokenPerSec: [parseUnits('0.035', 8).toBigInt()],
    },
    FRAX: {
      ...defaultRewarder(),
      lpToken: Address('0xc5f2B1df25B9Bfc61444b002121330bEa9460F3e'),
      rewardTokens: [Token.testFRAX],
      tokenPerSec: [parseUnits('0.035', 8).toBigInt()],
    },
    wWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x505b0159871F86Ae0F4512BB52dB5030E31E2459'),
      rewardTokens: [Token.RT1],
      tokenPerSec: [parseUnits('0.00035', 18).toBigInt()],
    },
    qWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x22056C9F7e8033BBea9F32b903a0ECF8a7Ea0bC7'),
      rewardTokens: [Token.QUO],
      tokenPerSec: [parseUnits('0.09', 18).toBigInt()],
    },
    qWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0x82e5314DfdA9aD1a7F594B7D0b5D6b13459f4826'),
      rewardTokens: [Token.QUO],
      tokenPerSec: [parseUnits('0.14', 18).toBigInt()],
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: Address('0xB9207cc7bEaFb74773Cd08C869d6F6f890105564'),
      rewardTokens: [Token.RT1],
    },
    BnbxPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0xC0aFB4E0f2A11E2a74F168904F47178865b728ba'),
      rewardTokens: [Token.RT1],
    },
  },
  [Network.ARBITRUM_MAINNET]: {
    ...createRewarderForDeployedAsset('Asset_FRAX_Pool_USDC', {
      rewardTokens: [Token.WOM],
    }),
    ...createRewarderForDeployedAsset('Asset_USDPlus_Pool_USDCe', {
      rewardTokens: [Token.WOM],
    }),
    ...createRewarderForDeployedAsset('Asset_qWOM_Pool_WOM', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.QUO],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('40000'))],
      operator: ExternalContract.QuollBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_qWOM_Pool_qWOM', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.QUO],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('60000'))],
      operator: ExternalContract.QuollBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_mWOM_Pool_WOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.MGP],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_mWOM_Pool_mWOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.MGP],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_wmxWOM_Pool_WOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.WMX],
      operator: ExternalContract.WombexBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_wmxWOM_Pool_wmxWOM', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.WMX],
      operator: ExternalContract.WombexBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_WstETH_Pool_WETH', {
      rewardTokens: [Token.ARB],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('500'))],
    }),
    ...createRewarderForDeployedAsset('Asset_WstETH_Pool_wstETH', {
      rewardTokens: [Token.ARB],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('2000'))],
    }),
    ...createRewarderForDeployedAsset('Asset_mPendle_Pool_PENDLE', {
      rewardTokens: [Token.USDC, Token.PNP],
      tokenPerSec: [0, 0],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_mPendle_Pool_mPendle', {
      rewardTokens: [Token.USDC, Token.PNP],
      tokenPerSec: [0, 0],
      operator: ExternalContract.MagpieBribeOperator,
    }),
  },
  [Network.LOCALHOST]: {},
  [Network.POLYGON_MAINNET]: {},
  [Network.POLYGON_TESTNET]: {},
  [Network.AVALANCHE_TESTNET]: {},
  [Network.ARBITRUM_TESTNET]: {},
  [Network.OPTIMISM_MAINNET]: {},
  [Network.OPTIMISM_TESTNET]: {},
  [Network.ETHEREUM_MAINNET]: {},
}

// Private. Do not export.
const BRIBE_MAPS: Record<Network, TokenMap<IRewarder>> = {
  [Network.HARDHAT]: {
    ...createRewarderForDeployedAsset('Asset_MainPool_BUSD', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [parseEther('100')],
    }),
    ...createRewarderForDeployedAsset('Asset_MainPool_USDT', {
      rewardTokens: [Token.USDT, Token.BUSD, Token.WOM],
      tokenPerSec: [parseEther('12.3'), parseEther('3.45'), parseEther('100')],
    }),
  },
  [Network.BSC_MAINNET]: {
    HAY: {
      ...defaultRewarder(),
      lpToken: Address('0x1fa71DF4b344ffa5755726Ea7a9a56fbbEe0D38b'),
      rewardTokens: [Token.HAY],
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: Address('0x16B37225889A038FAD42efdED462821224A509A7'),
      rewardTokens: [Token.SD],
    },
    BnbxPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0x0321D1D769cc1e81Ba21a157992b635363740f86'),
      rewardTokens: [Token.SD],
    },
    stkBnb: {
      ...defaultRewarder(),
      lpToken: Address('0x0E202A0bCad2712d1fdeEB94Ec98C58bEeD0679f'),
      rewardTokens: [Token.PSTAKE],
    },
    StkBnbPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0x6C7B407411b3DB90DfA25DA4aA66605438D378CE'),
      rewardTokens: [Token.PSTAKE],
    },
    wmxWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x3C42E4F84573aB8c88c8E479b7dC38A7e678D688'),
      rewardTokens: [Token.WMX],
    },
    wmxWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xF9BdC872D75f76B946E0770f96851b1f2F653caC'),
      rewardTokens: [Token.WMX],
    },
    mWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x1f502fF26dB12F8e41B373f36Dc0ABf2D7F6723E'),
      rewardTokens: [Token.MGP],
    },
    mWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xEABa290B154aF45DE72FDf2a40E56349e4E68AC2'),
      rewardTokens: [Token.MGP],
    },
    qWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x87073ba87517E7ca981AaE3636754bCA95C120E4'),
      rewardTokens: [Token.QUO],
    },
    qWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xB5c9368545A26b91d5f7340205e5d9559f48Bcf8'),
      rewardTokens: [Token.QUO],
    },
    IUSDPool_iUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x3A29dF144bB54A8bF3d20357c116befa7adE962d'),
      rewardTokens: [Token.iUSD],
    },
    IUSDPool_BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x7Ff1AEc17ea060BBcB7dF6b8723F6Ea7fc905E8F'),
      rewardTokens: [Token.iUSD],
    },
    AxlUsdcPool_axlUSDC: {
      ...defaultRewarder(),
      lpToken: Address('0x77F645Ee0c6d47380A942B04B8151fD542927391'),
      rewardTokens: [Token.axlUSDC],
    },
    AxlUsdcPool_BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x791b2424df9865994Ad570425278902E2B5D7946'),
      rewardTokens: [Token.axlUSDC],
    },
    BOBPool_BOB: {
      ...defaultRewarder(),
      lpToken: Address('0x4968E21be7Bb0ced1bd3859d3dB993ad3a05d2E6'),
      rewardTokens: [Token.BOB],
    },
    BOBPool_USDC: {
      ...defaultRewarder(),
      lpToken: Address('0x6b98d2B6ed0131338C7945Db8588DA43323d1b8C'),
      rewardTokens: [Token.BOB],
    },
    frxETH: {
      ...defaultRewarder(),
      lpToken: Address('0xd67EdEA100AdC2Aa8ae0b5CEe7bF420ee17E5bB9'),
      rewardTokens: [Token.FXS],
    },
    frxETHPool_WETH: {
      ...defaultRewarder(),
      lpToken: Address('0xb268c3181921747379271B9BFfCE8B16311656e3'),
      rewardTokens: [Token.FXS],
    },
    frxETH_Pool_ETH: {
      ...defaultRewarder(),
      lpToken: Address('0x4d41E9EDe1783b85756D3f5Bd136C50c4Fb8E67E'),
      rewardTokens: [Token.FXS],
    },
    frax: {
      ...defaultRewarder(),
      lpToken: Address('0x47aB513f97e1CC7D7d1a4DB4563F1a0fa5C371EB'),
      rewardTokens: [Token.FXS],
    },
    ...createRewarderForDeployedAsset('Asset_MIM_Pool_MIM', {
      rewardTokens: [Token.SPELL],
    }),
    ...createRewarderForDeployedAsset('Asset_MIM_Pool_USDT', {
      rewardTokens: [Token.SPELL],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_USD+', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseUnits('600', 6))],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_USDT+', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseUnits('600', 6))],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_USDC', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseUnits('300', 6))],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_CUSD', {
      rewardTokens: [Token.WOM],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_HAY', {
      rewardTokens: [Token.WOM],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_FRAX', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.FXS],
      operator: ExternalContract.FraxBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_AnkrBNBPool_WBNB', {
      rewardTokens: [Token.ANKR],
      startTimestamp: Epochs.Apr12,
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_AnkrBNBPool_ankrBNB', {
      rewardTokens: [Token.ANKR],
      startTimestamp: Epochs.Apr12,
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_sfrxETH', {
      startTimestamp: Epochs.Apr19,
      rewardTokens: [Token.FXS],
      operator: ExternalContract.FraxBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_BNBy_Pool_WBNB', {
      startTimestamp: Epochs.Apr19,
      rewardTokens: [Token.TENFI],
      operator: ExternalContract.TenFiBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_BNBy_Pool_BNBy', {
      startTimestamp: Epochs.Apr19,
      rewardTokens: [Token.TENFI],
      operator: ExternalContract.TenFiBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_ankrETH_Pool_ETH', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.ANKR],
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_ankrETH_Pool_ankrETH', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.ANKR],
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_HAY_Pool_HAY', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.HAY],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('1000'))],
    }),
    ...createRewarderForDeployedAsset('Asset_HAY_Pool_USDC', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.HAY],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('1000'))],
    }),
    ...createRewarderForDeployedAsset('Asset_HAY_Pool_USDT', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.HAY],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('1000'))],
    }),
    ...createRewarderForDeployedAsset('Asset_wBETH_Pool_wBETH', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.wBETH],
    }),
    ...createRewarderForDeployedAsset('Asset_wBETH_Pool_ETH', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.wBETH],
    }),
  },
  [Network.BSC_TESTNET]: {
    BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0xA1a8d6688A2DEF14d6bD3A76E3AA2bdB5670C567'),
      rewardTokens: [Token.RT1],
      tokenPerSec: [parseEther('0.1').toBigInt()],
    },
    FRAX_BUSD: {
      ...defaultRewarder(),
      lpToken: Address('0x0d3dBc403d121eB53d14E2FE2a98e78CA3E17c44'),
      rewardTokens: [Token.RT1],
      tokenPerSec: [parseEther('0.1').toBigInt()],
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: Address('0xB9207cc7bEaFb74773Cd08C869d6F6f890105564'),
      rewardTokens: [Token.RT1],
    },
  },
  [Network.ARBITRUM_MAINNET]: {
    ...createRewarderForDeployedAsset('Asset_USDPlus_Pool_USD+', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseUnits('6500', 6))],
    }),
    ...createRewarderForDeployedAsset('Asset_USDPlus_Pool_DAI+', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseUnits('3500', 6))],
    }),
    ...createRewarderForDeployedAsset('Asset_USDPlus_Pool_USDCe', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus],
    }),
    ...createRewarderForDeployedAsset('Asset_MIM_Pool_MIM', {
      rewardTokens: [Token.SPELL],
    }),
    ...createRewarderForDeployedAsset('Asset_MIM_Pool_USDT', {
      rewardTokens: [Token.SPELL],
    }),
    ...createRewarderForDeployedAsset('Asset_FRAX_Pool_FRAX', {
      rewardTokens: [Token.FXS],
    }),
    ...createRewarderForDeployedAsset('Asset_FRAX_Pool_MAI', {
      rewardTokens: [Token.QI],
    }),
    ...createRewarderForDeployedAsset('Asset_FRAX_Pool_USD+', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseUnits('1000', 6))],
    }),
    ...createRewarderForDeployedAsset('Asset_BOB_Pool_BOB', {
      rewardTokens: [Token.BOB],
    }),
    ...createRewarderForDeployedAsset('Asset_BOB_Pool_USDCe', {
      rewardTokens: [Token.BOB],
    }),
    ...createRewarderForDeployedAsset('Asset_mWOM_Pool_mWOM', {
      rewardTokens: [Token.MGP, Token.USDC],
      tokenPerSec: [0n, 0n],
    }),
    ...createRewarderForDeployedAsset('Asset_mWOM_Pool_WOM', {
      rewardTokens: [Token.MGP, Token.USDC],
      tokenPerSec: [0n, 0n],
    }),
    ...createRewarderForDeployedAsset('Asset_wmxWOM_Pool_wmxWOM', {
      rewardTokens: [Token.WMX],
    }),
    ...createRewarderForDeployedAsset('Asset_wmxWOM_Pool_WOM', {
      rewardTokens: [Token.WMX],
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_frxETH', {
      rewardTokens: [Token.FXS],
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_WETH', {
      rewardTokens: [Token.FXS],
    }),
    ...createRewarderForDeployedAsset('Asset_qWOM_Pool_qWOM', {
      rewardTokens: [Token.QUO],
    }),
    ...createRewarderForDeployedAsset('Asset_qWOM_Pool_WOM', {
      rewardTokens: [Token.QUO],
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_sfrxETH', {
      startTimestamp: Epochs.Apr19,
      rewardTokens: [Token.FXS],
      operator: ExternalContract.FraxBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_jUSDC_Pool_jUSDC', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.USDC],
      operator: ExternalContract.JonesDaoBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_jUSDC_Pool_USDCe', {
      startTimestamp: Epochs.May3,
      rewardTokens: [Token.USDC],
      operator: ExternalContract.JonesDaoBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_ankrETH_Pool_WETH', {
      startTimestamp: Epochs.May17,
      rewardTokens: [Token.ANKR],
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_ankrETH_Pool_ankrETH', {
      startTimestamp: Epochs.May17,
      rewardTokens: [Token.ANKR],
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_WstETH_Pool_WETH', {
      rewardTokens: [Token.ARB],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('0'))],
    }),
    ...createRewarderForDeployedAsset('Asset_WstETH_Pool_wstETH', {
      rewardTokens: [Token.ARB],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('5000'))],
    }),
  },
  [Network.LOCALHOST]: {},
  [Network.POLYGON_MAINNET]: {},
  [Network.POLYGON_TESTNET]: {},
  [Network.AVALANCHE_TESTNET]: {},
  [Network.ARBITRUM_TESTNET]: {},
  [Network.OPTIMISM_MAINNET]: {},
  [Network.OPTIMISM_TESTNET]: {},
  [Network.ETHEREUM_MAINNET]: {},
}

function createRewarderForDeployedAsset(deploymentName: string, config: Partial<IRewarder>): TokenMap<IRewarder> {
  const rewarder: IRewarder = {
    ...defaultRewarder(),
    lpToken: Deployment(deploymentName),
    ...config,
  }
  assert(isValid(rewarder), `Invalid rewarder config: ${rewarder}`)
  return {
    [deploymentName]: rewarder,
  }
}

function defaultRewarder(): IRewarder {
  return {
    lpToken: Unknown(),
    secondsToStart: 60,
    // Use empty reward token here as we expect config to override it.
    rewardTokens: [],
    tokenPerSec: [0],
  }
}

function isValid(rewarder: IRewarder) {
  return (
    rewarder.rewardTokens.length > 0 &&
    (rewarder.secondsToStart || rewarder.startTimestamp) &&
    rewarder.tokenPerSec.length == rewarder.rewardTokens.length
  )
}
