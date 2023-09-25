import { runScript } from '.'
import { Network } from '../../types'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import assert from 'assert'
import { Token } from '../../config/token'
import { getNamedAccounts } from 'hardhat'
import { constants } from 'ethers'
import { unsafeIsoStringToEpochSeconds } from '../../config/epoch'

runScript('Whitelist_Multisig_To_Deploy_Rewarders', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.BSC_MAINNET) {
    const { multisig: multisigAddress } = await getNamedAccounts()

    const assetsToDeployRewarderFor = [
      'Asset_zUSD_Pool_zUSD',
      'Asset_zUSD_Pool_USDC',
      'Asset_zBNB_Pool_zBNB',
      'Asset_zBNB_Pool_WBNB',
    ]

    return concatAll(
      // whitelist reward tokens
      multisig.utils.whitelistRewardTokenForBribeRewarderFactory([Token.WOM]),
      // set deployer to multisig
      ...assetsToDeployRewarderFor.map((asset) => multisig.utils.setRewarderDeployerInFactory(asset, multisigAddress)),
      // deploy rewarders
      ...assetsToDeployRewarderFor.map((asset) =>
        multisig.utils.deployRewarderThroughFactory(
          asset,
          Token.WOM,
          unsafeIsoStringToEpochSeconds('2023-09-26T10:00Z'), // 2023 Sep 26 6PM HKT
          constants.Zero
        )
      ),
      // revoke WOM as having WOM as reward token for bribes might cause issues with Wombex
      multisig.utils.revokeRewardTokenForBribeRewarderFactory([Token.WOM])
    )
  } else {
    assert(false, `Network ${network} is not supported.`)
  }
})
