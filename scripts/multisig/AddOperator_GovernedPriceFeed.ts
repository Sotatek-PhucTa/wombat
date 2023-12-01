import { getNamedAccounts } from 'hardhat'
import { runScript } from '.'
import * as multisig from '../../utils/multisig'
import { getCurrentNetwork } from '../../types/network'
import assert from 'assert'
import { Network } from '../../types'

runScript('AddOperator_GovernedPriceFeed', async () => {
  const network = getCurrentNetwork()
  assert(
    network === Network.OPTIMISM_MAINNET || network === Network.ARBITRUM_MAINNET || network === Network.BSC_MAINNET,
    'Network not supported'
  )
  const { sandy } = await getNamedAccounts()
  const operators = [sandy]
  return multisig.utils.addOperatorsToGovernedPriceFeed(
    'PriceFeed_GovernedPriceFeed_Asset_frxETH_Pool_sfrxETH',
    operators
  )
})
