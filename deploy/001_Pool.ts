import { parseEther } from '@ethersproject/units'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const proxyImplAddr = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' // EIP1967
const contractName = 'Pool'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  console.log(`Step 001. Deploying on : ${hre.network.name} with account : ${deployer}`)

  /// Deploy pool
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
          args: [parseEther('0.002'), parseEther('0.0001')],
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
    const ampFactor = await contract.ampFactor()
    const hairCutRate = await contract.haircutRate()
    console.log(`Amplification factor is : ${ampFactor}`)
    console.log(`Haircut rate is : ${hairCutRate}`)
    return deployResult
  } else {
    throw 'Error : Pool bytecode is unchanged. Please choose the correct NEW_POOL_CONTRACT_NAME'
  }
}

export default deployFunc
deployFunc.tags = [contractName]
