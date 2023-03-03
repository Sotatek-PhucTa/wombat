import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { FRXETH_POOL_TOKENS_MAP } from '../tokens.config'
import { confirmTxn } from '../utils'
// TODO refactor deployAsset to a util function
import { deployAsset } from './035_stkBnbPool_Assets'

const contractName = 'frxETH_Pool_Assets'
const poolContractName = 'frxETH_Pool'
const assetContractPrefix = 'Asset_frxETH_Pool_'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer, multisig } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  deployments.log(`Step 037. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // create asset contracts, e.g. LP-USDC, LP-BUSD, etc. for the ERC20 stablecoins list
  const POOL_TOKENS = FRXETH_POOL_TOKENS_MAP[hre.network.name]

  // Get Pool Instance
  const poolDeployment = await deployments.get(poolContractName)
  const poolAddress = poolDeployment.address
  const pool = await ethers.getContractAt('DynamicPoolV2', poolAddress)

  for (const deployArgs of Object.values(POOL_TOKENS)) {
    await deployAsset(
      hre.network.name,
      deployer,
      multisig,
      owner,
      deployments,
      deployArgs as Array<string>,
      poolAddress,
      pool,
      assetContractPrefix + deployArgs[1]
    )
  }

  // finally transfer pool contract ownership to Gnosis Safe after admin scripts completed
  deployments.log(`Transferring ownership of ${poolAddress} to ${multisig}...`)
  // The owner of the pool contract is very powerful!
  await confirmTxn(pool.connect(owner).transferOwnership(multisig))
  deployments.log(`Transferred ownership of ${poolAddress} to:`, multisig)
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = [poolContractName, 'MockTokens']
