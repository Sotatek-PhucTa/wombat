import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { DeploymentsExtension } from 'hardhat-deploy/types'
import { IAssetInfo } from '../types'
import { confirmTxn, getTestERC20, logVerifyCommand } from '../utils'

export async function deployTestAsset(tokenSymbol: string) {
  const erc20 = await getTestERC20(tokenSymbol)
  return ethers.deployContract('Asset', [erc20.address, `${tokenSymbol} Asset`, `LP-${tokenSymbol}`])
}

export function getPoolContractName(contractNamePrefix: string, poolName: string) {
  return contractNamePrefix + '_' + poolName
}

export function getAssetContractName(poolName: string, tokenSymbol: string) {
  return `Asset_${poolName}_${tokenSymbol}`
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
): Promise<void> {
  const { deploy } = deployments
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Attemping to deploy Asset contract for: ${assetInfo.tokenName} of pool ${poolAddress}`)
  if (assetInfo.underlyingTokenAddr === undefined) {
    throw 'invalid asset info for ' + assetInfo.tokenName
  }
  const tokenName = assetInfo.tokenName
  const tokenSymbol = assetInfo.tokenSymbol
  const underlyingTokenAddr = assetInfo.underlyingTokenAddr
  const oracleAddress = assetInfo.oracleAddress
  const assetContractName = assetInfo.assetContractName ?? 'Asset'
  const name = `Wombat ${tokenName} Asset`
  const symbol = `LP-${tokenSymbol}`

  const args: string[] = [underlyingTokenAddr, name, symbol]
  if (oracleAddress) args.push(oracleAddress)

  const assetDeployResult = await deploy(contractName, {
    from: deployer,
    contract: assetContractName,
    log: true,
    args: args,
    skipIfAlreadyDeployed: true,
  })
  const address = assetDeployResult.address
  const asset = await ethers.getContractAt(assetContractName, address)

  if (assetContractName === 'PriceFeedAsset') {
    await deployPriceFeed(
      deployer,
      multisig,
      deployerSigner,
      deployments,
      assetInfo,
      asset,
      `PriceFeed_${contractName}_${assetInfo.priceFeed?.priceFeedContract}`
    )
  }

  // newly-deployed Asset
  if (assetDeployResult.newlyDeployed) {
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

    logVerifyCommand(network, assetDeployResult)
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
}

export async function deployPriceFeed(
  deployer: string,
  multisig: string,
  deployerSigner: SignerWithAddress,
  deployments: DeploymentsExtension,
  assetInfo: IAssetInfo,
  asset: Contract,
  contractName: string
) {
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
    deployments.log(`Transferring ownership of price feed ${priceFeedDeployResult.address} to ${multisig}...`)

    // set price feed for the asset
    await confirmTxn(asset.setPriceFeed(priceFeedDeployResult.address))
  }
}
