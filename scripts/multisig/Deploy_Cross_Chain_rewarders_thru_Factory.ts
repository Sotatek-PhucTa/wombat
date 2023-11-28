import { runScript } from '.'
import { Network, PartialRecord } from '../../types'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import { concatAll, getBoostedRewarderAddress, getDeployedContract, isContractAddress } from '../../utils'
import assert from 'assert'
import { Token, getTokenAddress } from '../../config/token'
import { unsafeIsoStringToEpochSeconds } from '../../config/epoch'
import { convertTokenPerEpochToTokenPerSec } from '../../config/emission'
import { parseEther } from 'ethers/lib/utils'
import { BribeRewarderFactory } from '../../build/typechain'
import { BigNumber } from 'ethers'
import { deployBoostedRewarderThroughFactory } from '../../utils/multisig/utils'

interface IRewarderConfig {
  assetsToDeployRewarderFor: string[]
  epochAmount: BigNumber
  rewarderStartTime: number
  rewardToken: Token
}

const rewardersNetworkConfig: PartialRecord<Network, IRewarderConfig> = {
  [Network.AVALANCHE_MAINNET]: {
    assetsToDeployRewarderFor: ['Asset_Stablecoin_Pool_USDC', 'Asset_Stablecoin_Pool_USDT'],
    epochAmount: parseEther('1875'),
    rewarderStartTime: unsafeIsoStringToEpochSeconds('2023-10-25T10:00Z'), // 2023 Oct 25 6PM HKT
    rewardToken: Token.WOM,
  },
  [Network.BASE_MAINNET]: {
    assetsToDeployRewarderFor: ['Asset_Stablecoin_Pool_USDC', 'Asset_Stablecoin_Pool_USDbC'],
    epochAmount: parseEther('6250'),
    rewarderStartTime: unsafeIsoStringToEpochSeconds('2023-11-22T06:00Z'), // 2023 Nov 22 2PM HKT
    rewardToken: Token.WOM,
  },
  [Network.OPTIMISM_MAINNET]: {
    assetsToDeployRewarderFor: [
      'Asset_Stablecoin_Pool_USDC',
      'Asset_Stablecoin_Pool_USDT',
      'Asset_Stablecoin_Pool_USDCe',
    ],
    epochAmount: parseEther('76'),
    rewarderStartTime: unsafeIsoStringToEpochSeconds('2023-11-29T06:00Z'), // 2023 Nov 29 2PM HKT
    rewardToken: Token.OP,
  },
}

;(async function () {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  assert(Object.keys(rewardersNetworkConfig).includes(network), `Network ${network} is not supported.`)
  const {
    rewardToken,
    assetsToDeployRewarderFor,
    rewarderStartTime,
    epochAmount: EPOCH_AMOUNT,
  } = rewardersNetworkConfig[network]!

  const INITIAL_RATE = convertTokenPerEpochToTokenPerSec(EPOCH_AMOUNT)

  await runScript(
    'Deploy_Cross_Chain_rewarders_thru_Factory',
    async () => {
      return deployBoostedRewarderThroughFactory(
        assetsToDeployRewarderFor,
        rewardToken,
        rewarderStartTime,
        INITIAL_RATE
      )
    },
    async () => {
      const bribeRewarderFactory = (await getDeployedContract('BribeRewarderFactory')) as BribeRewarderFactory
      // WOM is not whitelisted
      assert(
        !(await bribeRewarderFactory.isRewardTokenWhitelisted(await getTokenAddress(Token.WOM))),
        'WOM should not be whitelisted after the operation'
      )
    },
    true
  )

  await runScript(
    'Top_up_Cross_Chain_rewarders',
    async () => {
      return concatAll(
        ...assetsToDeployRewarderFor.map((asset) =>
          multisig.utils.topUpBoostedRewarder(asset, rewardToken, EPOCH_AMOUNT.mul(4))
        )
      )
    },
    async () => {
      for (const asset of assetsToDeployRewarderFor) {
        const lpRewarder = await getBoostedRewarderAddress(asset)
        assert(await isContractAddress(lpRewarder), 'Not a contract address')
      }
    },
    true
  )
})()
