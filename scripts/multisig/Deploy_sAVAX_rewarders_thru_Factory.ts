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
import { ExternalContract, getContractAddress } from '../../config/contract'
import { BribeRewarderFactory } from '../../build/typechain'
;(async function () {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  assert(network == Network.AVALANCHE_MAINNET, `Network ${network} is not supported.`)
  const assetsToDeployRewarderFor = ['Asset_sAVAX_Pool_WAVAX', 'Asset_sAVAX_Pool_sAVAX']
  const rewarderStartTime = unsafeIsoStringToEpochSeconds('2023-10-25T06:00Z') // 2023 Oct 25 2PM HKT
  const EPOCH_AMOUNT = parseEther('32429')
  const BENQI_OPERATOR_ADDRESS = await getContractAddress(ExternalContract.BenqiOperator)

  await runScript(
    'Deploy_sAVAX_rewarders_thru_Factory',
    async () => {
      const { multisig: multisigAddress } = await getNamedAccounts()
      const INITIAL_WOM_RATE = convertTokenPerEpochToTokenPerSec(EPOCH_AMOUNT)

      return concatAll(
        // set Bribe Rewarder Factory
        multisig.utils.setBribeRewarderFactory(),
        // whitelist reward tokens
        multisig.utils.whitelistRewardTokenForBribeRewarderFactory([Token.WOM, Token.BENQI]),
        // set deployer to multisig
        ...assetsToDeployRewarderFor.map((asset) =>
          multisig.utils.setRewarderDeployerInFactory(asset, multisigAddress)
        ),
        // deploy rewarders
        ...assetsToDeployRewarderFor.map((asset) =>
          multisig.utils.deployRewarderThroughFactory(asset, Token.WOM, rewarderStartTime, INITIAL_WOM_RATE)
        ),
        // revoke WOM
        multisig.utils.revokeRewardTokenForBribeRewarderFactory([Token.WOM]),
        // set deployer to Benqi operator
        ...assetsToDeployRewarderFor.map((asset) =>
          multisig.utils.setRewarderDeployerInFactory(asset, BENQI_OPERATOR_ADDRESS)
        )
      )
    },
    async () => {
      const bribeRewarderFactory = (await getDeployedContract('BribeRewarderFactory')) as BribeRewarderFactory
      // WOM is not whitelisted
      assert(
        !(await bribeRewarderFactory.isRewardTokenWhitelisted(await getTokenAddress(Token.WOM))),
        'WOM should not be whitelisted after the operation'
      )
      // QI is whitelisted
      assert(
        await bribeRewarderFactory.isRewardTokenWhitelisted(await getTokenAddress(Token.BENQI)),
        'BENQI should be whitelisted after the operation'
      )
    }
  )

  // TODO: run the following separately (read the deployed contract addresses from mainnet), after the above are executed.

  await runScript(
    'Top_up_sAVAX_rewarders_and_add_operator',
    async () => {
      return concatAll(
        multisig.utils.topUpBoostedRewarder('Asset_sAVAX_Pool_WAVAX', Token.WOM, EPOCH_AMOUNT.mul(4)),
        multisig.utils.topUpBoostedRewarder('Asset_sAVAX_Pool_sAVAX', Token.WOM, EPOCH_AMOUNT.mul(4)),
        multisig.utils.addOperatorForRewarder(
          ['Asset_sAVAX_Pool_WAVAX', 'Asset_sAVAX_Pool_sAVAX'],
          BENQI_OPERATOR_ADDRESS
        )
      )
    },
    async () => {
      const lpAvaxRewarder = await getBoostedRewarderAddress(assetsToDeployRewarderFor[0])
      const lpSAvaxRewarder = await getBoostedRewarderAddress(assetsToDeployRewarderFor[1])

      assert(await isContractAddress(lpSAvaxRewarder), 'Not a contract address')
      assert(await isContractAddress(lpAvaxRewarder), 'Not a contract address')
    }
  )
})()
