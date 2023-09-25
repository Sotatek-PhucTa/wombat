import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumberish, Contract, ContractReceipt } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import { deployments, ethers, getNamedAccounts, upgrades } from 'hardhat'
import { getContractAddress, getContractAddressOrDefault } from '../config/contract'
import { getTokenAddress } from '../config/token'
import { DeploymentResult, IAssetInfo, IGovernedPriceFeed, IPoolConfig, IRewarder, PoolInfo } from '../types'
import {
  confirmTxn,
  getAddress,
  getDeadlineFromNow,
  getDeployedContract,
  getTestERC20,
  getUnderlyingTokenAddr,
  isOwner,
  logVerifyCommand,
} from '../utils'
import assert from 'assert'
import { DeployResult } from 'hardhat-deploy/types'
import { BribeRewarderFactory } from '../build/typechain'
import {} from '@matterlabs/hardhat-zksync-upgradable'
import { deployProxyZksync, isZkSync } from './zksync'

export async function deployTestAsset(tokenSymbol: string) {
  const erc20 = await getTestERC20(tokenSymbol)
  return ethers.deployContract('Asset', [erc20.address, `${tokenSymbol} Asset`, `LP-${tokenSymbol}`])
}

export function getPoolDeploymentName(contractNamePrefix: string, poolName: string) {
  if (contractNamePrefix === '') return poolName

  return contractNamePrefix + '_' + poolName
}

export function getWormholeAdaptorDeploymentName(poolName: string) {
  return 'WormholeAdaptor_' + poolName
}

export function getProxyName(contract: string) {
  return `${contract}_Proxy`
}

export function getImplementationName(contract: string) {
  return `${contract}_Implementation`
}

export function getAssetDeploymentName(poolName: string, tokenSymbol: string) {
  // remove any '.' from asset name
  return `Asset_${poolName}_${tokenSymbol.replace('.', '')}`
}

export function getBribeDeploymentName(assetDeployment: string) {
  return `Bribe_${assetDeployment}`
}

export function getRewarderDeploymentName(assetDeployment: string) {
  return `MultiRewarderPerSec_V3_${assetDeployment}`
}

export async function getAllAssetsDeployments(): Promise<string[]> {
  const allDeployements = await deployments.all()
  return Object.keys(allDeployements).filter((name) => name.startsWith('Asset_'))
}

export async function getProxyAdminOwner(): Promise<string> {
  const { multisig } = await getNamedAccounts()
  // First deployment. Use multisig as owner.
  if ((await deployments.getOrNull('DefaultProxyAdmin')) == undefined) {
    return multisig
  }

  // The ProxyAdmin may now be owned by multisig or timelock.
  const proxyAdmin = await getDeployedContract('ProxyAdmin', 'DefaultProxyAdmin')
  return proxyAdmin.owner()
}

/**
 * Deploy a base pool contract. The caller should handle the pool specific setup.
 */
export async function deployBasePool(
  poolContract: string,
  poolName: string,
  pooInfo: PoolInfo<IPoolConfig>,
  libraries?: { [key: string]: string }
): Promise<DeploymentResult> {
  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const setting = pooInfo.setting
  const deploymentName = getPoolDeploymentName(setting.deploymentNamePrefix, poolName)

  const deployResult = await deployProxy(
    deploymentName,
    poolContract,
    deployer,
    await getProxyAdminOwner(),
    [setting.ampFactor, setting.haircut],
    getImplementationName(poolContract),
    libraries
  )

  // Get freshly deployed pool contract
  const pool = await ethers.getContractAt(poolContract, deployResult.address)

  if (deployResult.newlyDeployed) {
    const masterWombatDeployment =
      (await deployments.getOrNull('BoostedMasterWombat')) || (await deployments.getOrNull('MasterWombatV3'))
    if (masterWombatDeployment?.address) {
      deployments.log('Setting master wombat: ', masterWombatDeployment.address)
      await confirmTxn(pool.connect(deployerSigner).setMasterWombat(masterWombatDeployment.address))
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

    logVerifyCommand(deployResult)
  } else {
    deployments.log(`${deploymentName} Contract already deployed.`)
  }

  return { deployResult, contract: pool }
}

/**
 * deploy asset with the new config interface `IAssetInfo`
 */
export async function deployAssetV2(
  assetInfo: IAssetInfo,
  poolAddress: string,
  pool: Contract,
  deploymentName: string
): Promise<DeploymentResult> {
  const { deployer, multisig } = await getNamedAccounts()
  const { deploy } = deployments
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Attemping to deploy Asset contract for: ${assetInfo.tokenName} of pool ${poolAddress}`)
  const tokenName = assetInfo.tokenName
  const tokenSymbol = assetInfo.tokenSymbol
  const assetContractName = assetInfo.assetContractName ?? 'Asset'
  const name = `Wombat ${tokenName} Asset`
  const symbol = `LP-${tokenSymbol}`
  const underlyingTokenAddr = await getUnderlyingTokenAddr(assetInfo)
  const args: string[] = [underlyingTokenAddr, name, symbol]
  if (assetInfo.oracle) {
    args.push(await getContractAddress(assetInfo.oracle))
  }
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
    // Transfer ownership to timelock controller if it is deployed; otherwise, multisig.
    const owner = multisig
    deployments.log(`Transferring ownership of asset ${asset.address} to ${owner}...`)
    await confirmTxn(asset.connect(deployerSigner).transferOwnership(owner))
    deployments.log(`Transferred ownership of asset ${asset.address} to ${owner}...`)

    logVerifyCommand(deployResult)
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
    logVerifyCommand(deployResult)
  } else if (['ChainlinkPriceFeed', 'PythPriceFeed'].includes(assetInfo.priceFeed.contract)) {
    const priceFeedContract = await getDeployedContract(assetInfo.priceFeed.contract)
    deployments.log('Latest price for the underlying token is...')
    try {
      const tokenAddress = await getUnderlyingTokenAddr(assetInfo)
      const latestPrice = await priceFeedContract.getLatestPrice(tokenAddress)
      deployments.log(formatEther(latestPrice))
    } catch (e) {
      deployments.log('Failed to get latest price. Is the price feed configured?', e)
    }

    if (assetNewlyDeployed) {
      const priceFeedDeployment = await deployments.get(assetInfo.priceFeed.contract)
      deployments.log('Setting price feed for asset...')
      await confirmTxn(asset.connect(deployerSigner).setPriceFeed(priceFeedDeployment.address))
    }
  }
}

export async function deployRewarderOrBribe(
  contract: 'Bribe' | 'MultiRewarderPerSec',
  getDeploymentName: (lpToken: string) => string,
  lpToken: string,
  master: string,
  config: IRewarder
): Promise<DeployResult> {
  assert(config.rewardTokens.length > 0, `Empty rewardTokens for ${lpToken}`)

  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const { deploy } = deployments

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const startTimestamp = config?.startTimestamp || (await getDeadlineFromNow(config.secondsToStart!))
  const name = getDeploymentName(lpToken)
  const lpTokenAddress = await getAddress(config.lpToken)
  const rewardTokens = await Promise.all(config.rewardTokens.map((t) => getTokenAddress(t)))
  const deployResult = await deploy(name, {
    from: deployer,
    contract,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [master, lpTokenAddress, startTimestamp, rewardTokens[0], config.tokenPerSec[0]],
  })

  const rewarderOrBribe = await getDeployedContract(contract, name)
  if (deployResult.newlyDeployed) {
    /// Add remaining reward tokens
    for (let i = 1; i < rewardTokens.length; i++) {
      const address = rewardTokens[i]
      deployments.log(`${name} adding rewardToken: ${address}`)
      await confirmTxn(rewarderOrBribe.connect(deployerSigner).addRewardToken(address, config.tokenPerSec[i]))
    }

    const operator = await getContractAddressOrDefault(config.operator, deployer)
    deployments.log(`Transferring operator of ${deployResult.address} to ${operator}...`)
    // The operator of the rewarder contract can set and update reward rates
    await confirmTxn(rewarderOrBribe.connect(deployerSigner).setOperator(operator))
    deployments.log(`Transferring ownership of ${deployResult.address} to ${multisig}...`)
    // The owner of the rewarder contract can add new reward tokens and withdraw them
    await confirmTxn(rewarderOrBribe.connect(deployerSigner).transferOwnership(multisig))
    deployments.log(`${contract} transferred to multisig`)

    deployments.log(`${name} Deployment complete.`)
  }

  return deployResult
}

export async function deployBoostedRewarderUsingFactory(
  factory: BribeRewarderFactory,
  signer: SignerWithAddress,
  assetAddr: string,
  rewardAddr: string,
  startTime: BigNumberish,
  tokenPerSec: BigNumberish
): Promise<string> {
  const receipt = (await confirmTxn(
    factory.connect(signer).deployRewarderContractAndSetRewarder(assetAddr, startTime, rewardAddr, tokenPerSec)
  )) as ContractReceipt
  assert(receipt.events, 'Events not exist')
  const event = receipt.events.find((e: any) => e.event === 'DeployRewarderContract')
  assert(event, 'Cannot find DeployRewarderContract event')
  return event.args?.rewarder
}

export async function deployUpgradeableBeacon(contractName: string) {
  const { deployer } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  const implName = `${contractName}_Implementation`
  const beaconName = `${contractName}_Beacon`

  const implDeployResult = await deployments.deploy(implName, {
    from: deployer,
    contract: contractName,
    log: true,
    skipIfAlreadyDeployed: true,
  })
  const beaconDeployResult = await deployments.deploy(beaconName, {
    from: deployer,
    contract: 'UpgradeableBeacon',
    log: true,
    skipIfAlreadyDeployed: true,
    args: [implDeployResult.address],
  })

  deployments.log('Contract address:', beaconDeployResult.address)
  deployments.log('Implementation address:', implDeployResult.address)

  logVerifyCommand(implDeployResult)
  logVerifyCommand(beaconDeployResult)

  if (beaconDeployResult.newlyDeployed) {
    const beaconContract = await getDeployedContract('UpgradeableBeacon', beaconName)
    const proxyAdminOwner = await getProxyAdminOwner()
    await confirmTxn(beaconContract.connect(deployerSigner).transferOwnership(proxyAdminOwner))
    deployments.log(`Transferring ownership of ${beaconDeployResult.address} to ${proxyAdminOwner}...`)
  }
}

export async function deployProxy(
  deploymentName: string,
  contractName: string,
  deployer: string,
  owner: string,
  args: any[],
  implementationName = getImplementationName(deploymentName),
  libraries?: { [key: string]: string }
): Promise<DeployResult> {
  if (isZkSync()) {
    return await deployProxyZksync(deploymentName, implementationName, contractName, args, libraries)
  } else {
    const deployResult = await deployments.deploy(deploymentName, {
      from: deployer,
      log: true,
      contract: contractName,
      skipIfAlreadyDeployed: true,
      libraries,
      proxy: {
        owner, // change to Gnosis Safe after all admin scripts are done
        proxyContract: 'OptimizedTransparentProxy',
        viaAdminContract: 'DefaultProxyAdmin',
        implementationName,
        execute: {
          init: {
            methodName: 'initialize',
            args,
          },
        },
      },
    })

    const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
    deployments.log('Contract address:', deployResult.address)
    deployments.log('Implementation address:', implAddr)

    if (deployResult.newlyDeployed) {
      deployments.log(`${contractName} Contract deployed at ${deployResult.address}.`)
    } else {
      deployments.log(`${contractName} Contract already deployed.`)
    }

    logVerifyCommand(deployResult)
    return deployResult
  }
}
