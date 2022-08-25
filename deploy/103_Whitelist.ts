import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const contractName = 'Whitelist'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 103. Deploying on : ${hre.network.name} with account : ${deployer}`)

  const veWom = await deployments.get('VeWom_V2')

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
  console.log('Contract address:', deployResult.address)

  if (deployResult.newlyDeployed) {
    const veWomContract = await ethers.getContractAt('VeWom', veWom.address)
    console.log('Setting whitelist contract for VeWom...')
    const setWhitelistTxn = await veWomContract.connect(owner).setWhitelist(deployResult.address)
    await setWhitelistTxn.wait()

    // Check setup config values
    const whitelistAddress = await veWomContract.whitelist()
    console.log(`VeWomAddress is : ${whitelistAddress}`)
    console.log(`To verify, run: hh verify --network ${hre.network.name} ${whitelistAddress}`)

    return deployResult
  } else {
    console.log(`${contractName} Contract already deployed.`)
    return deployResult
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['VeWom']
