import { BigNumber } from 'ethers'
import { parseEther } from '@ethersproject/units'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { USD_TOKENS_MAP } from '../tokens.config'

const contractName = 'MasterWombat'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 101. Deploying on : ${hre.network.name} with account : ${deployer}`)

  const wombatToken = await deployments.get('WombatToken')
  const pool = await deployments.get('Pool')

  const block = await ethers.provider.getBlock('latest')
  const latest = BigNumber.from(block.timestamp)

  const deployResult = await deploy(`${contractName}_V2`, {
    from: deployer,
    contract: 'MasterWombat',
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: deployer, // change to Gnosis Safe after all admin scripts are done
      proxyContract: 'OptimizedTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [wombatToken.address, ethers.constants.AddressZero, parseEther('1.522070'), 375, latest],
        },
      },
    },
  })

  // Get freshly deployed MasterWombat contract
  const contract = await ethers.getContractAt(contractName, deployResult.address)
  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  console.log('Contract address:', deployResult.address)
  console.log('Implementation address:', implAddr)

  const USD_TOKENS = USD_TOKENS_MAP[hre.network.name]
  for (const index in USD_TOKENS) {
    const tokenSymbol = USD_TOKENS[index][1] as string
    const assetContractName = `Asset_${tokenSymbol}_V2`
    const assetContractAddress = (await deployments.get(assetContractName)).address as string

    console.log('Adding asset', assetContractAddress)
    await addAsset(contract, owner, 10, assetContractAddress, ethers.constants.AddressZero)
  }

  console.log('Setting pool contract for MasterWombat...')
  const poolContract = await ethers.getContractAt('Pool', pool.address)
  const setMasterWombatTxn = await poolContract.setMasterWombat(deployResult.address)
  await setMasterWombatTxn.wait()

  if (deployResult.newlyDeployed) {
    // Check setup config values
    const womTokenAddress = await contract.wom()
    const masterWombatAddress = await poolContract.masterWombat()
    console.log(`WomTokenAddress is : ${womTokenAddress}`)
    console.log(`MasterWombatAddress is : ${masterWombatAddress}`)

    // transfer MasterWombat contract ownership to Gnosis Safe
    console.log(`Transferring ownership of ${masterWombatAddress} to ${multisig}...`)
    // The owner of the MasterWombat contract holds great powers!
    await contract.connect(owner).transferOwnership(multisig)
    console.log(`Transferred ownership of ${masterWombatAddress} to:`, multisig)

    return deployResult
  } else {
    console.log(`${contractName} Contract already deployed.`)
    return deployResult
  }
}

async function addAsset(contract: any, owner: any, allocPoint: number, assetAddress: string, rewarderAddress: string) {
  try {
    const addAssetTxn = await contract.connect(owner).add(allocPoint, assetAddress, rewarderAddress)
    // wait until the transaction is mined
    await addAssetTxn.wait()
  } catch (err) {
    // do nothing as asset already exists in pool
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['Pool', 'WombatToken']
