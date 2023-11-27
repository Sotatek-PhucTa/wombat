import { runScript } from '.'
import { Network } from '../../types'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import assert from 'assert'
import { ExternalContract, getContractAddress } from '../../config/contract'

runScript('SetOperator_Rewarder_USDV', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  assert(
    [
      Network.AVALANCHE_MAINNET,
      Network.ARBITRUM_MAINNET,
      Network.BSC_MAINNET,
      Network.ETHEREUM_MAINNET,
      Network.OPTIMISM_MAINNET,
    ].includes(network),
    `Network ${network} is not supported.`
  )
  const assetsToDeployRewarderFor = ['Asset_USDV_Pool_USDV', 'Asset_USDV_Pool_USDT']
  const USDV_OPERATOR_ADDRESS = await getContractAddress(ExternalContract.USDVEoaOperator)

  return concatAll(
    ...assetsToDeployRewarderFor.map((asset) =>
      multisig.utils.setRewarderDeployerInFactory(asset, USDV_OPERATOR_ADDRESS)
    ),
    multisig.utils.addOperatorForRewarder(assetsToDeployRewarderFor, USDV_OPERATOR_ADDRESS)
  )
})
