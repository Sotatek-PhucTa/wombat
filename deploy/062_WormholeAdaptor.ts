import { deployments, ethers, getNamedAccounts, network, upgrades } from 'hardhat'
import { WormholeAdaptor } from '../build/typechain'
import { CROSS_CHAIN_POOL_TOKENS_MAP, WORMHOLE_CONFIG_MAPS } from '../tokens.config'
import { Network } from '../types'
import { getDeployedContract, logVerifyCommand } from '../utils'
import { getPoolDeploymentName } from '../utils/deploy'
import { contractNamePrefix } from './060_CrossChainPool'

const contractName = 'WormholeAdaptor'

const deployFunc = async function () {
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  deployments.log(`Step 062. Deploying on : ${network.name}...`)

  const wormholeConfig = WORMHOLE_CONFIG_MAPS[network.name as Network]
  if (wormholeConfig === undefined) {
    console.error('wormholeConfig is undefined')
    throw 'wormholeConfig is undefined'
  }

  /// Deploy pools

  const CROSS_CHAIN_POOL_TOKENS = CROSS_CHAIN_POOL_TOKENS_MAP[network.name as Network] || {}
  for (const [poolName, poolInfo] of Object.entries(CROSS_CHAIN_POOL_TOKENS)) {
    const poolContractName = getPoolDeploymentName(contractNamePrefix, poolName)
    const pool = await getDeployedContract('CrossChainPool', poolContractName)

    const deployResult = await deploy(contractName + '_' + poolName, {
      from: deployer,
      log: true,
      contract: contractName,
      skipIfAlreadyDeployed: true,
      proxy: {
        owner: multisig, // change to Gnosis Safe after all admin scripts are done
        proxyContract: 'OptimizedTransparentProxy',
        viaAdminContract: 'DefaultProxyAdmin',
        execute: {
          init: {
            methodName: 'initialize',
            args: [
              wormholeConfig.relayer,
              wormholeConfig.wormholeBridge,
              pool.address,
              wormholeConfig.consistencyLevel,
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
    deployments.log('Please update WORMHOLE_ADAPTOR_CONFIG_MAP after deployment')

    if (deployResult.newlyDeployed) {
      logVerifyCommand(network.name, deployResult)

      // Check setup config values

      // Manually set up as addresses are available in other networks:
      // TODO: we may consider reading WORMHOLE_ADAPTOR_CONFIG_MAP to add it programatically
      // await adaptor.approveToken(...)
      // await adaptor.setAdaptorAddress(...)

      await pool.setAdaptorAddr(adaptor.address)
    } else {
      deployments.log(`${contractName} Contract already deployed.`)
    }
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['CrossChainPool']
