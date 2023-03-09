import { parseEther } from '@ethersproject/units'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeploymentsExtension } from 'hardhat-deploy/types'
import { logVerifyCommand } from '../utils'

const contractName = 'Pool'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments as DeploymentsExtension
  const { deployer, multisig } = await getNamedAccounts()
  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  deployments.log(`Step 010. Deploying on : ${hre.network.name}...`)

  /// Deploy pool
  const deployResult = await deploy(contractName, {
    contract: 'PoolV2',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: multisig, // change to Gnosis Safe after all admin scripts are done
      proxyContract: 'OptimizedTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [parseEther('0.002'), parseEther('0.0001')], // [A, haircut => 1bps]
        },
      },
    },
  })

  // Get freshly deployed Pool contract
  const contract = await ethers.getContractAt(contractName, deployResult.address)
  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  deployments.log('Contract address:', deployResult.address)
  deployments.log('Implementation address:', implAddr)

  if (deployResult.newlyDeployed) {
    // Check setup config values
    const ampFactor = await contract.ampFactor()
    const hairCutRate = await contract.haircutRate()
    deployments.log(`Amplification factor is : ${ampFactor}`)
    deployments.log(`Haircut rate is : ${hairCutRate}`)

    // manually transfer proxyAdmin to multi-sig, do it once and all proxy contracts will follow suit
    // The owner of the ProxyAdmin can upgrade our contracts
    // The owner of the pool contract is very powerful!

    // transfer pool contract dev to Gnosis Safe
    deployments.log(`Transferring dev of ${deployResult.address} to ${multisig}...`)
    // The dev of the pool contract can pause and unpause pools & assets!
    const setDevTxn = await contract.connect(owner).setDev(multisig)
    await setDevTxn.wait()
    deployments.log(`Transferred dev of ${deployResult.address} to:`, multisig)

    /// Admin scripts
    deployments.log(`setFee to 0 for lpDividendRatio and ${10 ** 18} for retentionRatio...`)
    const setFeeTxn = await contract.connect(owner).setFee(0, parseEther('1'))
    await setFeeTxn.wait()

    deployments.log(`setMintFeeThreshold to ${10000 ** 18}...`)
    const setMintFeeThresholdTxn = await contract.connect(owner).setMintFeeThreshold(parseEther('1000'))
    await setMintFeeThresholdTxn.wait()

    logVerifyCommand(hre.network.name, deployResult)
    return deployResult
  } else {
    deployments.log(`${contractName} Contract already deployed.`)
    return deployResult
  }
}

export default deployFunc
deployFunc.tags = [contractName]
