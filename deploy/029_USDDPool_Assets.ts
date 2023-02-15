import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { USDD_POOL_TOKENS_MAP } from '../tokens.config'
import { confirmTxn, logVerifyCommand } from '../utils'

const contractName = 'USDDPoolAsset'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 025. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // create asset contracts, e.g. LP-USDC, LP-BUSD, etc. for the ERC20 stablecoins list
  const USDD_POOL_TOKENS = USDD_POOL_TOKENS_MAP[hre.network.name]

  // Get Pool Instance
  const poolDeployment = await deployments.get('USDDPool')
  const poolAddress = poolDeployment.address
  const pool = await ethers.getContractAt('HighCovRatioFeePoolV2', poolAddress)

  for (const index in USDD_POOL_TOKENS) {
    console.log('Attemping to deploy Asset contract : ' + USDD_POOL_TOKENS[index][0])
    const tokenSymbol = USDD_POOL_TOKENS[index][1] as string
    const tokenName = USDD_POOL_TOKENS[index][0] as string

    const tokenAddress: string =
      hre.network.name == 'bsc_mainnet'
        ? (USDD_POOL_TOKENS[index][2] as string)
        : ((await deployments.get(tokenSymbol)).address as string)
    console.log(`Successfully got erc20 token ${tokenSymbol} instance at: ${tokenAddress}`)

    const name = `Wombat ${tokenName} Asset`
    const symbol = `LP-${tokenSymbol}`
    const usdAssetDeployResult = await deploy(`Asset_USDDPool_${tokenSymbol}`, {
      from: deployer,
      contract: 'Asset',
      log: true,
      args: [tokenAddress, name, symbol],
      skipIfAlreadyDeployed: true,
    })
    const address = usdAssetDeployResult.address
    const asset = await ethers.getContractAt('Asset', address)

    // newly-deployed Asset
    if (usdAssetDeployResult.newlyDeployed) {
      // Remove old and add new Asset to newly-deployed Pool
      await removeAsset(pool, owner, tokenAddress)
      await addAsset(pool, owner, tokenAddress, address)

      // Add pool reference to Asset
      await addPool(asset, owner, poolAddress)

      console.log(`Added ${tokenSymbol} Asset at ${address} to Pool located ${poolAddress}`)

      if (hre.network.name == 'bsc_mainnet') {
        // transfer asset LP token contract ownership to Gnosis Safe
        console.log(`Transferring ownership of ${tokenAddress} to ${multisig}...`)
        // The owner of the asset contract can change our pool address and change asset max supply
        const transferOwnershipTxn = await asset.connect(owner).transferOwnership(multisig)
        await transferOwnershipTxn.wait()
        console.log(`Transferred ownership of ${tokenAddress} to:`, multisig)
      }

      logVerifyCommand(hre.network.name, usdAssetDeployResult)
    } else {
      // mainnet assets would be added back to existing pool via multisig proposal
      if (hre.network.name != 'bsc_mainnet') {
        // Add new Asset to existing Pool
        await addAsset(pool, owner, tokenAddress, address)

        // check existing asset have latest pool added
        const existingPoolAddress = await asset.pool()

        if (existingPoolAddress !== poolAddress) {
          // Add existing asset to newly-deployed Pool
          console.log(`Adding existing Asset_${tokenSymbol} to new pool ${poolAddress}...`)
          await addPool(asset, owner, poolAddress)
        }
      }
    }
  }

  // finally transfer pool contract ownership to Gnosis Safe after admin scripts completed
  console.log(`Transferring ownership of ${poolAddress} to ${multisig}...`)
  // The owner of the pool contract is very powerful!
  const transferOwnershipTxn = await pool.connect(owner).transferOwnership(multisig)
  await transferOwnershipTxn.wait()
  console.log(`Transferred ownership of ${poolAddress} to:`, multisig)
}

async function removeAsset(pool: any, owner: any, tokenAddress: string) {
  try {
    await confirmTxn(pool.connect(owner).removeAsset(tokenAddress))
  } catch (err) {
    // do nothing as asset already does not exists in pool
  }
}

async function addAsset(pool: any, owner: any, tokenAddress: string, assetAddress: string) {
  try {
    await confirmTxn(pool.connect(owner).addAsset(tokenAddress, assetAddress))
  } catch (err) {
    // do nothing as asset already exists in pool
  }
}

async function addPool(asset: any, owner: any, poolAddress: string) {
  try {
    await confirmTxn(asset.connect(owner).setPool(poolAddress))
  } catch (err) {
    // this should not happen
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['USDDPool'] // this ensure the Token script above is executed first, so `deployments.get('SidePool_01')` succeeds
