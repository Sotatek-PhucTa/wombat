import assert from 'assert'
import { runScript } from '.'
import { CROSS_CHAIN_POOL_TOKENS_MAP } from '../../config/pools.config'
import { ICrossChainPoolConfig, Network, NetworkPoolInfo } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll, multisig } from '../../utils'
import { CrossChainPoolType } from '../../config/wormhole.config'

const NETWORKS = [Network.AVALANCHE_MAINNET, Network.BSC_MAINNET, Network.ETHEREUM_MAINNET, Network.ARBITRUM_MAINNET]

runScript('EnableCrossChainSwap_Stablecoin_Pool', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  assert(NETWORKS.includes(network), 'Current network is not supported')
  return concatAll(
    multisig.utils.updateCrossChainSwapSettings(
      ['Stablecoin_Pool'],
      CROSS_CHAIN_POOL_TOKENS_MAP[network] as NetworkPoolInfo<ICrossChainPoolConfig>
    ),
    multisig.utils.syncCrossChainPool(CrossChainPoolType.stablecoin, network, NETWORKS)
  )
})
