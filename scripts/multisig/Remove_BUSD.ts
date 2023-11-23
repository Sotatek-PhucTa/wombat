import assert from 'assert'
import { runScript } from '.'
import { Network } from '../../types'
import { getCurrentNetwork } from '../../types/network'
import { concatAll, getDeployedContract, getDeploymentAddress } from '../../utils'
import * as multisig from '../../utils/multisig'
import { Token, getTokenAddress } from '../../config/token'
import { BigNumber, BigNumberish } from 'ethers'
import { ethers, getNamedAccounts } from 'hardhat'
import { Safe } from '../../utils/multisig/transactions'
import { formatEther } from 'ethers/lib/utils'

const MAIN_POOL = 'MainPool_Proxy'
const LP_BUSD = 'Asset_MainPool_BUSD'
// using StandalonePool2 as BUSD is already in StandalonePool
const standAlonePool2Deployment = 'FactoryPools_StandalonePool2_Proxy'

runScript(
  'Remove_BUSD',
  async () => {
    const network: Network = getCurrentNetwork()
    console.log(`Running against network: ${network}`)
    assert(network == Network.BSC_MAINNET)
    const amountOut = await getAmountOut(LP_BUSD)
    console.log('BUSD excess amount', formatEther(amountOut))

    const router = await getDeployedContract('WombatRouter')
    const tokenPath = [await getTokenAddress(Token.USDT), await getTokenAddress(Token.BUSD)]
    const poolPath = [await getDeploymentAddress(MAIN_POOL)]
    const { amountIn } = await router.getAmountIn(tokenPath, poolPath, amountOut)
    console.log('USDT needed', formatEther(amountIn))

    return concatAll(
      multisig.utils.unpausePool(MAIN_POOL),
      swap(tokenPath, poolPath, amountIn),
      multisig.utils.removeAssets([LP_BUSD], standAlonePool2Deployment)
    )
  },
  async () => {
    const covRatio = await getCoverageRatioBips(LP_BUSD)
    console.log('covRatioBips', covRatio)
    // 100% +- 1bips
    assert(covRatio.gte(9999) && covRatio.lte(10001))
  }
)

// TODO: move this to multisig util
// TODO: use Token and enum to replace string
async function swap(tokenPath: string[], poolPath: string[], amountIn: BigNumberish) {
  assert(tokenPath.length >= 2)
  assert(poolPath.length >= 1)
  assert(tokenPath.length == poolPath.length + 1)
  const router = await getDeployedContract('WombatRouter')
  const { multisig } = await getNamedAccounts()
  const erc20 = await ethers.getContractAt('ERC20', tokenPath[0])
  return [
    Safe(erc20).approve(router.address, amountIn),
    Safe(router).swapExactTokensForTokens(
      tokenPath,
      poolPath,
      amountIn,
      BigNumber.from(amountIn).mul(9999).div(10000), // 1bps slippage
      multisig,
      ethers.constants.MaxUint256 // no deadline
    ),
  ]
}

async function getAmountOut(assetName: string) {
  const asset = await getDeployedContract('Asset', assetName)
  const [cash, liab, dec] = await Promise.all([asset.cash(), asset.liability(), asset.underlyingTokenDecimals()])
  assert(dec == 18, `Not implemented: handle token decimals`)
  assert(cash.gt(liab), `cov ratio < 100%!`)
  return cash.sub(liab)
}

async function getCoverageRatioBips(assetName: string) {
  const asset = await getDeployedContract('Asset', assetName)
  const [cash, liab] = await Promise.all([asset.cash(), asset.liability()])
  console.log(assetName, 'cov ratio', cash.mul(10000).div(liab).toString(), 'bips')
  return cash.mul(10000).div(liab)
}
