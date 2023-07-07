import { parseEther } from 'ethers/lib/utils'
import { runScript } from '.'
import * as multisig from '../../utils/multisig'

runScript('SetMaxSupply', async () => {
  return Promise.all([
    multisig.utils.setMaxSupply('Asset_WstETH_Pool_wstETH', parseEther('3200')),
    // multisig.utils.setMaxSupply('Asset_WstETH_Pool_WETH', parseEther('3200')),
  ])
})
