import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const contractName = 'VeWom'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 102. Deploying on : ${hre.network.name} with account : ${deployer}`)

  const wombatToken = await deployments.get('WombatToken')
  const masterWombat = await deployments.get('MasterWombatV3')

  // deterministicDeployment is used only for implementation but not the proxy contract
  // it is not useful in this case
  const deployResult = await deploy(`${contractName}`, {
    from: deployer,
    contract: 'VeWom',
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: multisig,
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

  const masterWombatContract = await ethers.getContractAt('MasterWombatV3', masterWombat.address)
  // mainnet veWOM would be added back to existing masterwombat via multisig proposal
  console.log('Setting veWOM contract for MasterWombatV3...')
  const setVeWomTxn = await masterWombatContract.connect(owner).setVeWom(deployResult.address)
  await setVeWomTxn.wait()

  if (deployResult.newlyDeployed) {
    // Check setup config values
    const womTokenAddress = await contract.wom()
    const masterWombatAddress = await contract.masterWombat()
    const veWomAddress = await masterWombatContract.veWom()
    console.log(`WomTokenAddress is : ${womTokenAddress}`)
    console.log(`MasterWombatV3Address is : ${masterWombatAddress}`)
    console.log(`VeWomAddress is : ${veWomAddress}`)
    return deployResult
  } else {
    console.log(`${contractName} Contract already deployed.`)
    return deployResult
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['WombatToken', 'MasterWombat']
