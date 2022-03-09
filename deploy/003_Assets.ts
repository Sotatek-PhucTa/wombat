import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { USD_TOKENS_MAP } from './002_Mock_Tokens'

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

    // Add asset addresses & token reference to pool
    if (usdAssetDeployResult.newlyDeployed) {
      // Get Pool Instance
      const poolDeployment = await deployments.get('Pool')
      const pool = await ethers.getContractAt('Pool', poolDeployment.address)

      // Add Asset to Pool
      const addAssetTxn = await pool.connect(owner).addAsset(tokenAddress, usdAssetDeployResult.address)
      // wait until the transaction is mined
      await addAssetTxn.wait()

      // Add pool reference to Asset
      const asset = await ethers.getContractAt('Asset', usdAssetDeployResult.address)
      const setPoolTxn = await asset.connect(owner).setPool(poolDeployment.address)
      await setPoolTxn.wait()

      const address = usdAssetDeployResult.address
      console.log(`Added ${tokenSymbol} Asset at ${address} to Pool located ${poolDeployment.address}`)
      console.log(
        `To verify, run: hh verify --network ${hre.network.name} ${address} ${tokenAddress} '${name}' '${symbol}'`
      )
    }
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['Pool'] // this ensure the Token script above is executed first, so `deployments.get('Pool')` succeeds
