import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { getRewarders } from '../../config/emissions.config'
import _ from 'lodash'
import { assert } from 'chai'
import { BatchTransaction } from '../../utils/multisig/tx-builder'
import { getRewarderDeploymentName } from '../../utils/deploy'
import { convertTokenPerSecToTokenPerEpoch } from '../../config/emission'

runScript('TopUpAgEURRewarders', async function (): Promise<BatchTransaction[]> {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.ETHEREUM_MAINNET) {
    const assetsToTopUp = ['Asset_agEUR_Pool_EURe', 'Asset_agEUR_Pool_agEUR']

    const txns: BatchTransaction[] = []
    for await (const [asset, config] of Object.entries(getRewarders()).filter(([asset, _]) =>
      assetsToTopUp.includes(asset)
    )) {
      for await (const [token, tokenPerSec] of _.zip(config.rewardTokens, config.tokenPerSec)) {
        assert(token != undefined && tokenPerSec != undefined)
        txns.push(
          ...(await multisig.utils.topUpRewarder(
            getRewarderDeploymentName(asset),
            token,
            convertTokenPerSecToTokenPerEpoch(tokenPerSec)
          ))
        )
      }
    }
    return txns
  } else {
    return []
  }
})
