import { parseEther } from '@ethersproject/units'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const contractName = 'Pool'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 001. Deploying on : ${hre.network.name}...`)
  /// Deploy pool
  const deployResult = await deploy(contractName, {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: deployer, // change to Gnosis Safe after all admin scripts are done
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
  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  console.log('Contract address:', deployResult.address)
  console.log('Implementation address:', implAddr)

  if (deployResult.newlyDeployed) {
    // Check setup config values
    const ampFactor = await contract.ampFactor()
    const hairCutRate = await contract.haircutRate()
    console.log(`Amplification factor is : ${ampFactor}`)
    console.log(`Haircut rate is : ${hairCutRate}`)

    // transfer proxyAdmin to multi-sig, do it once and all proxy contracts will follow suit
    if (hre.network.name == 'bsc_mainnet') {
      console.log(`Transferring ownership of ProxyAdmin...`)
      // The owner of the ProxyAdmin can upgrade our contracts
      await upgrades.admin.transferProxyAdminOwnership(multisig)
      console.log(`Transferred ownership of ProxyAdmin to:`, multisig)

      // transfer pool contract dev to Gnosis Safe
      console.log(`Transferring dev of ${deployResult.address} to ${multisig}...`)
      // The dev of the pool contract can pause and unpause pools & assets!
      await contract.connect(owner).setDev(multisig)
      console.log(`Transferred dev of ${deployResult.address} to:`, multisig)

      // transfer pool contract ownership to Gnosis Safe
      console.log(`Transferring ownership of ${deployResult.address} to ${multisig}...`)
      // The owner of the pool contract is very powerful!
      await contract.connect(owner).transferOwnership(multisig)
      console.log(`Transferred ownership of ${deployResult.address} to:`, multisig)
    }
    return deployResult
  } else {
    console.log(`${contractName} Contract already deployed.`)
    return deployResult
  }
}

export default deployFunc
deployFunc.tags = [contractName]
