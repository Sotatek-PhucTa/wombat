import { runScript } from '.'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

runScript('RemoveAsset_MAI', async () => {
  return concatAll(multisig.utils.removeAssets(['Asset_FRAX_Pool_MAI']))
})
