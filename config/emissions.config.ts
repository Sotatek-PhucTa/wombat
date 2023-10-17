import { parseEther, parseUnits } from 'ethers/lib/utils'
import { Address, Deployment, IRewarder, Network, TokenMap, Unknown } from '../types'
import { ExternalContract } from './contract'
import { convertTokenPerEpochToTokenPerSec } from './emission'
import { ETH_LAUNCH_DATE, Epochs } from './epoch'
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
      rewardTokens: [Token.BUSD],
      tokenPerSec: [parseEther('100')],
      operator: ExternalContract.MockContract,
    }),
    ...createRewarderForDeployedAsset('Asset_MainPool_USDT', {
      rewardTokens: [Token.USDT, Token.BUSD],
      tokenPerSec: [parseEther('12.3'), parseEther('100')],
    }),
  },
  [Network.ZKSYNC_TESTNET]: {
    ...createRewarderForDeployedAsset('Asset_MainPool_USDC', {
      rewardTokens: [Token.USDC],
      tokenPerSec: [parseEther('100')],
    }),
    ...createRewarderForDeployedAsset('Asset_MainPool_USDT', {
      rewardTokens: [Token.USDT, Token.USDC],
      tokenPerSec: [parseEther('12.3'), parseEther('100')],
    }),
  },
  [Network.BSC_MAINNET]: {
    HAY: {
      ...defaultRewarder(),
      lpToken: Address('0x1fa71DF4b344ffa5755726Ea7a9a56fbbEe0D38b'),
      rewardTokens: [Token.HAY],
      startTimestamp: 1674021600,
      tokenPerSec: [0],
    },
    wmxWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x3C42E4F84573aB8c88c8E479b7dC38A7e678D688'),
      rewardTokens: [Token.WMX],
      startTimestamp: 1674021600,
      tokenPerSec: [0],
    },
    wmxWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xF9BdC872D75f76B946E0770f96851b1f2F653caC'),
      rewardTokens: [Token.WMX],
      startTimestamp: 1674021600,
      tokenPerSec: [0],
    },
    mWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x1f502fF26dB12F8e41B373f36Dc0ABf2D7F6723E'),
      rewardTokens: [Token.MGP],
      startTimestamp: 1674021600,
      tokenPerSec: [0],
    },
    mWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xEABa290B154aF45DE72FDf2a40E56349e4E68AC2'),
      rewardTokens: [Token.MGP],
      startTimestamp: 1674021600,
      tokenPerSec: [0],
    },
    qWOM: {
      ...defaultRewarder(),
      lpToken: Address('0x87073ba87517E7ca981AaE3636754bCA95C120E4'),
      rewardTokens: [Token.QUO],
      startTimestamp: 1674021600,
      tokenPerSec: [0],
    },
    qWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xB5c9368545A26b91d5f7340205e5d9559f48Bcf8'),
      rewardTokens: [Token.QUO],
      startTimestamp: 1674021600,
      tokenPerSec: [0],
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
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('2631'))],
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_sfrxETH', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('2631'))],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_FRAX', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [0],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_CUSD', {
      rewardTokens: [Token.CUSD],
      tokenPerSec: ['826719577000000'],
    }),
    ...createRewarderForDeployedAsset('Asset_qWOMPool_WOM', {
      startTimestamp: Epochs.May03,
      rewardTokens: [Token.QUO],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('0'))],
      operator: ExternalContract.QuollBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_qWOMPool_qWOM', {
      startTimestamp: Epochs.May03,
      rewardTokens: [Token.QUO],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('0'))],
      operator: ExternalContract.QuollBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_mWOMPool_WOM', {
      startTimestamp: Epochs.May03,
      rewardTokens: [Token.MGP],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_mWOMPool_mWOM', {
      startTimestamp: Epochs.May03,
      rewardTokens: [Token.MGP],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_wmxWOMPool_WOM', {
      startTimestamp: Epochs.May03,
      rewardTokens: [Token.WMX],
      operator: ExternalContract.WombexBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_wmxWOMPool_wmxWOM', {
      startTimestamp: Epochs.May03,
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
      tokenPerSec: [0],
    }),
    ...createRewarderForDeployedAsset('Asset_BNBy_Pool_WBNB', {
      rewardTokens: [Token.TENFI],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('29650'))],
      operator: ExternalContract.TenFiBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_BNBy_Pool_BNBy', {
      rewardTokens: [Token.TENFI],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('29650'))],
      operator: ExternalContract.TenFiBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_rBNB_Pool_rBNB', {
      startTimestamp: Epochs.Jul26,
      rewardTokens: [Token.FIS],
      tokenPerSec: ['826719570000000'],
      operator: ExternalContract.StafiOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_rBNB_Pool_WBNB', {
      startTimestamp: Epochs.Jul26,
      rewardTokens: [Token.FIS],
      tokenPerSec: ['826719570000000'],
      operator: ExternalContract.StafiOperator,
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
    ...createRewarderForDeployedAsset('Asset_FRAX_Pool_USDCe', {
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
      startTimestamp: Epochs.May03,
      rewardTokens: [Token.MGP],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_mWOM_Pool_mWOM', {
      startTimestamp: Epochs.May03,
      rewardTokens: [Token.MGP],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_wmxWOM_Pool_WOM', {
      startTimestamp: Epochs.May03,
      rewardTokens: [Token.WMX],
      operator: ExternalContract.WombexBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_wmxWOM_Pool_wmxWOM', {
      startTimestamp: Epochs.May03,
      rewardTokens: [Token.WMX],
      operator: ExternalContract.WombexBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_WstETH_Pool_WETH', {
      rewardTokens: [Token.ARB],
      tokenPerSec: [0],
    }),
    ...createRewarderForDeployedAsset('Asset_WstETH_Pool_wstETH', {
      rewardTokens: [Token.ARB, Token.WOM],
      tokenPerSec: [0, 0],
    }),
    ...createRewarderForDeployedAsset('Asset_mPendle_Pool_PENDLE', {
      rewardTokens: [Token.PNP, Token.WOM],
      tokenPerSec: ['3220634910000000', convertTokenPerEpochToTokenPerSec(parseEther('0'))],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_mPendle_Pool_mPendle', {
      rewardTokens: [Token.PNP, Token.WOM],
      tokenPerSec: ['1660317450000000', convertTokenPerEpochToTokenPerSec(parseEther('0'))],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_fUSDC_Pool_fUSDC', {
      rewardTokens: [Token.fUSDC],
      tokenPerSec: ['0'],
      operator: ExternalContract.fUSDCBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_fUSDC_Pool_USDCe', {
      rewardTokens: [Token.fUSDC],
      tokenPerSec: ['0'],
      operator: ExternalContract.fUSDCBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_ePendle_Pool_PENDLE', {
      rewardTokens: [Token.xEQB],
      startTimestamp: Epochs.Jul05,
      operator: ExternalContract.EquilibriaFiOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_ePendle_Pool_ePendle', {
      rewardTokens: [Token.xEQB],
      startTimestamp: Epochs.Jul05,
      operator: ExternalContract.EquilibriaFiOperator,
    }),
  },
  [Network.LOCALHOST]: {},
  [Network.POLYGON_MAINNET]: {},
  [Network.POLYGON_TESTNET]: {},
  [Network.AVALANCHE_TESTNET]: {},
  [Network.ARBITRUM_TESTNET]: {},
  [Network.OPTIMISM_MAINNET]: {},
  [Network.OPTIMISM_TESTNET]: {},
  [Network.ETHEREUM_MAINNET]: {
    ...createRewarderForDeployedAsset('Asset_ETHx_Pool_WETH', {
      rewardTokens: [Token.SD, Token.WOM],
      tokenPerSec: [
        convertTokenPerEpochToTokenPerSec(parseEther('0')),
        convertTokenPerEpochToTokenPerSec(parseEther('32918')),
      ],
      startTimestamp: ETH_LAUNCH_DATE,
    }),
    ...createRewarderForDeployedAsset('Asset_ETHx_Pool_ETHx', {
      rewardTokens: [Token.SD, Token.WOM],
      tokenPerSec: [
        convertTokenPerEpochToTokenPerSec(parseEther('0')),
        convertTokenPerEpochToTokenPerSec(parseEther('24681')),
      ],
      startTimestamp: ETH_LAUNCH_DATE,
    }),
    // ...createRewarderForDeployedAsset('Asset_FRAX_Pool_FRAX', {
    //   rewardTokens: [Token.FXS, Token.WOM],
    //   tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('0')), convertTokenPerEpochToTokenPerSec(parseEther('0'))],
    //   startTimestamp: ETH_LAUNCH_DATE,
    // }),
    // ...createRewarderForDeployedAsset('Asset_FRAX_Pool_USDT', {
    //   rewardTokens: [Token.FXS, Token.WOM],
    //   tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('0')), convertTokenPerEpochToTokenPerSec(parseEther('0'))],
    //   startTimestamp: ETH_LAUNCH_DATE,
    // }),
    ...createRewarderForDeployedAsset('Asset_agEUR_Pool_EURe', {
      rewardTokens: [Token.ANGLE, Token.WOM],
      tokenPerSec: [
        convertTokenPerEpochToTokenPerSec(parseEther('19538')),
        convertTokenPerEpochToTokenPerSec(parseEther('4693')),
      ],
      startTimestamp: ETH_LAUNCH_DATE,
    }),
    ...createRewarderForDeployedAsset('Asset_agEUR_Pool_agEUR', {
      rewardTokens: [Token.ANGLE, Token.WOM],
      tokenPerSec: [
        convertTokenPerEpochToTokenPerSec(parseEther('19538')),
        convertTokenPerEpochToTokenPerSec(parseEther('4693')),
      ],
      startTimestamp: ETH_LAUNCH_DATE,
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_WETH', {
      rewardTokens: [Token.FXS, Token.WOM],
      tokenPerSec: [
        convertTokenPerEpochToTokenPerSec(parseEther('25')),
        convertTokenPerEpochToTokenPerSec(parseEther('5116')),
      ],
      startTimestamp: ETH_LAUNCH_DATE,
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_frxETH', {
      rewardTokens: [Token.FXS, Token.WOM],
      tokenPerSec: [
        convertTokenPerEpochToTokenPerSec(parseEther('34')),
        convertTokenPerEpochToTokenPerSec(parseEther('6958')),
      ],
      startTimestamp: ETH_LAUNCH_DATE,
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_sfrxETH', {
      rewardTokens: [Token.FXS, Token.WOM],
      tokenPerSec: [
        convertTokenPerEpochToTokenPerSec(parseEther('25')),
        convertTokenPerEpochToTokenPerSec(parseEther('5166')),
      ],
      startTimestamp: ETH_LAUNCH_DATE,
    }),
    ...createRewarderForDeployedAsset('Asset_wstETH_Pool_WETH', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('7039'))],
      startTimestamp: ETH_LAUNCH_DATE,
    }),
    ...createRewarderForDeployedAsset('Asset_wstETH_Pool_wstETH', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('7039'))],
      startTimestamp: ETH_LAUNCH_DATE,
    }),
    ...createRewarderForDeployedAsset('Asset_Stablecoin_Pool_USDC', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('5833'))],
      startTimestamp: Epochs.Sep06,
    }),
    ...createRewarderForDeployedAsset('Asset_Stablecoin_Pool_USDT', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('5833'))],
      startTimestamp: Epochs.Sep06,
    }),
  },
}

// Private. Do not export.
const BRIBE_MAPS: Record<Network, TokenMap<IRewarder>> = {
  [Network.HARDHAT]: {
    ...createRewarderForDeployedAsset('Asset_MainPool_BUSD', {
      rewardTokens: [Token.WOM],
      tokenPerSec: [parseEther('100')],
      operator: ExternalContract.MockContract,
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
      tokenPerSec: ['1653439153439153'],
    },
    BNBx: {
      ...defaultRewarder(),
      lpToken: Address('0x16B37225889A038FAD42efdED462821224A509A7'),
      rewardTokens: [Token.SD],
      tokenPerSec: ['2149000000000000'],
    },
    BnbxPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0x0321D1D769cc1e81Ba21a157992b635363740f86'),
      rewardTokens: [Token.SD],
      tokenPerSec: ['496000000000000'],
    },
    stkBnb: {
      ...defaultRewarder(),
      lpToken: Address('0x0E202A0bCad2712d1fdeEB94Ec98C58bEeD0679f'),
      rewardTokens: [Token.PSTAKE],
      tokenPerSec: ['7500000000000000'],
    },
    StkBnbPool_WBNB: {
      ...defaultRewarder(),
      lpToken: Address('0x6C7B407411b3DB90DfA25DA4aA66605438D378CE'),
      rewardTokens: [Token.PSTAKE],
      tokenPerSec: ['3750000000000000'],
    },
    wmxWom: {
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
      rewardTokens: [Token.MGP, Token.BUSD],
      tokenPerSec: [0, 0],
    },
    mWOMPool_WOM: {
      ...defaultRewarder(),
      lpToken: Address('0xEABa290B154aF45DE72FDf2a40E56349e4E68AC2'),
      rewardTokens: [Token.MGP, Token.BUSD],
      tokenPerSec: [0, 0],
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
    ...createRewarderForDeployedAsset('Asset_IUSDPool_iUSD', {
      rewardTokens: [Token.iUSD],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('0'))],
    }),
    ...createRewarderForDeployedAsset('Asset_IUSDPool_BUSD', {
      rewardTokens: [Token.iUSD],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('0'))],
    }),
    ...createRewarderForDeployedAsset('AxlUsdcPool_axlUSDC', {
      rewardTokens: [Token.axlUSDC, Token.BUSD],
      tokenPerSec: [0, 0],
    }),
    ...createRewarderForDeployedAsset('AxlUsdcPool_BUSD', {
      rewardTokens: [Token.axlUSDC, Token.BUSD],
      tokenPerSec: [0, 0],
    }),
    ...createRewarderForDeployedAsset('Asset_BOB_Pool_BOB', {
      rewardTokens: [Token.BOB],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('250'))],
    }),
    ...createRewarderForDeployedAsset('Asset_BOB_Pool_USDC', {
      rewardTokens: [Token.BOB],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('250'))],
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_frxETH', {
      rewardTokens: [Token.FXS],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('25'))],
      operator: ExternalContract.FraxBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_WETH', {
      // deprecated. replaced by Asset_frxETH_Pool_ETH
      rewardTokens: [Token.FXS],
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_ETH', {
      rewardTokens: [Token.FXS],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('25'))],
      operator: ExternalContract.FraxBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_sfrxETH', {
      startTimestamp: Epochs.Apr19,
      rewardTokens: [Token.FXS],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('25'))],
      operator: ExternalContract.FraxBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_stables_01_FRAX', {
      rewardTokens: [Token.FXS],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('10'))],
      operator: ExternalContract.FraxBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_SnBNB_Pool_SnBNB', {
      startTimestamp: Epochs.Jul12,
      rewardTokens: [Token.HAY],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('1700'))],
    }),
    ...createRewarderForDeployedAsset('Asset_SnBNB_Pool_WBNB', {
      startTimestamp: Epochs.Jul12,
      rewardTokens: [Token.HAY],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('2300'))],
    }),
    ...createRewarderForDeployedAsset('Asset_MIM_Pool_MIM', {
      rewardTokens: [Token.SPELL],
    }),
    ...createRewarderForDeployedAsset('Asset_MIM_Pool_USDT', {
      rewardTokens: [Token.SPELL],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_USD+', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus, Token.DAI],
      tokenPerSec: [0, 0],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_USDT+', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus, Token.DAI],
      tokenPerSec: [0, 0],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_USDC', {
      rewardTokens: [Token.USDPlus, Token.USDC],
      tokenPerSec: [0, 0],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_CUSD', {
      rewardTokens: [Token.WOM, Token.BUSD, Token.CUSD],
      tokenPerSec: [0, 0, 0],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_HAY', {
      rewardTokens: [Token.WOM, Token.BUSD, Token.CUSD, Token.HAY],
      tokenPerSec: [0, 0, 0, 0],
    }),
    ...createRewarderForDeployedAsset('Asset_Mixed_Pool_FRAX', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.FXS],
      operator: ExternalContract.FraxBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_AnkrBNBPool_WBNB', {
      rewardTokens: [Token.ANKR, Token.ANKR],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('18000')), 0],
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_AnkrBNBPool_ankrBNB', {
      rewardTokens: [Token.ANKR, Token.ANKR],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('12000')), 0],
      operator: ExternalContract.AnkrBribeOperator,
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
      rewardTokens: [Token.ANKR],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('10000'))],
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_ankrETH_Pool_ankrETH', {
      rewardTokens: [Token.ANKR],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('15000'))],
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_SidePool_01_HAY', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.HAY],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('2200'))],
    }),
    ...createRewarderForDeployedAsset('Asset_HAY_Pool_USDC', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.HAY],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('4500'))],
    }),
    ...createRewarderForDeployedAsset('Asset_HAY_Pool_USDT', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.HAY],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('2300'))],
    }),
    ...createRewarderForDeployedAsset('Asset_wBETH_Pool_wBETH', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.wBETH],
    }),
    ...createRewarderForDeployedAsset('Asset_wBETH_Pool_ETH', {
      startTimestamp: Epochs.May10,
      rewardTokens: [Token.wBETH],
    }),
    ...createRewarderForDeployedAsset('Asset_stables_01_USDT', {
      rewardTokens: [Token.FXS],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('10'))],
      operator: ExternalContract.FraxBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_rBNB_Pool_rBNB', {
      startTimestamp: Epochs.Aug09,
      rewardTokens: [Token.FIS],
      tokenPerSec: ['0'],
      operator: ExternalContract.StafiOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_rBNB_Pool_WBNB', {
      startTimestamp: Epochs.Aug09,
      rewardTokens: [Token.FIS],
      tokenPerSec: ['0'],
      operator: ExternalContract.StafiOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_USDS_Pool_USDS', {
      startTimestamp: Epochs.Aug09,
      rewardTokens: [Token.SABLE],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('115005'))],
      operator: ExternalContract.SableOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_USDS_Pool_USDT', {
      startTimestamp: Epochs.Aug09,
      rewardTokens: [Token.SABLE],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('115005'))],
      operator: ExternalContract.SableOperator,
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
      rewardTokens: [Token.USDPlus, Token.DAI],
      tokenPerSec: [0, 0],
    }),
    ...createRewarderForDeployedAsset('Asset_USDPlus_Pool_DAI+', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus, Token.DAI],
      tokenPerSec: [0, 0],
    }),
    ...createRewarderForDeployedAsset('Asset_USDPlus_Pool_USDCe', {
      startTimestamp: Epochs.Apr12,
      rewardTokens: [Token.USDPlus, Token.DAI],
      tokenPerSec: [0, 0],
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
      tokenPerSec: [0],
    }),
    ...createRewarderForDeployedAsset('Asset_BOB_Pool_BOB', {
      rewardTokens: [Token.BOB],
      tokenPerSec: ['413359788000000'],
    }),
    ...createRewarderForDeployedAsset('Asset_BOB_Pool_USDCe', {
      rewardTokens: [Token.BOB],
      tokenPerSec: ['413359788000000'],
    }),
    ...createRewarderForDeployedAsset('Asset_mWOM_Pool_mWOM', {
      rewardTokens: [Token.MGP, Token.USDCe, Token.DAI],
      tokenPerSec: [0, 0, 0],
    }),
    ...createRewarderForDeployedAsset('Asset_mWOM_Pool_WOM', {
      rewardTokens: [Token.MGP, Token.USDCe, Token.DAI],
      tokenPerSec: [0, 0, 0],
    }),
    ...createRewarderForDeployedAsset('Asset_wmxWOM_Pool_wmxWOM', {
      rewardTokens: [Token.WMX],
    }),
    ...createRewarderForDeployedAsset('Asset_wmxWOM_Pool_WOM', {
      rewardTokens: [Token.WMX],
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_frxETH', {
      rewardTokens: [Token.FXS],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('60'))],
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_sfrxETH', {
      rewardTokens: [Token.FXS],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('25'))],
      operator: ExternalContract.FraxBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_frxETH_Pool_WETH', {
      rewardTokens: [Token.FXS],
      tokenPerSec: [convertTokenPerEpochToTokenPerSec(parseEther('25'))],
    }),
    ...createRewarderForDeployedAsset('Asset_qWOM_Pool_qWOM', {
      rewardTokens: [Token.QUO],
    }),
    ...createRewarderForDeployedAsset('Asset_qWOM_Pool_WOM', {
      rewardTokens: [Token.QUO],
    }),
    ...createRewarderForDeployedAsset('Asset_jUSDC_Pool_jUSDC', {
      startTimestamp: Epochs.May03,
      rewardTokens: [Token.USDCe, Token.JONES],
      tokenPerSec: [0, '103339947089947'],
      operator: ExternalContract.JonesDaoBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_jUSDC_Pool_USDCe', {
      startTimestamp: Epochs.May03,
      rewardTokens: [Token.USDCe, Token.JONES],
      tokenPerSec: [0, '103339947089947'],
      operator: ExternalContract.JonesDaoBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_ankrETH_Pool_WETH', {
      rewardTokens: [Token.multiANKR, Token.ankrETH, Token.ANKR],
      tokenPerSec: [
        convertTokenPerEpochToTokenPerSec(parseEther('0')),
        convertTokenPerEpochToTokenPerSec(parseEther('0.2115')),
        convertTokenPerEpochToTokenPerSec(parseEther('0')),
      ],
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_ankrETH_Pool_ankrETH', {
      rewardTokens: [Token.multiANKR, Token.ankrETH, Token.ANKR],
      tokenPerSec: [
        convertTokenPerEpochToTokenPerSec(parseEther('0')),
        convertTokenPerEpochToTokenPerSec(parseEther('0.141')),
        convertTokenPerEpochToTokenPerSec(parseEther('0')),
      ],
      operator: ExternalContract.AnkrBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_WstETH_Pool_WETH', {
      rewardTokens: [Token.ARB],
      tokenPerSec: [0],
    }),
    ...createRewarderForDeployedAsset('Asset_WstETH_Pool_wstETH', {
      rewardTokens: [Token.ARB],
      tokenPerSec: [0],
    }),
    ...createRewarderForDeployedAsset('Asset_mPendle_Pool_PENDLE', {
      rewardTokens: [Token.PNP],
      tokenPerSec: ['1008194600000000'],
      operator: ExternalContract.MagpieBribeOperator,
    }),
    ...createRewarderForDeployedAsset('Asset_mPendle_Pool_mPendle', {
      rewardTokens: [Token.PNP],
      tokenPerSec: ['504097300000000'],
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

function createRewarderForDeployedAsset(deploymentName: string, config: Partial<IRewarder>): TokenMap<IRewarder> {
  const rewarder: IRewarder = {
    ...defaultRewarder(),
    lpToken: Deployment(deploymentName),
    ...config,
  }
  assert(isValid(rewarder), `Invalid rewarder config: ${JSON.stringify(rewarder)}`)
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
