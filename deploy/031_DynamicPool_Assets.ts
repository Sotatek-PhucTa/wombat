import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { ethers } from 'hardhat'
import { DeployFunction, DeploymentsExtension } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { BNB_DYNAMICPOOL_TOKENS_MAP } from '../tokens.config'
import { logVerifyCommand } from '../utils'

const contractName = 'DynamicMockAsset'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer, multisig } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 031. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // create asset contracts, e.g. LP-USDC, LP-BUSD, etc. for the ERC20 stablecoins list
  const BNB_DYNAMICPOOL_TOKENS = BNB_DYNAMICPOOL_TOKENS_MAP[hre.network.name]

  // Get Pool Instance
  const poolDeployment = await deployments.get('DynamicPool_01')
  const poolAddress = poolDeployment.address
  const pool = await ethers.getContractAt('DynamicPool', poolAddress)

  for (const deployArgs of Object.values(BNB_DYNAMICPOOL_TOKENS)) {
    await deployAsset(
      hre.network.name,
      deployer,
      multisig,
      owner,
      deployments,
      deployArgs as Array<string>,
      poolAddress,
      pool,
      `Asset_DP01_${deployArgs[1]}`
    )
  }

  // finally transfer pool contract ownership to Gnosis Safe after admin scripts completed
  console.log(`Transferring ownership of ${poolAddress} to ${multisig}...`)
  // The owner of the pool contract is very powerful!
  const transferOwnershipTxn = await pool.connect(owner).transferOwnership(multisig)
  await transferOwnershipTxn.wait()
  console.log(`Transferred ownership of ${poolAddress} to:`, multisig)
}

export async function deployAsset(
  network: string,
  deployer: string,
  multisig: string,
  owner: SignerWithAddress,
  deployments: DeploymentsExtension,
  deployArgs: Array<string>,
  poolAddress: string,
  pool: Contract,
  contractName: string
): Promise<void> {
  const { deploy } = deployments

  console.log('Attemping to deploy Asset contract : ' + deployArgs[0])
  const tokenName = deployArgs[0] as string
  const tokenSymbol = deployArgs[1] as string
  const tokenAddress = deployArgs[2] as string
  const oracleAddress = deployArgs[3] as string
  const tokenType = (deployArgs[4] ?? '') as string // default to use `Asset` contract
  const name = `Wombat ${tokenName} Asset`
  const symbol = `LP-${tokenSymbol}`

  const args: string[] = [tokenAddress, name, symbol]
  if (oracleAddress) args.push(oracleAddress)

  if (deployArgs[1] == 'TWBNB' || deployArgs[1] == 'WBNB') {
    args.pop() // Testnet WBNB has no oracleAddress
  }

  const assetDeployResult = await deploy(contractName, {
    from: deployer,
    contract: `${tokenType}Asset`,
    log: true,
    args: args,
    skipIfAlreadyDeployed: true,
  })
  const address = assetDeployResult.address
  const asset = await ethers.getContractAt(`${tokenType}Asset`, address)

  // newly-deployed Asset
  if (assetDeployResult.newlyDeployed) {
    // Remove old and add new Asset to newly-deployed Pool
    await removeAsset(pool, owner, tokenAddress)
    await addAsset(pool, owner, tokenAddress, address)

    // Add pool reference to Asset
    await addPool(asset, owner, poolAddress)

    console.log(`Added ${tokenSymbol} Asset at ${address} to Pool located ${poolAddress}`)

    if (network == 'bsc_mainnet') {
      // transfer asset LP token contract ownership to Gnosis Safe
      console.log(`Transferring ownership of ${tokenAddress} to ${multisig}...`)
      // The owner of the asset contract can change our pool address and change asset max supply
      const transferOwnershipTxn = await asset.connect(owner).transferOwnership(multisig)
      await transferOwnershipTxn.wait()
      console.log(`Transferred ownership of ${tokenAddress} to:`, multisig)
    }

    logVerifyCommand(network, assetDeployResult)
  } else {
    // mainnet assets would be added back to existing pool via multisig proposal
    if (network !== 'bsc_mainnet') {
      // Add new Asset to existing Pool
      await addAsset(pool, owner, tokenAddress, address)

      // check existing asset have latest pool added
      const existingPoolAddress = await asset.pool()

      if (existingPoolAddress !== poolAddress) {
        // Add existing asset to newly-deployed Pool
        console.log(`Adding existing Asset_${tokenSymbol} to new pool ${poolAddress}...`)
        await addPool(asset, owner, poolAddress)
      }
    }
  }
}

async function removeAsset(pool: any, owner: any, tokenAddress: string) {
  try {
    const removeAssetTxn = await pool.connect(owner).removeAsset(tokenAddress)
    // wait until the transaction is mined
    await removeAssetTxn.wait()
  } catch (err) {
    // do nothing as asset already does not exists in pool
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
deployFunc.dependencies = ['DynamicPool', 'MockTokens'] // this ensure the Token script above is executed first, so `deployments.get('DynamicPool')` succeeds
