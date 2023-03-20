import { formatEther, parseEther } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DYNAMICPOOL_TOKENS_MAP } from '../tokens.config'
import { Network } from '../types'
import { confirmTxn, logVerifyCommand } from '../utils'
import { getPoolContractName } from '../utils/deploy'

export const contractNamePrefix = 'DynamicPools'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  deployments.log(`Step 036. Deploying on : ${hre.network.name}...`)

  /// Deploy DynamicPoolV2
  const DYNAMICPOOL_TOKENS = DYNAMICPOOL_TOKENS_MAP[hre.network.name as Network] || {}
  for (const [poolName] of Object.entries(DYNAMICPOOL_TOKENS)) {
    const contractName = getPoolContractName(contractNamePrefix, poolName)

    const deployResult = await deploy(contractName, {
      from: deployer,
      log: true,
      contract: 'DynamicPoolV2',
      skipIfAlreadyDeployed: true,
      proxy: {
        owner: multisig,
        proxyContract: 'OptimizedTransparentProxy',
        viaAdminContract: 'DefaultProxyAdmin',
        execute: {
          init: {
            methodName: 'initialize',
            args: [parseEther('0.02'), parseEther('0.001')], // [A, haircut] are 0.01 and 0.1% respectively
          },
        },
      },
    })

    // Get freshly deployed DynamicPoolV2 contract
    const pool = await ethers.getContractAt('DynamicPoolV2', deployResult.address)
    const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
    deployments.log('Contract address:', deployResult.address)
    deployments.log('Implementation address:', implAddr)

    if (deployResult.newlyDeployed) {
      const masterWombatV3Deployment = await deployments.get('MasterWombatV3')
      if (masterWombatV3Deployment.address) {
        await confirmTxn(pool.setMasterWombat(masterWombatV3Deployment.address))
        deployments.log('set master wombat: ', masterWombatV3Deployment.address)
      }
      await confirmTxn(pool.setCovRatioFeeParam(parseEther('1.2'), parseEther('1.5')))
      // Check setup config values
      const ampFactor = await pool.ampFactor()
      const hairCutRate = await pool.haircutRate()
      deployments.log(`Amplification factor is : ${formatEther(ampFactor)}`)
      deployments.log(`Haircut rate is : ${formatEther(hairCutRate)}`)

      if (hre.network.name == 'bsc_mainnet') {
        // manually transfer proxyAdmin to multi-sig, do it once and all proxy contracts will follow suit
        // The owner of the ProxyAdmin can upgrade our contracts
        // The owner of the pool contract is very powerful!

        // transfer pool contract dev to Gnosis Safe
        deployments.log(`Transferring dev of ${deployResult.address} to ${multisig}...`)
        // The dev of the pool contract can pause and unpause pools & assets!
        await confirmTxn(pool.connect(owner).setDev(multisig))
        deployments.log(`Transferred dev of ${deployResult.address} to:`, multisig)

        /// Admin scripts
        deployments.log(`setFee to 0.5 for lpDividendRatio and 0.5 for retentionRatio...`)
        await confirmTxn(pool.connect(owner).setFee(parseEther('0.5'), parseEther('0.5')))

        deployments.log(`setFeeTo to ${multisig}.`)
        await confirmTxn(pool.connect(owner).setFeeTo(multisig))

        deployments.log(`setMintFeeThreshold to 0.01 ...`)
        await confirmTxn(pool.connect(owner).setMintFeeThreshold(parseEther('0.01')))
      }

      logVerifyCommand(hre.network.name, deployResult)
    } else {
      deployments.log(`${contractName} Contract already deployed.`)
    }
  }
}

export default deployFunc
deployFunc.tags = [contractNamePrefix]
deployFunc.dependencies = ['MasterWombatV3']
