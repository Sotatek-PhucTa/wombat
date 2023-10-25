import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { Token } from '../../config/token'
import { parseEther } from 'ethers/lib/utils'
import _ from 'lodash'

runScript('operation-20231025', async () => {
  const network = getCurrentNetwork()
  if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      // todo: deprecate topUpRewarder and create a version that reads from emissions.config.ts, so we can keep the config in one place
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_fUSDC_Pool_fUSDC', Token.WOM, parseEther('1125')),
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_fUSDC_Pool_USDCe', Token.WOM, parseEther('1125'))
    )
  } else {
    return []
  }
})
