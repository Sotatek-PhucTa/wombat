// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { deployments, ethers, getNamedAccounts, network, upgrades } from 'hardhat'
import { WormholeAdaptor } from '../build/typechain'
import { CROSS_CHAIN_POOL_TOKENS_MAP } from '../config/pools.config'
import { WORMHOLE_CONFIG_MAPS } from '../config/wormhole.config'
import { getDeployedContract, logVerifyCommand } from '../utils'
import { getPoolDeploymentName } from '../utils/deploy'
import { contractNamePrefix } from './060_CrossChainPool'
import { getCurrentNetwork } from '../types/network'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const contractName = 'WormholeAdaptor'

// Ref: Relayer testnet deployments: https://book.wormhole.com/reference/contracts.html#relayer-contracts

const deployFunc = async function () {
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const network = getCurrentNetwork()

  deployments.log(`Step 062. Deploying on : ${network}...`)

  const wormholeConfig = WORMHOLE_CONFIG_MAPS[network]
  if (wormholeConfig === undefined) {
    console.error('wormholeConfig is undefined')
    throw 'wormholeConfig is undefined'
  }

  /// Deploy pools

  const CROSS_CHAIN_POOL_TOKENS = CROSS_CHAIN_POOL_TOKENS_MAP[network] || {}
  for (const poolName of Object.keys(CROSS_CHAIN_POOL_TOKENS)) {
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
            args: [wormholeConfig.relayer, wormholeConfig.wormholeBridge, pool.address],
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
      logVerifyCommand(deployResult)

      await pool.connect(deployerSigner).setAdaptorAddr(adaptor.address)
    } else {
      deployments.log(`${contractName} Contract already deployed.`)
    }
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['CrossChainPool']
