import { parseEther } from 'ethers/lib/utils'
import { runScript } from '.'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'

runScript('SetMaxSupply', async () => {
  const network = getCurrentNetwork()
  if (network === Network.ARBITRUM_MAINNET) {
    return Promise.all([
      multisig.utils.setMaxSupply('Asset_WstETH_Pool_wstETH', parseEther('3200')),
      // multisig.utils.setMaxSupply('Asset_WstETH_Pool_WETH', parseEther('3200')),
    ])
  } else {
    throw new Error('Wrong network')
  }
})
