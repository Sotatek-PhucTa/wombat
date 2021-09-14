import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { BTC_TOKENS_ARGS, USD_TOKENS_ARGS, ETH_TOKENS_ARGS } from './002_Mock_Tokens'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  // For the moment, only on localhost
  if (hre.network.name == 'localhost' || hre.network.name == 'hardhat' || hre.network.name == 'bsc') {
    /// USD Tokens ///
    const usdAggregateAccountDeployResult = await deploy('USD_Aggregate', {
      from: deployer,
      contract: 'AggregateAccount',
      log: true,
      args: ['USD_Aggregate', true],
      skipIfAlreadyDeployed: false,
    })

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
        args: [
          token.address,
          `Wombat ${tokenName} Asset`,
          `LP-${tokenSymbol}`,
          usdAggregateAccountDeployResult.address,
        ],
        skipIfAlreadyDeployed: true,
      })

      // Add Assets to pool and set reference in Asset
      if (usdAssetDeployResult.newlyDeployed) {
        // Get Pool Instance
        const poolDeployment = await deployments.get('Pool')
        const pool = await ethers.getContractAt('Pool', poolDeployment.address)

        // Add Asset to Pool
        await pool.addAsset(token.address, usdAssetDeployResult.address)

        // Add pool reference to Asset
        const asset = await ethers.getContractAt('Asset', usdAssetDeployResult.address)
        await asset.setPool(poolDeployment.address)

        console.log(
          `Added ${tokenSymbol} Asset at ${usdAssetDeployResult.address} to Pool located ${poolDeployment.address}`
        )
      }
    }

    /// ETH tokens ///
    const ethAggregateAccountDeployResult = await deploy('ETH_Aggregate', {
      from: deployer,
      contract: 'AggregateAccount',
      log: true,
      args: ['ETH_Aggregate', false],
      skipIfAlreadyDeployed: true,
    })

    for (const index in ETH_TOKENS_ARGS) {
      // console.log('Attemping to deploy Asset contract : ' + USD_TOKENS_ARGS[index][0])
      const tokenSymbol = ETH_TOKENS_ARGS[index][1] as string
      const tokenName = ETH_TOKENS_ARGS[index][0] as string

      // Get deployed token instance
      const token = await deployments.get(tokenSymbol)

      // console.log(`Successfully got erc20 token ${tokenSymbol} instance at: ${token.address}`)

      const ethAssetDeployResult = await deploy(`Asset_${tokenSymbol}`, {
        from: deployer,
        contract: 'Asset',
        log: true,
        args: [
          token.address,
          `Wombat ${tokenName} Asset`,
          `LP-${tokenSymbol}`,
          ethAggregateAccountDeployResult.address,
        ],
        skipIfAlreadyDeployed: true,
      })

      // Add Assets to pool and set reference in Asset
      if (ethAssetDeployResult.newlyDeployed) {
        // Get Pool Instance
        const poolDeployment = await deployments.get('Pool')
        const pool = await ethers.getContractAt('Pool', poolDeployment.address)

        // Add Asset to Pool
        await pool.addAsset(token.address, ethAssetDeployResult.address)

        // Add pool reference to Asset
        const asset = await ethers.getContractAt('Asset', ethAssetDeployResult.address)
        await asset.setPool(poolDeployment.address)

        console.log(
          `Added ${tokenSymbol} Asset at ${ethAssetDeployResult.address} to Pool located ${poolDeployment.address}`
        )
      }
    }

    /// BTC tokens ///
    const btcAggregateAccountDeployResult = await deploy('BTC_Aggregate', {
      from: deployer,
      contract: 'AggregateAccount',
      log: true,
      args: ['BTC_Aggregate', false],
      skipIfAlreadyDeployed: true,
    })

    for (const index in BTC_TOKENS_ARGS) {
      // console.log('Attemping to deploy Asset contract : ' + USD_TOKENS_ARGS[index][0])
      const tokenSymbol = BTC_TOKENS_ARGS[index][1] as string
      const tokenName = BTC_TOKENS_ARGS[index][0] as string

      // Get deployed token instance
      const token = await deployments.get(tokenSymbol)

      // console.log(`Successfully got erc20 token ${tokenSymbol} instance at: ${token.address}`)

      const btcAssetDeployResult = await deploy(`Asset_${tokenSymbol}`, {
        from: deployer,
        contract: 'Asset',
        log: true,
        args: [
          token.address,
          `Wombat ${tokenName} Asset`,
          `LP-${tokenSymbol}`,
          btcAggregateAccountDeployResult.address,
        ],
        skipIfAlreadyDeployed: true,
      })

      // Add Assets to pool and set reference in Asset
      if (btcAssetDeployResult.newlyDeployed) {
        // Get Pool Instance
        const poolDeployment = await deployments.get('Pool')
        const pool = await ethers.getContractAt('Pool', poolDeployment.address)

        // Add Asset to Pool
        await pool.addAsset(token.address, btcAssetDeployResult.address)

        // Add pool reference to Asset
        const asset = await ethers.getContractAt('Asset', btcAssetDeployResult.address)
        await asset.setPool(poolDeployment.address)

        console.log(
          `Added ${tokenSymbol} Asset at ${btcAssetDeployResult.address} to Pool located ${poolDeployment.address}`
        )
      }
    }
  }
}

export default deployFunc
deployFunc.tags = ['Asset']
deployFunc.dependencies = ['Pool'] // this ensure the Token script above is executed first, so `deployments.get('Pool')` succeeds
