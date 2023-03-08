import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { USD_TOKENS_MAP } from '../tokens.config'
import { confirmTxn, logVerifyCommand } from '../utils'

const contractName = 'Asset'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  deployments.log(`Step 011. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // create asset contracts, e.g. LP-USDC, LP-BUSD, etc. for the ERC20 stablecoins list
  const USD_TOKENS = USD_TOKENS_MAP[hre.network.name]

  // Get Pool Instance
  const poolDeployment = await deployments.get('Pool')
  const poolAddress = poolDeployment.address
  const pool = await ethers.getContractAt('Pool', poolAddress)

  for (const index in USD_TOKENS) {
    deployments.log('Attemping to deploy Asset contract : ' + USD_TOKENS[index][0])
    const tokenName = USD_TOKENS[index][0] as string
    const tokenSymbol = USD_TOKENS[index][1] as string
    const maybeAddress = USD_TOKENS[index][2] as string
    const tokenAddress = ethers.utils.isAddress(maybeAddress)
      ? maybeAddress
      : (await deployments.get(tokenSymbol)).address
    deployments.log(`Successfully got erc20 token ${tokenSymbol} instance at: ${tokenAddress}`)

    const name = `Wombat ${tokenName} Asset`
    const symbol = `LP-${tokenSymbol}`
    const usdAssetDeployResult = await deploy(`Asset_P01_${tokenSymbol}`, {
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

      deployments.log(`Added ${tokenSymbol} Asset at ${address} to Pool located ${poolAddress}`)

      // transfer asset LP token contract ownership to Gnosis Safe
      deployments.log(`Transferring ownership of ${tokenAddress} to ${multisig}...`)
      // The owner of the asset contract can change our pool address and change asset max supply
      const transferOwnershipTxn = await asset.connect(owner).transferOwnership(multisig)
      await transferOwnershipTxn.wait()
      deployments.log(`Transferred ownership of ${tokenAddress} to:`, multisig)

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
          deployments.log(`Adding existing Asset_${tokenSymbol} to new pool ${poolAddress}...`)
          await addPool(asset, owner, poolAddress)
        }
      }
    }
  }

  // finally transfer pool contract ownership to Gnosis Safe after admin scripts completed
  deployments.log(`Transferring ownership of ${poolAddress} to ${multisig}...`)
  // The owner of the pool contract is very powerful!
  await confirmTxn(pool.connect(owner).transferOwnership(multisig))
  deployments.log(`Transferred ownership of ${poolAddress} to:`, multisig)
}

async function removeAsset(pool: any, owner: any, tokenAddress: string) {
  try {
    const removeAssetTxn = await pool.connect(owner).removeAsset(tokenAddress)
    // wait until the transaction is mined
    await removeAssetTxn.wait()
  } catch (err) {
    // do nothing as asset already does not exists in pool
  }
}

async function addAsset(pool: any, owner: any, tokenAddress: string, assetAddress: string) {
  try {
    const addAssetTxn = await pool.connect(owner).addAsset(tokenAddress, assetAddress)
    // wait until the transaction is mined
    await addAssetTxn.wait()
  } catch (err) {
    // do nothing as asset already exists in pool
  }
}

async function addPool(asset: any, owner: any, poolAddress: string) {
  try {
    const setPoolTxn = await asset.connect(owner).setPool(poolAddress)
    await setPoolTxn.wait()
  } catch (err) {
    // this should not happen
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['Pool'] // this ensure the Token script above is executed first, so `deployments.get('Pool')` succeeds
