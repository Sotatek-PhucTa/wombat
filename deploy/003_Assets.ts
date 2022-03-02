import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { USD_TOKENS_MOCKS } from './002_Mock_Tokens'

// starting 4 stables, all 18 decimals
const USD_TOKENS_MAINNET = {
  BUSD: ['Binance USD', 'BUSD', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'],
  USDC: ['USD Coin', 'USDC', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'],
  USDT: ['Tether USD', 'USDT', '0x55d398326f99059ff775485246999027b3197955'],
  DAI: ['Dai Stablecoin', 'DAI', '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3'],
}

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  // Get Deployer as Signer
  const [owner] = await ethers.getSigners()

  console.log(`Step 003. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // create asset contracts, e.g. LP-USDC, LP-BUSD, etc. for the ERC20 stablecoins list
  const USD_TOKENS = hre.network.name == 'bsc_mainnet' ? { ...USD_TOKENS_MAINNET } : { ...USD_TOKENS_MOCKS }
  for (const index in USD_TOKENS) {
    console.log('Attemping to deploy Asset contract : ' + USD_TOKENS[index][0])
    const tokenSymbol = USD_TOKENS[index][1] as string
    const tokenName = USD_TOKENS[index][0] as string

    const tokenAddress =
      hre.network.name == 'bsc_mainnet' ? USD_TOKENS[index][2] : (await deployments.get(tokenSymbol)).address
    console.log(`Successfully got erc20 token ${tokenSymbol} instance at: ${tokenAddress}`)

    const usdAssetDeployResult = await deploy(`Asset_${tokenSymbol}`, {
      from: deployer,
      contract: 'Asset',
      log: true,
      args: [tokenAddress, `Wombat ${tokenName} Asset`, `LP-${tokenSymbol}`],
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

      console.log(
        `Added ${tokenSymbol} Asset at ${usdAssetDeployResult.address} to Pool located ${poolDeployment.address}`
      )
    }
  }
}

export default deployFunc
deployFunc.tags = ['Asset']
deployFunc.dependencies = ['Pool'] // this ensure the Token script above is executed first, so `deployments.get('Pool')` succeeds
