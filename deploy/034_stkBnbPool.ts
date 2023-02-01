import { parseEther } from '@ethersproject/units'
import { formatEther } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { confirmTxn, logVerifyCommand } from '../utils'

const contractName = 'StkBnbPool'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 034. Deploying on : ${hre.network.name}...`)

  /// Deploy DynamicPoolV2
  const deployResult = await deploy(contractName, {
    from: deployer,
    log: true,
    contract: 'DynamicPoolV2', // Use latest (if any) with 'DynamicPoolV2' after audit
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: multisig,
      proxyContract: 'OptimizedTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [parseEther('0.02'), parseEther('0.001')], // [A, haircut]
        },
      },
    },
  })

  // Get freshly deployed DynamicPoolV2 contract
  const pool = await ethers.getContractAt('DynamicPoolV2', deployResult.address)
  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  console.log('Contract address:', deployResult.address)
  console.log('Implementation address:', implAddr)

  if (deployResult.newlyDeployed) {
    const masterWombatV3Deployment = await deployments.get('MasterWombatV3')
    if (masterWombatV3Deployment.address) {
      await confirmTxn(pool.setMasterWombat(masterWombatV3Deployment.address))
      console.log('set master wombat: ', masterWombatV3Deployment.address)
    }

    await confirmTxn(pool.setCovRatioFeeParam(parseEther('1.2'), parseEther('1.5')))

    // Check setup config values
    const ampFactor = await pool.ampFactor()
    const hairCutRate = await pool.haircutRate()
    console.log(`Amplification factor is : ${formatEther(ampFactor)}`)
    console.log(`Haircut rate is : ${formatEther(hairCutRate)}`)

    if (hre.network.name == 'bsc_mainnet') {
      // manually transfer proxyAdmin to multi-sig, do it once and all proxy contracts will follow suit
      // The owner of the ProxyAdmin can upgrade our contracts
      // The owner of the pool contract is very powerful!

      // transfer pool contract dev to Gnosis Safe
      console.log(`Transferring dev of ${deployResult.address} to ${multisig}...`)
      // The dev of the pool contract can pause and unpause pools & assets!
      await confirmTxn(pool.connect(owner).setDev(multisig))
      console.log(`Transferred dev of ${deployResult.address} to:`, multisig)

      /// Admin scripts
      console.log(`setFee to 0 for lpDividendRatio and ${10 ** 18} for retentionRatio...`)
      await confirmTxn(pool.connect(owner).setFee(0, parseEther('1')))

      console.log(`setMintFeeThreshold to ${10000 ** 18}...`)
      await confirmTxn(pool.connect(owner).setMintFeeThreshold(parseEther('1000')))
    }

    logVerifyCommand(hre.network.name, deployResult)
  } else {
    console.log(`${contractName} Contract already deployed.`)
  }
}

export default deployFunc
deployFunc.tags = [contractName]
