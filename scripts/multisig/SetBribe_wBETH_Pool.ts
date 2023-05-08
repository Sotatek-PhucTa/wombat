import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('SetBribe_wBETH_Pool', async function () {
  return concatAll(
    multisig.utils.setBribe('Bribe_Asset_wBETH_Pool_wBETH'),
    multisig.utils.setBribe('Bribe_Asset_wBETH_Pool_ETH')
  )
})
