import { ethers } from 'hardhat'
import { DeploymentsExtension } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { MegaPool, WormholeAdaptor } from '../build/typechain'
import { WORMHOLE_MAPS } from '../tokens.config'
import { logVerifyCommand } from '../utils'

const contractName = 'WormholeAdaptor'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments as DeploymentsExtension
  const { deployer, multisig } = await getNamedAccounts()
  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  deployments.log(`Step 061. Deploying on : ${hre.network.name}...`)

  const poolDeployment = await deployments.get('MegaPool')

  // Note: For development purpose only. Not production ready
  if (!['bsc_testnet', 'fuji'].includes(hre.network.name)) throw 'WormholeAdaptor is only available in testnet'

  /// Deploy pool
  const deployResult = await deploy(contractName, {
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
          args: [
            WORMHOLE_MAPS[hre.network.name].relayer,
            WORMHOLE_MAPS[hre.network.name].wormholeBridge,
            poolDeployment.address,
          ],
        },
      },
    },
  })

  // Get freshly deployed Pool pool
  const adaptor = (await ethers.getContractAt(contractName, deployResult.address)) as WormholeAdaptor
  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  deployments.log('Contract address:', deployResult.address)
  deployments.log('Implementation address:', implAddr)

  if (deployResult.newlyDeployed) {
    logVerifyCommand(hre.network.name, deployResult)

    // Check setup config values

    // TODO:
    // await adaptor.approveContract(...)
    // await adaptor.approveToken(...)
    // await adaptor.setTargetAdaptor(...)

    const pool = (await ethers.getContractAt('MegaPool', poolDeployment.address)) as MegaPool
    await pool.setAdaptorAddr(adaptor.address)
  } else {
    deployments.log(`${contractName} Contract already deployed.`)
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['MegaPool']
