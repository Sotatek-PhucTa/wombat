import { parseEther } from '@ethersproject/units'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
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

  // Check dev account
  const dev = await pool.dev()
  console.log(`Dev account is : ${dev}`)
  console.log(`Deployer account is: ${deployer}`)

  // Check setup config values
  const ampFactor = await pool.ampFactor()
  const hairCutRate = await pool.haircutRate()
  console.log(`Amplification factor is : ${ampFactor}`)
  console.log(`Haircut rate is : ${hairCutRate}`)

  if (poolDeployResult.newlyDeployed) {
    return poolDeployResult
  } else {
    throw 'Error : Pool bytecode is unchanged. Please choose the correct NEW_POOL_CONTRACT_NAME'
  }
}

export default deployFunc
deployFunc.tags = ['Pool']
