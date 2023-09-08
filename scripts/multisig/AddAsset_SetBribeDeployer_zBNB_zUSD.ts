import { runScript } from '.'
import { ExternalContract } from '../../config/contract'
import { Token } from '../../config/token'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'

const ASSETS = ['Asset_zBNB_Pool_zBNB', 'Asset_zBNB_Pool_WBNB', 'Asset_zUSD_Pool_zUSD', 'Asset_zUSD_Pool_USDC']

runScript('AddAssets_zBNB_zUSD_Pool', async () => {
  return concatAll(
    ...ASSETS.map((assetDeployment) => multisig.utils.addAssetToMasterWombatAndVoter(assetDeployment, false)),
    ...ASSETS.map((assetDeployment) =>
      multisig.utils.setBribeOperatorForAsset(assetDeployment, ExternalContract.HorizonBribeOperator)
    ),
    multisig.utils.whitelistRewardToken(Token.HZN)
  )
})
