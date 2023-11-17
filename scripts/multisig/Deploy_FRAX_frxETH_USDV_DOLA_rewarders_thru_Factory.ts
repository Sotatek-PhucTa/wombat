import { runScript } from '.'
import { Network } from '../../types'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import {
  concatAll,
  getBoostedRewarderAddress,
  getDeployedContract,
  isContractAddress,
  isForkedNetwork,
} from '../../utils'
import assert from 'assert'
import { Token, getTokenAddress } from '../../config/token'
import { getNamedAccounts } from 'hardhat'
import { unsafeIsoStringToEpochSeconds } from '../../config/epoch'
import { convertTokenPerEpochToTokenPerSec } from '../../config/emission'
import { parseEther } from 'ethers/lib/utils'
import { ExternalContract, getContractAddress } from '../../config/contract'
import { BribeRewarderFactory } from '../../build/typechain'

function getRewarderConfig(operator: string, rate: string) {
  return {
    opRatePerEpoch: parseEther(rate),
    operator,
  }
}

;(async function () {
  assert(isForkedNetwork(), 'multi-stage proposal requires running in a forked network')

  const [fraxBribeOperator, usdvOperator, dolaOperator] = await Promise.all([
    getContractAddress(ExternalContract.FraxBribeOperator),
    getContractAddress(ExternalContract.USDVOperator),
    getContractAddress(ExternalContract.DOLAOperator),
  ])
  const REWARDER_CONFIG = {
    Asset_Frax_Pool_FRAX: getRewarderConfig(fraxBribeOperator, '191'),
    Asset_Frax_Pool_USDC: getRewarderConfig(fraxBribeOperator, '95'),
    Asset_frxETH_Pool_sfrxETH: getRewarderConfig(fraxBribeOperator, '95'),
    Asset_frxETH_Pool_frxETH: getRewarderConfig(fraxBribeOperator, '191'),
    Asset_frxETH_Pool_WETH: getRewarderConfig(fraxBribeOperator, '95'),
    Asset_USDV_Pool_USDV: getRewarderConfig(usdvOperator, '240'),
    Asset_USDV_Pool_USDT: getRewarderConfig(usdvOperator, '240'),
    Asset_Dola_Pool_DOLA: getRewarderConfig(dolaOperator, '1200'),
    Asset_Dola_Pool_USDCe: getRewarderConfig(dolaOperator, '800'),
  }
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  assert(network == Network.OPTIMISM_MAINNET, `Network ${network} is not supported.`)
  const rewarderStartTime = unsafeIsoStringToEpochSeconds('2023-11-27T06:00Z') // 2023 Nov 27 2PM HKT

  await runScript(
    'Deploy_FRAX_frxETH_USDV_DOLA_rewarders_thru_Factory',
    async () => {
      const { multisig: multisigAddress } = await getNamedAccounts()

      return concatAll(
        // set Bribe Rewarder Factory
        multisig.utils.setBribeRewarderFactory(),

        // whitelist reward tokens
        multisig.utils.whitelistRewardTokenForBribeRewarderFactory([Token.FXS, Token.USDV, Token.OP]),
        // set deployer to multisig
        ...Object.keys(REWARDER_CONFIG).map((asset) =>
          multisig.utils.setRewarderDeployerInFactory(asset, multisigAddress)
        ),
        ...Object.entries(REWARDER_CONFIG).map(([asset, rewardConfig]) =>
          concatAll(
            // deploy rewarders
            multisig.utils.deployRewarderThroughFactory(
              asset,
              Token.OP,
              rewarderStartTime,
              convertTokenPerEpochToTokenPerSec(rewardConfig.opRatePerEpoch)
            ),
            // set deployer to operator
            multisig.utils.setRewarderDeployerInFactory(asset, rewardConfig.operator)
          )
        )
      )
    },
    async () => {
      const bribeRewarderFactory = (await getDeployedContract('BribeRewarderFactory')) as BribeRewarderFactory
      // FXS is whitelisted
      assert(
        await bribeRewarderFactory.isRewardTokenWhitelisted(await getTokenAddress(Token.FXS)),
        'FXS should be whitelisted after the operation'
      )
      // USDV is whitelisted
      assert(
        await bribeRewarderFactory.isRewardTokenWhitelisted(await getTokenAddress(Token.USDV)),
        'USDV should be whitelisted after the operation'
      )
      // OP is whitelisted
      assert(
        await bribeRewarderFactory.isRewardTokenWhitelisted(await getTokenAddress(Token.OP)),
        'OP should be whitelisted after the operation'
      )
    },
    true
  )

  await runScript(
    'Top_up_FRAX_frxETH_USDV_DOLA_rewarders_and_add_operator',
    async () => {
      return concatAll(
        ...Object.entries(REWARDER_CONFIG).map(([asset, rewardConfig]) => {
          return concatAll(
            // Top up OP
            multisig.utils.topUpBoostedRewarder(
              asset,
              Token.OP,
              asset.includes('DOLA') ? rewardConfig.opRatePerEpoch.mul(2) : rewardConfig.opRatePerEpoch.mul(4)
            ),
            // Add operator for rewarder
            multisig.utils.addOperatorForRewarder([asset], rewardConfig.operator)
          )
        })
      )
    },
    async () => {
      for (const asset of Object.keys(REWARDER_CONFIG)) {
        const rewarderAddress = await getBoostedRewarderAddress(asset)
        assert(await isContractAddress(rewarderAddress), 'Not a contract address')
      }
    },
    true
  )
})()
