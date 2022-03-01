import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const proxyImplAddr = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' // EIP1967
const contractName = 'MasterWombat'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  console.log(`Step 101. Deploying on : ${hre.network.name} with account : ${deployer}`)

  const wombatToken = await deployments.get('WombatToken')

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
          args: [wombatToken.address, ethers.constants.AddressZero, 1e9, 375, latest],
        },
      },
    },
  })

  // Get freshly deployed Pool contract
  const contract = await ethers.getContractAt(contractName, deployResult.address)
  const implAddr = await contract.provider.getStorageAt(deployResult.address, proxyImplAddr)
  console.log('Contract address:', deployResult.address)
  console.log('Implementaion address:', implAddr)

  if (deployResult.newlyDeployed) {
    // Check setup config values
    const womTokenAddress = await contract.wom()
    const masterWombatAddress = await contract.veWom()
    console.log(`WomTokenAddress is : ${womTokenAddress}`)
    console.log(`VeWomAddress is : ${masterWombatAddress}`)
    return deployResult
  } else {
    const masterWombatAddress = await contract.veWom()
    console.log(`VeWomAddress is : ${masterWombatAddress}`)
    throw 'Error : Bytecode is unchanged. Please choose the correct NEW_POOL_CONTRACT_NAME'
  }
}

export default deployFunc
deployFunc.tags = [contractName]
