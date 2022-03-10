import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const contractName = 'VeWom'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  console.log(`Step 102. Deploying on : ${hre.network.name} with account : ${deployer}`)

  const wombatToken = await deployments.get('WombatToken')
  const masterWombat = await deployments.get('MasterWombat')

  // deterministicDeployment is used only for implementation but not the proxy contract
  // it is not useful in this case
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
          args: [wombatToken.address, masterWombat.address],
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
    const masterWombatContract = await ethers.getContractAt('MasterWombat', masterWombat.address)
    await masterWombatContract.setVeWom(deployResult.address)

    // Check setup config values
    const womTokenAddress = await contract.wom()
    const masterWombatAddress = await contract.masterWombat()
    const veWomAddress = await masterWombatContract.veWom()
    console.log(`WomTokenAddress is : ${womTokenAddress}`)
    console.log(`MasterWombatAddress is : ${masterWombatAddress}`)
    console.log(`VeWomAddress is : ${veWomAddress}`)
    return deployResult
  } else {
    return `${contractName} Contract already deployed.`
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['WombatToken', 'MasterWombat']
