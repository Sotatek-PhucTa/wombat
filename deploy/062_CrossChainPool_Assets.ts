import { parseEther } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { TestERC20 } from '../build/typechain'
import { CROSS_CHAIN_POOL_TOKENS_MAP } from '../config/pools.config'
import { confirmTxn, getDeadlineFromNow, getDeployedContract } from '../utils'
import { deployAssetV2, getAssetDeploymentName, getPoolDeploymentName } from '../utils/deploy'
import { contractNamePrefix } from './060_CrossChainPool'
import { getCurrentNetwork } from '../types/network'

const contractName = 'CrossChainPoolAssets'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const network = getCurrentNetwork()

  deployments.log(`Step 062. Deploying on : ${network}...`)

  /// Deploy pool
  const CROSS_CHAIN_POOL_TOKENS = CROSS_CHAIN_POOL_TOKENS_MAP[network] || {}
  for (const [poolName, poolInfo] of Object.entries(CROSS_CHAIN_POOL_TOKENS)) {
    const poolContractName = getPoolDeploymentName(contractNamePrefix, poolName)
    const pool = await getDeployedContract('CrossChainPool', poolContractName)

    for (const [, assetInfo] of Object.entries(poolInfo.assets)) {
      await deployAssetV2(
        hre.network.name,
        deployer,
        multisig,
        assetInfo,
        pool.address,
        pool,
        getAssetDeploymentName(poolName, assetInfo.tokenSymbol)
      )
    }

    // finally transfer pool contract ownership to Gnosis Safe after admin scripts completed
    deployments.log(`Transferring ownership of pool ${pool.address} to ${multisig}...`)
    // The owner of the pool contract is very powerful!
    await confirmTxn(pool.connect(deployerSigner).transferOwnership(multisig))
    deployments.log(`Transferred ownership of pool ${pool.address} to ${multisig}...`)
  }
}

// TODO: find a place for this utility.
async function faucetToken(tokenSymbol: string, pool: Contract, deployer: string) {
  const token0 = (await getDeployedContract('TestERC20', tokenSymbol)) as TestERC20
  deployments.log('faucet token...', tokenSymbol)
  const decimals = await token0.decimals()
  await confirmTxn(token0.faucet(parseUnits('100000', decimals)))

  // approve & deposit tokens
  deployments.log('approve tokens...')
  await confirmTxn(token0.approve(pool.address, parseEther('100000000')))
  deployments.log('deposit tokens...')
  await confirmTxn(
    pool.deposit(token0.address, parseUnits('10000', decimals), 0, deployer, await getDeadlineFromNow(3600), false)
  )
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['CrossChainPool']
