import { parseEther } from '@ethersproject/units'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const proxyImplAddr = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' // EIP1967

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  console.log(`Step 001. Deploying on : ${hre.network.name} with account : ${deployer}`)

  /// Deploy pool
  const poolDeployResult = await deploy('Pool', {
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
          args: [parseEther('0.05'), parseEther('0.0001')],
        },
      },
    },
  })
  // Get freshly deployed Pool contract
  const pool = await ethers.getContractAt('Pool', poolDeployResult.address)

  const implAddr = await pool.provider.getStorageAt(poolDeployResult.address, proxyImplAddr)
  console.log('Implementaion address:', implAddr)

  if (poolDeployResult.newlyDeployed) {
    // Check setup config values
    const ampFactor = await pool.ampFactor()
    const hairCutRate = await pool.haircutRate()
    console.log(`Amplification factor is : ${ampFactor}`)
    console.log(`Haircut rate is : ${hairCutRate}`)
    return poolDeployResult
  } else {
    throw 'Error : Pool bytecode is unchanged. Please choose the correct NEW_POOL_CONTRACT_NAME'
  }
}

export default deployFunc
deployFunc.tags = ['Pool']
