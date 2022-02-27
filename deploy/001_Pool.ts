import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers, upgrades } from 'hardhat'
import { parseEther } from '@ethersproject/units'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()

  console.log(`Step 001. Deploying on : ${hre.network.name} with account : ${deployer}`)

  const PoolFactory = await ethers.getContractFactory('Pool', deployer)

  // Deploy and initialize pool contract
  const poolDeployResult = await upgrades.deployProxy(PoolFactory, [parseEther('0.001'), parseEther('0.0001')], {
    unsafeAllow: ['delegatecall'], // allow unsafe delegate call as SafeERC20 is no upgradable
    kind: 'uups',
  })

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

    // Check setup config values
    const ampFactor = await pool.getAmpFactor()
    const hairCutRate = await pool.getHaircutRate()
    console.log(`Amplification factor is : ${ampFactor}`)
    console.log(`Haircut rate is : ${hairCutRate}`)
  }
}

export default deployFunc
deployFunc.tags = ['Pool']
