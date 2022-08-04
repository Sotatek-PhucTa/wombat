import { parseEther } from '@ethersproject/units'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const contractName = 'SidePool_01'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 020. Deploying on : ${hre.network.name}...`)

  /// Deploy sidepool
  const deployResult = await deploy(contractName, {
    from: deployer,
    log: true,
    contract: 'Pool', // TBC with 'HighCovRatioFeePool' after audit
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: multisig, // change to Gnosis Safe after all admin scripts are done
      proxyContract: 'OptimizedTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [parseEther('0.02'), parseEther('0.001')], // [A, haircut] are 10x of main pool
        },
      },
    },
  })

  // Get freshly deployed SubPool contract
  const contract = await ethers.getContractAt('Pool', deployResult.address)
  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  console.log('Contract address:', deployResult.address)
  console.log('Implementation address:', implAddr)

  if (deployResult.newlyDeployed) {
    // Check setup config values
    const ampFactor = await contract.ampFactor()
    const hairCutRate = await contract.haircutRate()
    console.log(`Amplification factor is : ${ampFactor}`)
    console.log(`Haircut rate is : ${hairCutRate}`)

    if (hre.network.name == 'bsc_mainnet') {
      // manually transfer proxyAdmin to multi-sig, do it once and all proxy contracts will follow suit
      // The owner of the ProxyAdmin can upgrade our contracts
      // The owner of the pool contract is very powerful!

      // transfer pool contract dev to Gnosis Safe
      console.log(`Transferring dev of ${deployResult.address} to ${multisig}...`)
      // The dev of the pool contract can pause and unpause pools & assets!
      const setDevTxn = await contract.connect(owner).setDev(multisig)
      await setDevTxn.wait()
      console.log(`Transferred dev of ${deployResult.address} to:`, multisig)

      /// Admin scripts
      console.log(`setFee to 0 for lpDividendRatio and ${10 ** 18} for retentionRatio...`)
      const setFeeTxn = await contract.connect(owner).setFee(0, parseEther('1'))
      await setFeeTxn.wait()

      console.log(`setMintFeeThreshold to ${10000 ** 18}...`)
      const setMintFeeThresholdTxn = await contract.connect(owner).setMintFeeThreshold(parseEther('1000'))
      await setMintFeeThresholdTxn.wait()
    }
    return deployResult
  } else {
    console.log(`${contractName} Contract already deployed.`)
    return deployResult
  }
}

export default deployFunc
deployFunc.tags = [contractName]
