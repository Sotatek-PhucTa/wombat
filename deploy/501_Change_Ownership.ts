import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const contractNames = ['Pool', 'DynamicPool_01', 'MasterWombatV2', 'VeWom', 'Whitelist']

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer, multisig } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 501. Changing contract ownerships on : ${hre.network.name} with account : ${deployer}`)

  if (hre.network.name == 'bsc_mainnet') {
    for (const contractName of contractNames) {
      // Get deployments
      const contractDeployment = await deployments.get(contractName)

      // Get deployed contract
      const contract = await ethers.getContractAt(contractName, contractDeployment.address)
      console.log('Contract address:', contractDeployment.address)

      // transfer contract ownership to multi-sig
      console.log(`Transferring ownership of ${contractDeployment.address} to ${multisig}...`)
      const transferOwnershipTxn = await contract.connect(owner).transferOwnership(multisig)
      await transferOwnershipTxn.wait()
      console.log(`Transferred ownership of ${contractDeployment.address} to:`, multisig)
    }
  }
}

export default deployFunc
deployFunc.dependencies = ['Whitelist']
