import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { confirmTxn, getDeployedContract, isOwner } from '../utils'

const contractName = 'VeWom'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 102. Deploying on : ${hre.network.name} with account : ${deployer}`)

  const wombatToken = await deployments.get('WombatToken')
  const masterWombat = await getDeployedContract('MasterWombatV3')

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

  if (deployResult.newlyDeployed) {
    if (await isOwner(masterWombat, owner.address)) {
      console.log('Setting veWOM contract for MasterWombatV3...')
      await confirmTxn(masterWombat.connect(owner).setVeWom(deployResult.address))
    } else {
      console.log(
        `User ${owner.address} does not own MasterWombat. Please call setVeWom in multi-sig. VeWom: ${deployResult.address}`
      )
    }

    // Check setup config values
    const womTokenAddress = await contract.wom()
    const masterWombatAddress = await contract.masterWombat()
    const veWomAddress = await masterWombat.veWom()
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
deployFunc.dependencies = ['WombatToken', 'MasterWombatV3']
