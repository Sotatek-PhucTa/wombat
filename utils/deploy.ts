import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import { deployments, ethers, network, upgrades } from 'hardhat'
import { getContractAddress } from '../config/contract'
import { getTokenAddress } from '../config/token'
import { DeploymentResult, IAssetInfo, IGovernedPriceFeed, IPoolConfig, PoolInfo } from '../types'
import {
  confirmTxn,
  getDeployedContract,
  getTestERC20,
  getUnderlyingTokenAddr,
  isOwner,
  logVerifyCommand,
} from '../utils'

export async function deployTestAsset(tokenSymbol: string) {
  const erc20 = await getTestERC20(tokenSymbol)
  return ethers.deployContract('Asset', [erc20.address, `${tokenSymbol} Asset`, `LP-${tokenSymbol}`])
}

export function getPoolDeploymentName(contractNamePrefix: string, poolName: string) {
  if (contractNamePrefix === '') return poolName

  return contractNamePrefix + '_' + poolName
}

export function getAssetDeploymentName(poolName: string, tokenSymbol: string) {
  return `Asset_${poolName}_${tokenSymbol}`
}

export function getBribeDeploymentName(assetDeployment: string) {
  return `Bribe_${assetDeployment}`
}

export function getRewarderDeploymentName(assetDeployment: string) {
  return `MultiRewarderPerSec_V3_${assetDeployment}`
}

/**
 * Deploy a base pool contract. The caller should handle the pool specific setup.
 */
export async function deployBasePool(
  poolContract: string,
  poolName: string,
  pooInfo: PoolInfo<IPoolConfig>,
  deployer: string,
  multisig: string,
  libraries?: { [key: string]: string }
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
    libraries,
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
    const masterWombatV3Deployment = await deployments.getOrNull('MasterWombatV3')
    if (masterWombatV3Deployment?.address) {
      deployments.log('Setting master wombat: ', masterWombatV3Deployment.address)
      await confirmTxn(pool.connect(deployerSigner).setMasterWombat(masterWombatV3Deployment.address))
    } else {
      deployments.log('MasterWombatV3 is not deployed yet.')
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
      `setFee to ${formatEther(setting.lpDividendRatio)} for lpDividendRatio and ${formatEther(
        setting.retentionRatio
      )} for retentionRatio...`
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
  deploymentName: string
): Promise<DeploymentResult> {
  const { deploy } = deployments
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Attemping to deploy Asset contract for: ${assetInfo.tokenName} of pool ${poolAddress}`)
  const tokenName = assetInfo.tokenName
  const tokenSymbol = assetInfo.tokenSymbol
  const underlyingTokenAddr = assetInfo.underlyingToken
    ? await getTokenAddress(assetInfo.underlyingToken)
    : assetInfo.underlyingTokenAddr
  const oracleAddress = assetInfo.oracle ? await getContractAddress(assetInfo.oracle) : assetInfo.oracleAddress
  const assetContractName = assetInfo.assetContractName ?? 'Asset'
  const name = `Wombat ${tokenName} Asset`
  const symbol = `LP-${tokenSymbol}`
  if (underlyingTokenAddr == undefined) {
    throw 'invalid asset info for ' + assetInfo.tokenName
  }

  const args: string[] = [underlyingTokenAddr, name, symbol]
  if (oracleAddress) args.push(oracleAddress)

  const deployResult = await deploy(deploymentName, {
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
      `PriceFeed_${assetInfo.priceFeed?.contract}_${deploymentName}`,
      deployResult.newlyDeployed
    )
  }

  // newly-deployed Asset
  if (deployResult.newlyDeployed) {
    deployments.log('Configuring asset...')

    if (assetContractName != 'Asset') {
      deployments.log('Asset relative price is...')
      const relativePrice = await asset.getRelativePrice()
      deployments.log(`${formatEther(relativePrice)}`)
    }

    // Remove old and add new Asset to newly-deployed Pool
    const underlyingTokens = await pool.getTokens()
    if (!underlyingTokens.includes(underlyingTokenAddr)) {
      if (await isOwner(pool, deployer)) {
        deployments.log(`Adding ${deploymentName} to pool ${pool.address}`)
        await confirmTxn(pool.connect(deployerSigner).addAsset(underlyingTokenAddr, address))
      } else {
        deployments.log(
          `Deployer is not owner of pool. Please propose multisig to add asset at ${address} to pool at ${pool.address}`
        )
      }
    } else {
      deployments.log(`Removing the old asset for ${deploymentName} and adding new asset`)
      await confirmTxn(pool.connect(deployerSigner).removeAsset(underlyingTokenAddr))
      await confirmTxn(pool.connect(deployerSigner).addAsset(underlyingTokenAddr, address))
    }

    // Add pool reference to Asset
    await confirmTxn(await asset.connect(deployerSigner).setPool(poolAddress))
    deployments.log(`Added ${tokenSymbol} Asset at ${address} to Pool located ${poolAddress}`)

    // Set max supply
    if (assetInfo.maxSupply) {
      await confirmTxn(await asset.connect(deployerSigner).setMaxSupply(assetInfo.maxSupply))
      deployments.log(`${deploymentName} set max supply to ${formatEther(assetInfo.maxSupply)}`)
    }

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
      deployments.log(
        `!! Asset ${deploymentName} is not in the pool. Expected ${underlyingTokenAddr} in [${underlyingTokens}]`
      )
      // uncomment to add asset
      // await confirmTxn(pool.connect(owner).addAsset(underlyingTokenAddr, address))
    }

    // check existing asset have latest pool address
    const existingPoolAddress = await asset.pool()
    if (existingPoolAddress !== poolAddress) {
      deployments.log(`Should add existing ${deploymentName} to the pool ${poolAddress}...`)
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
  deploymentName: string,
  assetNewlyDeployed: boolean
) {
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const { deploy } = deployments

  deployments.log(`Attemping to deploy price feed for: ${assetInfo.tokenName}`)
  if (!assetInfo.priceFeed) {
    throw `assetInfo.priceFeed for ${assetInfo.tokenName} is full`
  }

  if (assetInfo.priceFeed.contract === 'GovernedPriceFeed') {
    const priceFeed = assetInfo.priceFeed as IGovernedPriceFeed

    // deploy `GovernedPriceFeed` contract
    const deployResult = await deploy(deploymentName, {
      from: deployer,
      contract: priceFeed.contract,
      log: true,
      args: [await getTokenAddress(priceFeed.token), priceFeed.initialPrice, priceFeed.maxDeviation],
      skipIfAlreadyDeployed: true,
    })

    if (deployResult.newlyDeployed) {
      const priceFeedContract = await getDeployedContract(priceFeed.contract, deploymentName)
      deployments.log(`Transferring ownership of price feed ${deployResult.address} to ${multisig}...`)
      await confirmTxn(priceFeedContract.connect(deployerSigner).transferOwnership(multisig))
      deployments.log(`Transferred ownership of price feed ${deployResult.address} to ${multisig}...`)

      deployments.log('Setting price feed for asset...')
      await confirmTxn(asset.connect(deployerSigner).setPriceFeed(deployResult.address))
    }
    logVerifyCommand(network.name, deployResult)
  } else if (['ChainlinkPriceFeed', 'PythPriceFeed'].includes(assetInfo.priceFeed.contract)) {
    const priceFeedContract = await getDeployedContract(assetInfo.priceFeed.contract)
    deployments.log('Latest price for the underlying token is...')
    try {
      deployments.log(formatEther(await priceFeedContract.getLatestPrice(getUnderlyingTokenAddr(assetInfo))))
    } catch (e) {
      deployments.log('Failed to get latest price. Is the price feed configured?')
    }

    if (assetNewlyDeployed) {
      const priceFeedDeployment = await deployments.get(assetInfo.priceFeed.contract)
      deployments.log('Setting price feed for asset...')
      await confirmTxn(asset.connect(deployerSigner).setPriceFeed(priceFeedDeployment.address))
    }
  }
}
