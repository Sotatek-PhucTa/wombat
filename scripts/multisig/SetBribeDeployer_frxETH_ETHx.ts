import { runScript } from '.'
import { ExternalContract } from '../../config/contract'
import { Token } from '../../config/token'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

const frxETH_ASSETS = ['Asset_frxETH_Pool_frxETH', 'Asset_frxETH_Pool_sfrxETH', 'Asset_frxETH_Pool_WETH']
const ETHx_ASSETS = ['Asset_ETHx_Pool_ETHx', 'Asset_ETHx_Pool_WETH']

runScript('SetBribeDeployer_frxETH_ETHx', async () => {
  return concatAll(
    ...frxETH_ASSETS.map((assetDeployment) =>
      multisig.utils.setBribeOperatorForAsset(assetDeployment, ExternalContract.StaderBribeOperator)
    ),
    ...ETHx_ASSETS.map((assetDeployment) =>
      multisig.utils.setBribeOperatorForAsset(assetDeployment, ExternalContract.FraxBribeOperator)
    ),
    multisig.utils.whitelistRewardToken(Token.SD),
    multisig.utils.whitelistRewardToken(Token.FXS)
  )
})
