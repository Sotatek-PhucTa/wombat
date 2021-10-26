import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  console.log(`Deploying on : ${hre.network.name} with account : ${deployer}`)

  /// Deploy pool
  const poolDeployResult = await deploy('Pool', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  })

  if (poolDeployResult.newlyDeployed) {
    if (hre.network.name == 'localhost' || hre.network.name == 'hardhat') {
      const testBSCDeployment = await deploy('TestBSC', {
        from: deployer,
        log: true,
        skipIfAlreadyDeployed: false,
      })
      this.BSCAddress = testBSCDeployment.address

      // Deploy WETH Forwarder
      const WETHForwarderDeployResult = await deploy('WETHForwarder', {
        from: deployer,
        log: true,
        skipIfAlreadyDeployed: true,
        args: [this.BSCAddress],
      })

      /// Deploy ChainlinkProxyPriceProvider
      const priceOracleDeployResult = await deploy('ChainlinkProxyPriceProvider', {
        from: deployer,
        log: true,
        skipIfAlreadyDeployed: true,
        args: [[], []],
      })

      // Get freshly deployed price Oracle Contract
      const priceOracle = await ethers.getContractAt('ChainlinkProxyPriceProvider', priceOracleDeployResult.address)
      await priceOracle.setETHAddress(this.BSCAddress) // set WETH address on ChainLinkProxyProvider

      // Get freshly deployed Pool contract
      const pool = await ethers.getContractAt('Pool', poolDeployResult.address)

      // Initialize pool
      await pool.initialize(this.BSCAddress)
      await pool.setWETHForwarder(WETHForwarderDeployResult.address)
      await pool.setPriceOracle(priceOracle.address)

      // Check dev account
      // console.log(`Dev account is : ${await pool.getDev()}`)
    }
  }
}

export default deployFunc
deployFunc.tags = ['Pool']
