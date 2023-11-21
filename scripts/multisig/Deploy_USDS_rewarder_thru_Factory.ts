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
import { Epochs } from '../../config/epoch'
import { parseEther } from 'ethers/lib/utils'
import { BribeRewarderFactory } from '../../build/typechain'
import { ExternalContract, getContractAddress } from '../../config/contract'
;(async function () {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  assert(Network.BASE_MAINNET === network, `Network ${network} is not supported.`)
  assert(isForkedNetwork(), 'multi-stage proposal requires running in a forked network')
  const assetsToDeployRewarderFor = ['Asset_USDS_Pool_USDS', 'Asset_USDS_Pool_USDbC']
  const rewarderStartTime = Epochs.Nov22
  const SABLE_OPERATOR_ADDRESS = await getContractAddress(ExternalContract.SableOperator)

  await runScript(
    'Deploy_USDS_rewarders_thru_Factory',
    async () => {
      const { multisig: multisigAddress } = await getNamedAccounts()
      const INITIAL_RATE = parseEther('500000').div(30 * 86400)

      return concatAll(
        // MasterWombat add asset
        ...assetsToDeployRewarderFor.map((asset) => multisig.utils.addAssetToMasterWombat(asset)),
        // whitelist reward tokens
        multisig.utils.whitelistRewardTokenForBribeRewarderFactory([Token.SABLE]),
        // set deployer to multisig
        ...assetsToDeployRewarderFor.map((asset) =>
          multisig.utils.setRewarderDeployerInFactory(asset, multisigAddress)
        ),
        // deploy rewarders
        ...assetsToDeployRewarderFor.map((asset) =>
          multisig.utils.deployRewarderThroughFactory(asset, Token.SABLE, rewarderStartTime, INITIAL_RATE)
        ),
        // set deployer to Benqi operator
        ...assetsToDeployRewarderFor.map((asset) =>
          multisig.utils.setRewarderDeployerInFactory(asset, SABLE_OPERATOR_ADDRESS)
        )
      )
    },
    async () => {
      const bribeRewarderFactory = (await getDeployedContract('BribeRewarderFactory')) as BribeRewarderFactory
      // USDS is whitelisted
      assert(
        await bribeRewarderFactory.isRewardTokenWhitelisted(await getTokenAddress(Token.SABLE)),
        'SABLE should be whitelisted after the operation'
      )
      // check boosted rewarder for each asset is deployed
      for await (const asset of assetsToDeployRewarderFor) {
        const rewarderAddress = await getBoostedRewarderAddress(asset)
        assert(await isContractAddress(rewarderAddress), 'Not a contract address')
      }
    },
    true
  )

  await runScript(
    'Add_operator_USDS_rewarders',
    async () => {
      return concatAll(multisig.utils.addOperatorForRewarder(assetsToDeployRewarderFor, SABLE_OPERATOR_ADDRESS))
    },
    async () => {
      const lpUsdsRewarder = await getBoostedRewarderAddress(assetsToDeployRewarderFor[0])
      const lpUsdbcRewarder = await getBoostedRewarderAddress(assetsToDeployRewarderFor[1])

      assert(await isContractAddress(lpUsdsRewarder), 'Not a contract address')
      assert(await isContractAddress(lpUsdbcRewarder), 'Not a contract address')
    },
    true
  )
})()
