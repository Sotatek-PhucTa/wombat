import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import assert from 'assert'

runScript('SmartHayPool_BUSD', async () => {
  const network = await getCurrentNetwork()
  assert(network == Network.BSC_MAINNET, 'Wrong network')
  const assets = ['Asset_SidePool_01_BUSD']
  return concatAll(multisig.utils.pauseBribeFor(assets), multisig.utils.removeAssets(assets))
})
