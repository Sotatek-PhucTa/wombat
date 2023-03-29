import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { FACTORYPOOL_TOKENS_MAP } from '../tokens.config'
import { Network } from '../types'
import { confirmTxn, getDeployedContract, getUnderlyingTokenAddr } from '../utils'
import { deployAssetV2 } from '../utils/deploy'
import { getFactoryPoolContractName } from './050_FactoryPool'

const contractName = 'FactoryPoolsAssets'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigned = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 051. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // create asset contracts, e.g. LP-USDC, LP-BUSD, etc. for the ERC20 stablecoins list
  const FACTORYPOOL_TOKENS = FACTORYPOOL_TOKENS_MAP[hre.network.name as unknown as Network] || {}
  for (const [poolName, poolInfo] of Object.entries(FACTORYPOOL_TOKENS)) {
    // Get Pool Instance
    const poolContractName = getFactoryPoolContractName(poolName)
    const pool = await getDeployedContract('HighCovRatioFeePoolV2', poolContractName)

    for (const [tokenSymbol, assetInfo] of Object.entries(poolInfo)) {
      const tokenAddress = await getUnderlyingTokenAddr(assetInfo)

      await deployAssetV2(
        hre.network.name,
        deployer,
        multisig,
        Object.assign(assetInfo, { underlyingTokenAddr: tokenAddress }),
        pool.address,
        pool,
        `Asset_${poolName}_${assetInfo.tokenSymbol}`
      )
    }

    // finally transfer pool contract ownership to Gnosis Safe after admin scripts completed
    deployments.log(`Transferring ownership of pool ${pool.address} to ${multisig}...`)
    // The owner of the pool contract is very powerful!
    await confirmTxn(pool.connect(deployerSigned).transferOwnership(multisig))
    deployments.log(`Transferred ownership of pool ${pool.address} to ${multisig}...`)
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['MockTokens', 'FactoryPools'] // this ensure the Token script above is executed first, so `deployments.get('DynamicPool')` succeeds
