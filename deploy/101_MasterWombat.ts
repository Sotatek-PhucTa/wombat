import { BigNumber } from 'ethers'
import { parseEther } from '@ethersproject/units'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { BNB_DYNAMICPOOL_TOKENS_MAP, USD_TOKENS_MAP } from '../tokens.config'

const contractName = 'MasterWombatV2'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 101. Deploying on : ${hre.network.name} with account : ${deployer}`)

  const wombatToken = await deployments.get('WombatToken')
  const dynamicPool = await deployments.get('DynamicPool_01')

  const block = await ethers.provider.getBlock('latest')
  const latest = BigNumber.from(block.timestamp)

  const deployResult = await deploy('MasterWombatV2', {
    from: deployer,
    contract: 'MasterWombatV2',
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: multisig,
      proxyContract: 'OptimizedTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [wombatToken.address, ethers.constants.AddressZero, parseEther('1.522070'), 375, latest], // ~4M WOM emissions per month
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
    const tokenAllocPoint = USD_TOKENS[index][3] as number
    const assetContractName = `Asset_P01_${tokenSymbol}`
    const assetContractAddress = (await deployments.get(assetContractName)).address as string

    console.log('Adding asset', assetContractAddress)
    await addAsset(contract, owner, tokenAllocPoint, assetContractAddress, ethers.constants.AddressZero)
  }

  const BNB_DYNAMICPOOL_TOKENS = BNB_DYNAMICPOOL_TOKENS_MAP[hre.network.name]
  for (const index in BNB_DYNAMICPOOL_TOKENS) {
    const tokenSymbol = BNB_DYNAMICPOOL_TOKENS[index][1] as string
    const tokenAllocPoint = BNB_DYNAMICPOOL_TOKENS[index][5] as number
    const assetContractName = `Asset_DP01_${tokenSymbol}`
    const assetContractAddress = (await deployments.get(assetContractName)).address as string

    console.log('Adding asset', assetContractAddress)
    await addAsset(contract, owner, tokenAllocPoint, assetContractAddress, ethers.constants.AddressZero)
  }

  const poolContract = await ethers.getContractAt('DynamicPool', dynamicPool.address)
  // NOTE: mainnet masterwombat would be added back to main pool via multisig proposal

  console.log('Setting dynamic pool contract for MasterWombat...')
  const setMasterWombatTxn = await poolContract.connect(owner).setMasterWombat(deployResult.address)
  await setMasterWombatTxn.wait()

  if (deployResult.newlyDeployed) {
    // Check setup config values
    const womTokenAddress = await contract.wom()
    const masterWombatAddress = await poolContract.masterWombat()
    console.log(`WomTokenAddress is : ${womTokenAddress}`)
    console.log(`MasterWombatAddress is : ${masterWombatAddress}`)

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
