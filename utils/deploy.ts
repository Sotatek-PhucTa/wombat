import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { ethers } from 'hardhat'
import { DeploymentsExtension } from 'hardhat-deploy/types'
import { IAssetInfo, Network } from '../types'
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
  owner: SignerWithAddress,
  deployments: DeploymentsExtension,
  assetInfo: IAssetInfo,
  poolAddress: string,
  pool: Contract,
  contractName: string
): Promise<void> {
  const { deploy } = deployments

  deployments.log('Attemping to deploy Asset contract for: ' + assetInfo.tokenName)
  console.log(assetInfo)
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
      owner,
      deployments,
      assetInfo,
      asset,
      `PriceFeed_${contractName}_${assetInfo.priceFeed?.priceFeedContract}`
    )
  }

  // newly-deployed Asset
  if (assetDeployResult.newlyDeployed) {
    // Remove old and add new Asset to newly-deployed Pool
    await removeAsset(pool, owner, underlyingTokenAddr)
    await addAsset(pool, owner, underlyingTokenAddr, address)

    // Add pool reference to Asset
    await addPool(asset, owner, poolAddress)

    deployments.log(`Added ${tokenSymbol} Asset at ${address} to Pool located ${poolAddress}`)

    // transfer asset LP token contract ownership to Gnosis Safe
    deployments.log(`Transferring ownership of asset ${asset.address} to ${multisig}...`)
    // The owner of the asset contract can change our pool address and change asset max supply
    await confirmTxn(asset.connect(owner).transferOwnership(multisig))

    deployments.log(`Transferred ownership of asset ${asset.address} to ${multisig}...`)

    logVerifyCommand(network, assetDeployResult)
  } else {
    // mainnet assets would be added back to existing pool via multisig proposal
    if (![Network.BSC_MAINNET, Network.ARBITRUM_MAINNET].includes(network as Network)) {
      // Add new Asset to existing Pool
      await addAsset(pool, owner, underlyingTokenAddr, address)

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

export async function deployPriceFeed(
  deployer: string,
  multisig: string,
  owner: SignerWithAddress,
  deployments: DeploymentsExtension,
  assetInfo: IAssetInfo,
  asset: Contract,
  contractName: string
) {
  const { deploy } = deployments

  deployments.log('Attemping to deploy price feed for: ' + assetInfo.tokenName)
  if (!assetInfo.priceFeed) {
    throw `assetInfo.priceFeed for ${assetInfo.tokenName} is full`
  }
  console.log()

  const priceFeedDeployResult = await deploy(contractName, {
    from: deployer,
    contract: assetInfo.priceFeed!.priceFeedContract,
    log: true,
    args: assetInfo.priceFeed!.deployArgs,
    skipIfAlreadyDeployed: true,
  })
  if (priceFeedDeployResult.newlyDeployed) {
    deployments.log(`Transferring ownership of price feed ${priceFeedDeployResult.address} to ${multisig}...`)
    await confirmTxn(asset.connect(owner).transferOwnership(multisig))
    deployments.log(`Transferring ownership of price feed ${priceFeedDeployResult.address} to ${multisig}...`)

    // set price feed for the asset
    await confirmTxn(asset.setPriceFeed(priceFeedDeployResult.address))
  }
}

async function removeAsset(pool: any, owner: any, underlyingTokenAddr: string) {
  try {
    await confirmTxn(pool.connect(owner).removeAsset(underlyingTokenAddr))
  } catch (err) {
    // do nothing as asset already does not exists in pool
  }
}

async function addAsset(pool: any, owner: any, underlyingTokenAddr: string, assetAddress: string) {
  try {
    await confirmTxn(pool.connect(owner).addAsset(underlyingTokenAddr, assetAddress))
  } catch (err) {
    // do nothing as asset already exists in pool
  }
}

async function addPool(asset: any, owner: any, poolAddress: string) {
  try {
    await confirmTxn(await asset.connect(owner).setPool(poolAddress))
  } catch (err) {
    // this should not happen
  }
}
