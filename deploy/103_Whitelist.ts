import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { logVerifyCommand } from '../utils'

const contractName = 'Whitelist'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  deployments.log(`Step 103. Deploying on : ${hre.network.name} with account : ${deployer}`)

  const veWom = await deployments.get('VeWom')

  /// Deploy whitelist
  const deployResult = await deploy(contractName, {
    from: deployer,
    contract: 'Whitelist',
    log: true,
    args: [],
    skipIfAlreadyDeployed: true,
    deterministicDeployment: false,
  })
  // Get freshly deployed Whitelist contract
  const contract = await ethers.getContractAt(contractName, deployResult.address)
  deployments.log('Contract address:', deployResult.address)

  if (deployResult.newlyDeployed) {
    const veWomContract = await ethers.getContractAt('VeWom', veWom.address)
    deployments.log('Setting whitelist contract for VeWom...')
    const setWhitelistTxn = await veWomContract.connect(owner).setWhitelist(deployResult.address)
    await setWhitelistTxn.wait()

    // Check setup config values
    const whitelistAddress = await veWomContract.whitelist()
    deployments.log(`VeWomAddress is : ${whitelistAddress}`)
    logVerifyCommand(hre.network.name, deployResult)
    return deployResult
  } else {
    deployments.log(`${contractName} Contract already deployed.`)
    return deployResult
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['VeWom']
