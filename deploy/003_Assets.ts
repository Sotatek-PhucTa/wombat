import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { USD_TOKENS_ARGS } from './002_Mock_Tokens'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  // Get Deployer as Signer
  const [owner] = await ethers.getSigners()

  if (hre.network.name == 'localhost' || hre.network.name == 'hardhat' || hre.network.name == 'bsc_testnet') {
    console.log(`Step 003. Deploying on : ${hre.network.name} with account : ${deployer}`)

    // create asset contracts, e.g. LP-USDC, LP-BUSD, etc. for the ERC20 stablecoins list
    for (const index in USD_TOKENS_ARGS) {
      // console.log('Attemping to deploy Asset contract : ' + USD_TOKENS_ARGS[index][0])
      const tokenSymbol = USD_TOKENS_ARGS[index][1] as string
      const tokenName = USD_TOKENS_ARGS[index][0] as string

      // Get deployed token instance
      const token = await deployments.get(tokenSymbol)

      // console.log(`Successfully got erc20 token ${tokenSymbol} instance at: ${token.address}`)

      const usdAssetDeployResult = await deploy(`Asset_${tokenSymbol}`, {
        from: deployer,
        contract: 'Asset',
        log: true,
        args: [token.address, `Wombat ${tokenName} Asset`, `LP-${tokenSymbol}`],
        skipIfAlreadyDeployed: true,
      })

      // Add asset addresses & token reference to pool
      if (usdAssetDeployResult.newlyDeployed) {
        // Get Pool Instance
        const poolDeployment = await deployments.get('Pool')
        const pool = await ethers.getContractAt('Pool', poolDeployment.address)

        // Add Asset to Pool
        const addAssetTxn = await pool.connect(owner).addAsset(token.address, usdAssetDeployResult.address)
        // wait until the transaction is mined
        await addAssetTxn.wait()

        // Add pool reference to Asset
        const asset = await ethers.getContractAt('Asset', usdAssetDeployResult.address)
        const setPoolTxn = await asset.connect(owner).setPool(poolDeployment.address)
        await setPoolTxn.wait()

        console.log(
          `Added ${tokenSymbol} Asset at ${usdAssetDeployResult.address} to Pool located ${poolDeployment.address}`
        )
      }
    }
  }
}

export default deployFunc
deployFunc.tags = ['Asset']
deployFunc.dependencies = ['Pool'] // this ensure the Token script above is executed first, so `deployments.get('Pool')` succeeds
