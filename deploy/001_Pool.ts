import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { parseEther, parseUnits } from '@ethersproject/units'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  // Get Signers
  const [owner] = await ethers.getSigners()

  console.log(`Step 001. Deploying on : ${hre.network.name} with account : ${deployer}`)

  /// Deploy pool
  const poolDeployResult = await deploy('Pool', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  })

  if (poolDeployResult.newlyDeployed) {
    if (
      hre.network.name == 'localhost' ||
      hre.network.name == 'hardhat' ||
      hre.network.name == 'bsc_testnet' ||
      hre.network.name == 'bsc_mainnet'
    ) {
      // Get freshly deployed Pool contract
      const pool = await ethers.getContractAt('Pool', poolDeployResult.address)

      // Check dev account
      const dev = await pool.dev()
      console.log(`Dev account is : ${dev}`)
      console.log(`Deployer account is: ${deployer}`)

      // call initialize
      if (ethers.utils.getAddress(dev) != ethers.utils.getAddress(deployer)) {
        await pool.connect(owner).initialize(parseEther('0.001'), parseEther('0.0001'))
      }

      if (ethers.utils.getAddress(dev) == ethers.utils.getAddress(deployer)) {
        await pool.connect(owner).setAmpFactor(parseEther('0.001'), { gasLimit: 300000 })
        await pool.connect(owner).setHaircutRate(parseEther('0.0001'), { gasLimit: 300000 })

        // Check setup config values
        const ampFactor = await pool.getAmpFactor()
        const hairCutRate = await pool.getHaircutRate()
        console.log(`Amplification factor is : ${ampFactor}`)
        console.log(`Haircut rate is : ${hairCutRate}`)
      }
    }
  }
}

export default deployFunc
deployFunc.tags = ['Pool']
