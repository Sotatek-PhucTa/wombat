import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { CROSS_CHAIN_POOL_TOKENS_MAP } from '../config/pools.config'
import { confirmTxn, getDeployedContract } from '../utils'
import { deployBasePool } from '../utils/deploy'
import { getCurrentNetwork } from '../types/network'
import { ICrossChainPoolConfig } from '../types'

export const contractNamePrefix = 'CrossChainPool'
const tags = ['FirstClass']

const deployFunc = async function () {
  const { deployer } = await getNamedAccounts()
  const network = getCurrentNetwork()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const coreV3Deployment = await getDeployedContract('CoreV3')
  deployments.log(`Step 060. Deploying on : ${network}...`)

  /// Deploy pool
  const CROSS_CHAIN_POOL_TOKENS = CROSS_CHAIN_POOL_TOKENS_MAP[network] || {}
  for (const [poolName, poolInfo] of Object.entries(CROSS_CHAIN_POOL_TOKENS)) {
    const { deployResult, contract: pool } = await deployBasePool(contractNamePrefix, poolName, poolInfo, {
      CoreV3: coreV3Deployment.address,
    })

    // Get freshly deployed Pool pool
    if (deployResult.newlyDeployed) {
      await configureCrossChainPool(deployerSigner, pool, poolInfo.setting)
    }
  }
}

async function configureCrossChainPool(
  deployerSigner: SignerWithAddress,
  pool: Contract,
  config: ICrossChainPoolConfig
) {
  deployments.log('configure cross chain pool...')
  await confirmTxn(pool.connect(deployerSigner).setMaximumInboundCredit(config.maximumInboundCredit))
  await confirmTxn(pool.connect(deployerSigner).setMaximumOutboundCredit(config.maximumOutboundCredit))

  await confirmTxn(
    pool.connect(deployerSigner).setCrossChainHaircut(config.tokensForCreditHaircut, config.creditForTokensHaircut)
  )

  await confirmTxn(pool.connect(deployerSigner).setSwapTokensForCreditEnabled(config.swapTokensForCreditEnabled))
  await confirmTxn(pool.connect(deployerSigner).setSwapCreditForTokensEnabled(config.swapCreditForTokensEnabled))
}
// Sample swaps:
// - https://testnet.bscscan.com/tx/0xe80a7a90887383e3f201ad73d8a6e46188d66d73d41051123161607d2e696255
// - https://testnet.bscscan.com/tx/0x46fd8910593dd81ee03994a04efe88456e690108544afb1fe6c78ea4276a228e

export default deployFunc
deployFunc.tags = [contractNamePrefix, ...tags]
deployFunc.dependencies = ['MockTokens', 'CoreV3']
