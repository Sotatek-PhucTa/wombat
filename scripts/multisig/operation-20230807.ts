import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { Token } from '../../config/token'
import { parseEther } from 'ethers/lib/utils'

runScript('operation-20230807', async () => {
  const network = getCurrentNetwork()
  if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_mPendle_Pool_PENDLE', Token.WOM, parseEther('1582')),
      multisig.utils.topUpRewarder('MultiRewarderPerSec_V3_Asset_mPendle_Pool_mPendle', Token.WOM, parseEther('880'))
    )
  } else {
    return []
  }
})
