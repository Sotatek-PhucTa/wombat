import { runScript } from '.'
import { getCurrentNetwork } from '../../types/network'
import * as multisig from '../../utils/multisig'
import { Network } from '../../types'
import { concatAll } from '../../utils'
import { getBribes, getRewarders } from '../../config/emissions.config'
import { getBribeDeploymentName, getRewarderDeploymentName } from '../../utils/deploy'
import _ from 'lodash'
import { Token } from '../../config/token'

runScript('operation-20231128', async () => {
  const network = getCurrentNetwork()
  if (network == Network.BSC_MAINNET) {
    return concatAll(
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getRewarders(), ['Asset_stables_01_FRAX', 'Asset_frxETH_Pool_frxETH']),
        getRewarderDeploymentName,
        2,
        [Token.WOM]
      ),
      multisig.utils.updateEmissionsAndTopUp(
        _.pick(getBribes(), [
          'Asset_SnBNB_Pool_SnBNB',
          'Asset_SnBNB_Pool_WBNB',
          'Asset_SidePool_01_HAY',
          'Asset_HAY_Pool_USDC',
          'Asset_HAY_Pool_USDT',
        ]),
        getBribeDeploymentName
      )
    )
  } else {
    return []
  }
})
