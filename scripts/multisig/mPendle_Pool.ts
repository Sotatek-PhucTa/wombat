import assert from 'assert'
import { runScript } from '.'
import { Token } from '../../config/token'
import { concatAll, getDeployedContract } from '../../utils'
import * as multisig from '../../utils/multisig'
import { parseEther } from 'ethers/lib/utils'

const pool = 'FactoryPools_mPendle_Pool_Proxy'

runScript(
  'mPendle_Pool_Rescue',
  async () => {
    return concatAll(
      multisig.utils.unpausePool(pool),
      multisig.utils.addCash('Asset_mPendle_Pool_PENDLE', Token.PENDLE, parseEther('334104.126')),
      multisig.utils.addCash('Asset_mPendle_Pool_mPendle', Token.mPendle, parseEther('269313.342')),
      multisig.utils.pausePool(pool)
    )
  },
  async () => {
    const pendleCovRatio = await covRatio('Asset_mPendle_Pool_PENDLE')
    assert(pendleCovRatio == 99_999, `Expected r to be 1, got ${pendleCovRatio} instead`)

    const mPendleCovRatio = await covRatio('Asset_mPendle_Pool_mPendle')
    assert(mPendleCovRatio == 99_999, `Expected r to be 1, got ${mPendleCovRatio} instead`)

    const poolContract = await getDeployedContract('PoolV2', pool)
    const { equilCovRatio } = await poolContract.globalEquilCovRatio()
    assert(equilCovRatio.gt(parseEther('0.999999')), `Expected r* to be >0.999999, got ${equilCovRatio} instead`)
  }
)

async function covRatio(assetDeployment: string) {
  const asset = await getDeployedContract('Asset', assetDeployment)
  const cash = await asset.cash()
  const liab = await asset.liability()
  return cash.mul(100_000).div(liab)
}
