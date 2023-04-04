import { parseEther } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { deployments, ethers, getNamedAccounts, network, upgrades } from 'hardhat'
import { CROSS_CHAIN_POOL_TOKENS_MAP } from '../tokens.config'
import { Network } from '../types'
import { confirmTxn, getDeployedContract, logVerifyCommand } from '../utils'
import { getPoolDeploymentName } from '../utils/deploy'

export const contractNamePrefix = 'CrossChainPool'

const deployFunc = async function () {
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const coreV3Deployment = await getDeployedContract('CoreV3')
  deployments.log(`Step 060. Deploying on : ${network.name}...`)

  /// Deploy pool
  const CROSS_CHAIN_POOL_TOKENS = CROSS_CHAIN_POOL_TOKENS_MAP[network.name as Network] || {}
  for (const [poolName, poolInfo] of Object.entries(CROSS_CHAIN_POOL_TOKENS)) {
    const contractName = getPoolDeploymentName(contractNamePrefix, poolName)
    const deployResult = await deploy(contractName, {
      from: deployer,
      log: true,
      contract: 'CrossChainPool',
      skipIfAlreadyDeployed: true,
      libraries: { CoreV3: coreV3Deployment.address },
      proxy: {
        owner: multisig, // change to Gnosis Safe after all admin scripts are done
        proxyContract: 'OptimizedTransparentProxy',
        viaAdminContract: 'DefaultProxyAdmin',
        execute: {
          init: {
            methodName: 'initialize',
            args: [parseEther('0.002'), parseEther('0.004')], // [A, haircut => 40bps]
          },
        },
      },
    })

    // Get freshly deployed Pool pool
    const pool = await ethers.getContractAt(contractNamePrefix, deployResult.address)
    const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
    deployments.log('Contract address:', deployResult.address)
    deployments.log('Implementation address:', implAddr)

    if (deployResult.newlyDeployed) {
      await setUpPool(deployerSigner, pool, multisig)
      await configureCrossChainPool(deployerSigner, pool)

      logVerifyCommand(network.name, deployResult)
    } else {
      deployments.log(`${contractNamePrefix} Contract already deployed.`)
    }
  }
}

async function setUpPool(deployerSigner: SignerWithAddress, pool: Contract, multisig: string) {
  const masterWombatV3Deployment = await deployments.getOrNull('MasterWombatV3')
  if (masterWombatV3Deployment?.address) {
    deployments.log('Setting master wombat: ', masterWombatV3Deployment.address)
    await confirmTxn(pool.connect(deployerSigner).setMasterWombat(masterWombatV3Deployment.address))
  }
  await confirmTxn(pool.connect(deployerSigner).setCovRatioFeeParam(parseEther('2'), parseEther('3')))
  // Check setup config values
  const ampFactor = await pool.ampFactor()
  const hairCutRate = await pool.haircutRate()
  deployments.log(`Amplification factor is : ${ampFactor}`)
  deployments.log(`Haircut rate is : ${hairCutRate}`)

  // transfer pool contract dev to Gnosis Safe
  deployments.log(`Transferring dev of ${pool.address} to ${multisig}...`)
  // The dev of the pool contract can pause and unpause pools & assets!
  await confirmTxn(pool.connect(deployerSigner).setDev(multisig))
  deployments.log(`Transferred dev of ${pool.address} to:`, multisig)

  /// Admin scripts
  deployments.log(`setFee to 0.5 for lpDividendRatio and 0.5 for retentionRatio...`)
  await confirmTxn(pool.connect(deployerSigner).setFee(parseEther('0.5'), parseEther('0.5')))

  deployments.log(`setFeeTo to ${multisig}.`)
  await confirmTxn(pool.connect(deployerSigner).setFeeTo(multisig))

  deployments.log(`setMintFeeThreshold to 1000 ...`)
  await confirmTxn(pool.connect(deployerSigner).setMintFeeThreshold(parseEther('1000')))
}

async function configureCrossChainPool(deployerSigner: SignerWithAddress, pool: Contract) {
  deployments.log('configure cross chain pool...')
  await confirmTxn(pool.connect(deployerSigner).setMaximumOutboundCredit(parseEther('100000')))
  await confirmTxn(pool.connect(deployerSigner).setMaximumOutboundCredit(parseEther('100000')))

  await confirmTxn(pool.connect(deployerSigner).setSwapTokensForCreditEnabled(true))
  await confirmTxn(pool.connect(deployerSigner).setSwapCreditForTokensEnabled(true))
}
// Sample swaps:
// - https://testnet.bscscan.com/tx/0xe80a7a90887383e3f201ad73d8a6e46188d66d73d41051123161607d2e696255
// - https://testnet.bscscan.com/tx/0x46fd8910593dd81ee03994a04efe88456e690108544afb1fe6c78ea4276a228e

export default deployFunc
deployFunc.tags = [contractNamePrefix]
deployFunc.dependencies = ['MockTokens', 'CoreV3']
