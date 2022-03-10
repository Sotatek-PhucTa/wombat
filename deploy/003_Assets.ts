import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { USD_TOKENS_MAP } from './000_Config'

const contractName = 'Asset'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  // Get Deployer as Signer
  const [owner] = await ethers.getSigners()

  console.log(`Step 003. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // create asset contracts, e.g. LP-USDC, LP-BUSD, etc. for the ERC20 stablecoins list
  const USD_TOKENS = USD_TOKENS_MAP[hre.network.name]

  // Get Pool Instance
  const poolDeployment = await deployments.get('Pool')
  const pool = await ethers.getContractAt('Pool', poolDeployment.address)

  for (const index in USD_TOKENS) {
    console.log('Attemping to deploy Asset contract : ' + USD_TOKENS[index][0])
    const tokenSymbol = USD_TOKENS[index][1] as string
    const tokenName = USD_TOKENS[index][0] as string

    const tokenAddress =
      hre.network.name == 'bsc_mainnet' ? USD_TOKENS[index][2] : (await deployments.get(tokenSymbol)).address
    console.log(`Successfully got erc20 token ${tokenSymbol} instance at: ${tokenAddress}`)

    const name = `Wombat ${tokenName} Asset`
    const symbol = `LP-${tokenSymbol}`
    const usdAssetDeployResult = await deploy(`Asset_${tokenSymbol}`, {
      from: deployer,
      contract: 'Asset',
      log: true,
      args: [tokenAddress, name, symbol],
      skipIfAlreadyDeployed: true,
    })
    const address = usdAssetDeployResult.address

    // newly-deployed Asset
    if (usdAssetDeployResult.newlyDeployed) {
      // Add new Asset to existing or newly-deployed Pool
      await addAsset(pool, owner, tokenAddress, address)

      // Add pool reference to Asset
      const asset = await ethers.getContractAt('Asset', address)
      await addPool(asset, owner, poolDeployment)

      console.log(`Added ${tokenSymbol} Asset at ${address} to Pool located ${poolDeployment.address}`)
      console.log(
        `To verify, run: hh verify --network ${hre.network.name} ${address} ${tokenAddress} '${name}' '${symbol}'`
      )
    } else {
      // Add existing asset to existing or newly-deployed Pool
      const assetDeployment = await deployments.get(`Asset_${tokenSymbol}`)
      const existingAsset = await ethers.getContractAt('Asset', assetDeployment.address)
      await addPool(existingAsset, owner, poolDeployment)

      // Add Asset to existing or newly-deployed Pool
      await addAsset(pool, owner, tokenAddress, address)
    }
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
