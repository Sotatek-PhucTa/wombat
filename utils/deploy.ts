import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import { deployments, ethers, network, upgrades } from 'hardhat'
import { DeploymentResult, IAssetInfo, IPoolConfig, PoolInfo } from '../types'
import { confirmTxn, getTestERC20, logVerifyCommand } from '../utils'
import { getTokenAddress } from '../config/token'

export async function deployTestAsset(tokenSymbol: string) {
  const erc20 = await getTestERC20(tokenSymbol)
  return ethers.deployContract('Asset', [erc20.address, `${tokenSymbol} Asset`, `LP-${tokenSymbol}`])
}

export function getPoolDeploymentName(contractNamePrefix: string, poolName: string) {
  if (contractNamePrefix === '') return poolName

  return contractNamePrefix + '_' + poolName
}

export function getAssetContractName(poolName: string, tokenSymbol: string) {
  return `Asset_${poolName}_${tokenSymbol}`
}

/**
 * Deploy a base pool contract. The caller should handle the pool specific setup.
 */
export async function deployBasePool(
  poolContract: string,
  poolName: string,
  pooInfo: PoolInfo<IPoolConfig>,
  deployer: string,
  multisig: string
): Promise<DeploymentResult> {
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const { deploy } = deployments
  const setting = pooInfo.setting
  const contractName = getPoolDeploymentName(setting.deploymentNamePrefix, poolName)

  const deployResult = await deploy(contractName, {
    from: deployer,
    log: true,
    contract: poolContract,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: multisig,
      proxyContract: 'OptimizedTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [setting.ampFactor, setting.haircut],
        },
      },
    },
  })

  // Get freshly deployed pool contract
  const pool = await ethers.getContractAt(poolContract, deployResult.address)
  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  deployments.log('Contract address:', deployResult.address)
  deployments.log('Implementation address:', implAddr)

  if (deployResult.newlyDeployed) {
    const masterWombatV3Deployment = await deployments.get('MasterWombatV3')
    if (masterWombatV3Deployment.address) {
      deployments.log('Setting master wombat: ', masterWombatV3Deployment.address)
      await confirmTxn(pool.connect(deployerSigner).setMasterWombat(masterWombatV3Deployment.address))
    }

    // Check setup config values
    const ampFactor = await pool.ampFactor()
    const hairCutRate = await pool.haircutRate()
    deployments.log(`Amplification factor is : ${formatEther(ampFactor)}`)
    deployments.log(`Haircut rate is : ${formatEther(hairCutRate)}`)

    // transfer pool contract dev to Gnosis Safe
    deployments.log(`Transferring dev of ${deployResult.address} to ${multisig}...`)
    // The dev of the pool contract can pause and unpause pools & assets!
    await confirmTxn(pool.connect(deployerSigner).setDev(multisig))
    deployments.log(`Transferred dev of ${deployResult.address} to:`, multisig)

    // Admin scripts
    deployments.log(
      `setFee to ${formatEther(setting.lpDividendRatio)} for lpDividendRatio and ${
        setting.retentionRatio
      } for retentionRatio...`
    )
    await confirmTxn(pool.connect(deployerSigner).setFee(setting.lpDividendRatio, setting.retentionRatio))

    deployments.log(`setFeeTo to ${multisig}.`)
    await confirmTxn(pool.connect(deployerSigner).setFeeTo(multisig))

    deployments.log(`setMintFeeThreshold to ${formatEther(setting.mintFeeThreshold)}...`)
    await confirmTxn(pool.connect(deployerSigner).setMintFeeThreshold(setting.mintFeeThreshold))

    logVerifyCommand(network.name, deployResult)
  } else {
    deployments.log(`${contractName} Contract already deployed.`)
  }

  return { deployResult, contract: pool }
}

/**
 * deploy asset with the new config interface `IAssetInfo`
 */
export async function deployAssetV2(
  network: string,
  deployer: string,
  multisig: string,
  assetInfo: IAssetInfo,
  poolAddress: string,
  pool: Contract,
  contractName: string
): Promise<DeploymentResult> {
  const { deploy } = deployments
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Attemping to deploy Asset contract for: ${assetInfo.tokenName} of pool ${poolAddress}`)
  const tokenName = assetInfo.tokenName
  const tokenSymbol = assetInfo.tokenSymbol
  const underlyingTokenAddr = assetInfo.underlyingToken
    ? await getTokenAddress(assetInfo.underlyingToken)
    : assetInfo.underlyingTokenAddr
  const oracleAddress = assetInfo.oracleAddress
  const assetContractName = assetInfo.assetContractName ?? 'Asset'
  const name = `Wombat ${tokenName} Asset`
  const symbol = `LP-${tokenSymbol}`
  if (underlyingTokenAddr == undefined) {
    throw 'invalid asset info for ' + assetInfo.tokenName
  }

  const args: string[] = [underlyingTokenAddr, name, symbol]
  if (oracleAddress) args.push(oracleAddress)

  const deployResult = await deploy(contractName, {
    from: deployer,
    contract: assetContractName,
    log: true,
    args: args,
    skipIfAlreadyDeployed: true,
  })
  const address = deployResult.address
  const asset = await ethers.getContractAt(assetContractName, address)

  if (assetContractName === 'PriceFeedAsset') {
    await deployPriceFeed(
      deployer,
      multisig,
      assetInfo,
      asset,
      `PriceFeed_${contractName}_${assetInfo.priceFeed?.priceFeedContract}`
    )
  }

  // newly-deployed Asset
  if (deployResult.newlyDeployed) {
    deployments.log('Configuring asset...')

    // Remove old and add new Asset to newly-deployed Pool
    const underlyingTokens = await pool.getTokens()
    if (!underlyingTokens.includes(underlyingTokenAddr)) {
      deployments.log(`Adding new asset for ${contractName}`)
      await confirmTxn(pool.connect(deployerSigner).addAsset(underlyingTokenAddr, address))
    } else {
      deployments.log(`Removing the old asset for ${contractName} and adding new asset`)
      await confirmTxn(pool.connect(deployerSigner).removeAsset(underlyingTokenAddr))
      await confirmTxn(pool.connect(deployerSigner).addAsset(underlyingTokenAddr, address))
    }

    // Add pool reference to Asset
    await confirmTxn(await asset.connect(deployerSigner).setPool(poolAddress))
    deployments.log(`Added ${tokenSymbol} Asset at ${address} to Pool located ${poolAddress}`)

    // transfer asset LP token contract ownership to Gnosis Safe
    // The owner of the asset contract can change our pool address and change asset max supply
    deployments.log(`Transferring ownership of asset ${asset.address} to ${multisig}...`)
    await confirmTxn(asset.connect(deployerSigner).transferOwnership(multisig))
    deployments.log(`Transferred ownership of asset ${asset.address} to ${multisig}...`)

    logVerifyCommand(network, deployResult)
  } else {
    // Sanity check for already deployed assets

    const underlyingTokens = await pool.getTokens()
    if (!underlyingTokens.includes(underlyingTokenAddr)) {
      deployments.log(`!! Asset ${contractName} is not in the pool ${underlyingTokens}`)
      // uncomment to add asset
      // await confirmTxn(pool.connect(owner).addAsset(underlyingTokenAddr, address))
    }

    // check existing asset have latest pool address
    const existingPoolAddress = await asset.pool()
    if (existingPoolAddress !== poolAddress) {
      deployments.log(`Should add existing ${contractName} to the pool ${poolAddress}...`)
      // uncomment to set pool
      // await confirmTxn(await asset.connect(owner).setPool(poolAddress))
    }
  }

  return { deployResult, contract: asset }
}

export async function deployPriceFeed(
  deployer: string,
  multisig: string,
  assetInfo: IAssetInfo,
  asset: Contract,
  contractName: string
) {
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const { deploy } = deployments

  deployments.log(
    `Attemping to deploy price feed for: ${assetInfo.tokenName} with args ${assetInfo.priceFeed!.deployArgs}`
  )
  if (!assetInfo.priceFeed) {
    throw `assetInfo.priceFeed for ${assetInfo.tokenName} is full`
  }

  const priceFeedDeployResult = await deploy(contractName, {
    from: deployer,
    contract: assetInfo.priceFeed!.priceFeedContract,
    log: true,
    args: assetInfo.priceFeed!.deployArgs,
    skipIfAlreadyDeployed: true,
  })
  if (priceFeedDeployResult.newlyDeployed) {
    deployments.log(`Transferring ownership of price feed ${priceFeedDeployResult.address} to ${multisig}...`)
    await confirmTxn(asset.connect(deployerSigner).transferOwnership(multisig))
    deployments.log(`Transferred ownership of price feed ${priceFeedDeployResult.address} to ${multisig}...`)

    // set price feed for the asset
    console.log(await asset.owner(), deployerSigner.address)
    await confirmTxn(asset.connect(deployerSigner).setPriceFeed(priceFeedDeployResult.address))
  }
}
