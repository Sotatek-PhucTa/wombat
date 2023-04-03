import { formatEther, parseEther } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { FACTORYPOOL_TOKENS_MAP } from '../tokens.config'
import { Network } from '../types'
import { confirmTxn, logVerifyCommand } from '../utils'

export const contractNamePrefix = 'FactoryPools'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const owner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 050. Deploying on : ${hre.network.name}...`)

  const FACTORYPOOL_TOKENS = FACTORYPOOL_TOKENS_MAP[hre.network.name as Network] || {}
  for (const [poolName] of Object.entries(FACTORYPOOL_TOKENS)) {
    const contractName = getFactoryPoolContractName(poolName)

    /// Deploy factory pool
    const deployResult = await deploy(contractName, {
      from: deployer,
      log: true,
      contract: 'HighCovRatioFeePoolV2',
      skipIfAlreadyDeployed: true,
      proxy: {
        owner: multisig,
        proxyContract: 'OptimizedTransparentProxy',
        viaAdminContract: 'DefaultProxyAdmin',
        execute: {
          init: {
            methodName: 'initialize',
            args: [parseEther('0.005'), parseEther('0.0004')],
          },
        },
      },
    })

    // Get freshly deployed FactoryPool contract
    const pool = await ethers.getContractAt('HighCovRatioFeePoolV2', deployResult.address)
    const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
    deployments.log('Contract address:', deployResult.address)
    deployments.log('Implementation address:', implAddr)

    if (deployResult.newlyDeployed) {
      const masterWombatV3Deployment = await deployments.get('MasterWombatV3')
      if (masterWombatV3Deployment.address) {
        await confirmTxn(pool.connect(owner).setMasterWombat(masterWombatV3Deployment.address))
        deployments.log('set master wombat: ', masterWombatV3Deployment.address)
      }

      // Check setup config values
      const ampFactor = await pool.ampFactor()
      const hairCutRate = await pool.haircutRate()
      deployments.log(`Amplification factor is : ${formatEther(ampFactor)}`)
      deployments.log(`Haircut rate is : ${formatEther(hairCutRate)}`)

      // manually transfer proxyAdmin to multi-sig, do it once and all proxy contracts will follow suit
      // The owner of the ProxyAdmin can upgrade our contracts
      // The owner of the pool contract is very powerful!

      // transfer pool contract dev to Gnosis Safe
      deployments.log(`Transferring dev of ${deployResult.address} to ${multisig}...`)
      // The dev of the pool contract can pause and unpause pools & assets!
      await confirmTxn(pool.connect(owner).setDev(multisig))
      deployments.log(`Transferred dev of ${deployResult.address} to:`, multisig)

      /// Admin scripts
      deployments.log(`setFee to 0.5 WAD for lpDividendRatio and 0.5 WAD for retentionRatio...`)
      await confirmTxn(pool.connect(owner).setFee(parseEther('0.5'), parseEther('0.5')))

      deployments.log(`setFeeTo to ${multisig}.`)
      await confirmTxn(pool.connect(owner).setFeeTo(multisig))

      deployments.log(`setMintFeeThreshold to 1000e18...`)
      await confirmTxn(pool.connect(owner).setMintFeeThreshold(parseEther('1000')))
    } else {
      deployments.log(`${contractName} Contract already deployed.`)
    }
    logVerifyCommand(hre.network.name, deployResult)
  }
}

export function getFactoryPoolContractName(poolName: string) {
  return contractNamePrefix + '_' + poolName
}

export default deployFunc
deployFunc.tags = [contractNamePrefix]
deployFunc.dependencies = ['MasterWombatV3']
