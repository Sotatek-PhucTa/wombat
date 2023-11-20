import { runScript } from '.'
import { Network, PartialRecord } from '../../types'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import { concatAll, getBoostedRewarderAddress, getDeployedContract, isContractAddress } from '../../utils'
import assert from 'assert'
import { Token, getTokenAddress } from '../../config/token'
import { getNamedAccounts } from 'hardhat'
import { unsafeIsoStringToEpochSeconds } from '../../config/epoch'
import { convertTokenPerEpochToTokenPerSec } from '../../config/emission'
import { parseEther } from 'ethers/lib/utils'
import { BribeRewarderFactory } from '../../build/typechain'
import { BigNumber } from 'ethers'

interface IRewarderConfig {
  assetsToDeployRewarderFor: string[]
  epochAmount: BigNumber
  rewarderStartTime: number
}

const rewardersNetworkConfig: PartialRecord<Network, IRewarderConfig> = {
  [Network.AVALANCHE_MAINNET]: {
    assetsToDeployRewarderFor: ['Asset_Stablecoin_Pool_USDC', 'Asset_Stablecoin_Pool_USDT'],
    epochAmount: parseEther('1875'),
    rewarderStartTime: unsafeIsoStringToEpochSeconds('2023-10-25T10:00Z'), // 2023 Oct 25 6PM HKT
  },
  [Network.BASE_MAINNET]: {
    assetsToDeployRewarderFor: ['Asset_Stablecoin_Pool_USDC', 'Asset_Stablecoin_Pool_USDbC'],
    epochAmount: parseEther('6250'),
    rewarderStartTime: unsafeIsoStringToEpochSeconds('2023-11-22T06:00Z'), // 2023 Nov 22 2PM HKT
  },
}

;(async function () {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  assert([Network.AVALANCHE_MAINNET, Network.BASE_MAINNET].includes(network), `Network ${network} is not supported.`)
  const { assetsToDeployRewarderFor, rewarderStartTime, epochAmount: EPOCH_AMOUNT } = rewardersNetworkConfig[network]!

  const INITIAL_WOM_RATE = convertTokenPerEpochToTokenPerSec(EPOCH_AMOUNT)

  await runScript(
    'Deploy_Cross_Chain_rewarders_thru_Factory',
    async () => {
      const { multisig: multisigAddress } = await getNamedAccounts()

      return concatAll(
        // set Bribe Rewarder Factory if needed
        multisig.utils.setBribeRewarderFactory(),
        // whitelist reward tokens
        multisig.utils.whitelistRewardTokenForBribeRewarderFactory([Token.WOM]),
        // set deployer to multisig
        ...assetsToDeployRewarderFor.map((asset) =>
          multisig.utils.setRewarderDeployerInFactory(asset, multisigAddress)
        ),
        // deploy rewarders
        ...assetsToDeployRewarderFor.map((asset) =>
          multisig.utils.deployRewarderThroughFactory(asset, Token.WOM, rewarderStartTime, INITIAL_WOM_RATE)
        ),
        // revoke WOM
        multisig.utils.revokeRewardTokenForBribeRewarderFactory([Token.WOM])
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
          multisig.utils.topUpBoostedRewarder(asset, Token.WOM, EPOCH_AMOUNT.mul(4))
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
