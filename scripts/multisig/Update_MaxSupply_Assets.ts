import { runScript } from '.'
import { IPoolConfig, Network, NetworkPoolInfo } from '../../types'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import _ from 'lodash'
import assert from 'assert'
import { DYNAMICPOOL_TOKENS_MAP } from '../../config/pools.config'

runScript('Update_MaxSupply_Assets', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.AVALANCHE_MAINNET) {
    return multisig.utils.updateMaxSupply(
      ['sAVAX_Pool'],
      DYNAMICPOOL_TOKENS_MAP[network] as NetworkPoolInfo<IPoolConfig>
    )
  } else {
    assert(false, `Network ${network} is not supported.`)
  }
})
