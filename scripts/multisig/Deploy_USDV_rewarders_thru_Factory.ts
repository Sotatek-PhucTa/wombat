import { runScript } from '.'
import { Network } from '../../types'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import { concatAll, getBoostedRewarderAddress, getDeployedContract, isContractAddress } from '../../utils'
import assert from 'assert'
import { Token, getTokenAddress } from '../../config/token'
import { getNamedAccounts } from 'hardhat'
import { Epochs } from '../../config/epoch'
import { convertTokenPerEpochToTokenPerSec } from '../../config/emission'
import { parseEther } from 'ethers/lib/utils'
import { BribeRewarderFactory } from '../../build/typechain'
;(async function () {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  assert(
    [Network.AVALANCHE_MAINNET, Network.ARBITRUM_MAINNET, Network.BSC_MAINNET, Network.ETHEREUM_MAINNET].includes(
      network
    ),
    `Network ${network} is not supported.`
  )
  const assetsToDeployRewarderFor = ['Asset_USDV_Pool_USDV', 'Asset_USDV_Pool_USDT']
  const rewarderStartTime = Epochs.Nov15
  const WOM_EPOCH_AMOUNT = network === Network.ETHEREUM_MAINNET ? parseEther('11174') : parseEther('3724')

  await runScript(
    'Deploy_USDV_rewarders_thru_Factory',
    async () => {
      const { multisig: multisigAddress } = await getNamedAccounts()
      const INITIAL_WOM_RATE = convertTokenPerEpochToTokenPerSec(WOM_EPOCH_AMOUNT)

      return concatAll(
        // whitelist reward tokens
        multisig.utils.whitelistRewardTokenForBribeRewarderFactory([Token.WOM, Token.USDV]),
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
      // USDV is whitelisted
      assert(
        await bribeRewarderFactory.isRewardTokenWhitelisted(await getTokenAddress(Token.USDV)),
        'USDV should be whitelisted after the operation'
      )
    }
  )

  // TODO: run the following separately (read the deployed contract addresses from mainnet), after the above are executed.

  await runScript(
    'Top_up_USDV_rewarders_and_add_operator',
    async () => {
      return concatAll(
        multisig.utils.topUpBoostedRewarder('Asset_USDV_Pool_USDV', Token.WOM, WOM_EPOCH_AMOUNT.mul(4)),
        multisig.utils.topUpBoostedRewarder('Asset_USDV_Pool_USDT', Token.WOM, WOM_EPOCH_AMOUNT.mul(4))
      )
    },
    async () => {
      const lpUsdvRewarder = await getBoostedRewarderAddress(assetsToDeployRewarderFor[0])
      const lpUsdtRewarder = await getBoostedRewarderAddress(assetsToDeployRewarderFor[1])

      assert(await isContractAddress(lpUsdvRewarder), 'Not a contract address')
      assert(await isContractAddress(lpUsdtRewarder), 'Not a contract address')
    }
  )
})()
