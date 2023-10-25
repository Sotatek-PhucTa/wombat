import { runScript } from '.'
import { Network } from '../../types'
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
;(async function () {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  assert(network == Network.AVALANCHE_MAINNET, `Network ${network} is not supported.`)
  const assetsToDeployRewarderFor = ['Asset_Stablecoin_Pool_USDC', 'Asset_Stablecoin_Pool_USDT']
  const rewarderStartTime = unsafeIsoStringToEpochSeconds('2023-10-25T10:00Z') // 2023 Oct 25 6PM HKT
  const EPOCH_AMOUNT = parseEther('1875')

  const INITIAL_WOM_RATE = convertTokenPerEpochToTokenPerSec(EPOCH_AMOUNT)

  await runScript(
    'Deploy_Cross_Chain_rewarders_thru_Factory',
    async () => {
      const { multisig: multisigAddress } = await getNamedAccounts()

      return concatAll(
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
        multisig.utils.topUpBoostedRewarder('Asset_Stablecoin_Pool_USDC', Token.WOM, EPOCH_AMOUNT.mul(4)),
        multisig.utils.topUpBoostedRewarder('Asset_Stablecoin_Pool_USDT', Token.WOM, EPOCH_AMOUNT.mul(4))
      )
    },
    async () => {
      const lpUsdcRewarder = await getBoostedRewarderAddress('Asset_Stablecoin_Pool_USDC')
      const lpUsdtRewarder = await getBoostedRewarderAddress('Asset_Stablecoin_Pool_USDT')

      assert(await isContractAddress(lpUsdcRewarder), 'Not a contract address')
      assert(await isContractAddress(lpUsdtRewarder), 'Not a contract address')
    },
    true
  )
})()
