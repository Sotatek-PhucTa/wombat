import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const contractName = 'MasterWombat'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  console.log(`Step 101. Deploying on : ${hre.network.name} with account : ${deployer}`)

  const wombatToken = await deployments.get('WombatToken')
  const pool = await deployments.get('Pool')

  const block = await ethers.provider.getBlock('latest')
  const latest = BigNumber.from(block.timestamp)

  const deployResult = await deploy(contractName, {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: deployer,
      proxyContract: 'OptimizedTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [wombatToken.address, ethers.constants.AddressZero, 3.08642e18, 375, latest],
        },
      },
    },
  })

  // Get freshly deployed Pool contract
  const contract = await ethers.getContractAt(contractName, deployResult.address)
  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  console.log('Contract address:', deployResult.address)
  console.log('Implementation address:', implAddr)

  if (deployResult.newlyDeployed) {
    const poolContract = await ethers.getContractAt('Pool', pool.address)
    await poolContract.setMasterWombat(deployResult.address)

    // Check setup config values
    const womTokenAddress = await contract.wom()
    const masterWombatAddress = await poolContract.masterWombat()
    console.log(`WomTokenAddress is : ${womTokenAddress}`)
    console.log(`MasterWombatAddress is : ${masterWombatAddress}`)
    return deployResult
  } else {
    return `${contractName} Contract already deployed.`
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['Pool', 'WombatToken']
