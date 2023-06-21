import { parseEther, parseUnits } from 'ethers/lib/utils'
import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll } from '../../utils'
import * as multisig from '../../utils/multisig'
import { Token } from '../../config/token'

runScript('WeeklyBribe', async () => {
  const network: Network = getCurrentNetwork()
  console.log(`Running against network: ${network}`)
  if (network == Network.ARBITRUM_MAINNET) {
    return concatAll(
      // USD+ pool
      multisig.utils.topUpBribe('Bribe_Asset_USDPlus_Pool_USD+', Token.USDPlus, 0),
      multisig.utils.topUpBribe('Bribe_Asset_USDPlus_Pool_DAI+', Token.USDPlus, 0),
      multisig.utils.topUpBribe('Bribe_Asset_USDPlus_Pool_USD+', Token.DAI, parseEther('3900')),
      multisig.utils.topUpBribe('Bribe_Asset_USDPlus_Pool_DAI+', Token.DAI, parseEther('2100')),
      multisig.utils.topUpBribe('Bribe_Asset_USDPlus_Pool_USDC', Token.DAI, parseEther('1000')),
      // FRAX-USD+ pool
      multisig.utils.topUpBribe('Bribe_Asset_FRAX_Pool_USD+', Token.USDPlus, 0)
    )
  } else if (network == Network.BSC_MAINNET) {
    return concatAll(
      // HAY-USDC-USDT pool
      multisig.utils.topUpBribe('Bribe_Asset_HAY_Pool_HAY', Token.HAY, parseEther('1000')),
      multisig.utils.topUpBribe('Bribe_Asset_HAY_Pool_USDC', Token.HAY, parseEther('1000')),
      multisig.utils.topUpBribe('Bribe_Asset_HAY_Pool_USDT', Token.HAY, parseEther('1000')),

      // Mixed pool
      multisig.utils.topUpBribe('Bribe_Asset_Mixed_Pool_HAY', Token.HAY, parseEther('1500')),
      multisig.utils.topUpBribe('Bribe_Asset_Mixed_Pool_USD+', Token.USDPlus, 0),
      multisig.utils.topUpBribe('Bribe_Asset_Mixed_Pool_USDT+', Token.USDPlus, 0),
      multisig.utils.topUpBribe('Bribe_Asset_Mixed_Pool_USD+', Token.DAI, parseEther('3000')),
      multisig.utils.topUpBribe('Bribe_Asset_Mixed_Pool_USDT+', Token.DAI, parseEther('3000')),
      multisig.utils.topUpBribe('Bribe_Asset_Mixed_Pool_CUSD', Token.CUSD, parseEther('1000')),
      multisig.utils.topUpBribe('Bribe_Asset_Mixed_Pool_USDC', Token.USDC, parseEther('600'))
    )
  } else {
    return []
  }
})
