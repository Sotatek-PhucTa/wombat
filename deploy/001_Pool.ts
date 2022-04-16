import { parseEther } from '@ethersproject/units'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { MAINNET_GNOSIS_SAFE } from '../tokens.config'

const contractName = 'Pool'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, mainnetDeployer } = await getNamedAccounts()

  console.log(`Step 001. Deploying on : ${hre.network.name}...`)

  /// Deploy pool
  const deployResult = await deploy(contractName, {
    from: hre.network.name == 'bsc_mainnet' ? mainnetDeployer : deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: hre.network.name == 'bsc_mainnet' ? MAINNET_GNOSIS_SAFE : deployer,
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
      await upgrades.admin.transferProxyAdminOwnership(MAINNET_GNOSIS_SAFE)
      console.log(`Transferred ownership of ProxyAdmin to:`, MAINNET_GNOSIS_SAFE)
    }
    return deployResult
  } else {
    console.log(`${contractName} Contract already deployed.`)
    return deployResult
  }
}

export default deployFunc
deployFunc.tags = [contractName]
