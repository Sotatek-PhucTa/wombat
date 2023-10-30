// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { deployments, ethers, getNamedAccounts, network, upgrades } from 'hardhat'
import { WormholeAdaptor } from '../build/typechain'
import { CROSS_CHAIN_POOL_TOKENS_MAP } from '../config/pools.config'
import { WORMHOLE_CONFIG_MAPS } from '../config/wormhole.config'
import { getAddress, getDeployedContract, logVerifyCommand } from '../utils'
import { getPoolDeploymentName, getProxyAdminOwner } from '../utils/deploy'
import { contractNamePrefix } from './060_CrossChainPool'
import { getCurrentNetwork } from '../types/network'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { CrossChainMessagerType, ILayerZeroConfig, IWormholeConfig, Network } from '../types'
import {
  CrossChainPoolType,
  getAdaptorContracName,
  getAdaptorMessagerType,
  getCrossChainMessagerConfig,
} from '../config/adaptor.config'
import { LAYERZERO_CONFIG_MAPS } from '../config/layerzero.config'

const contractName = 'WormholeAdaptor'

// Ref: Relayer testnet deployments: https://book.wormhole.com/reference/contracts.html#relayer-contracts

const deployFunc = async function () {
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const network = getCurrentNetwork()

  deployments.log(`Step 061. Deploying on : ${network}...`)

  const CROSS_CHAIN_POOL_TOKENS = CROSS_CHAIN_POOL_TOKENS_MAP[network] || {}
  for (const poolName of Object.keys(CROSS_CHAIN_POOL_TOKENS)) {
    const adaptorType = getAdaptorMessagerType(poolName as CrossChainPoolType, network)
    const contractName = getAdaptorContracName(adaptorType)
    const poolContractName = getPoolDeploymentName(contractNamePrefix, poolName)
    const pool = await getDeployedContract('CrossChainPool', poolContractName)

    const messagerConfig = getCrossChainMessagerConfig(adaptorType, network)

    const deployResult = await deploy(contractName + '_' + poolName, {
      from: deployer,
      log: true,
      contract: contractName,
      skipIfAlreadyDeployed: true,
      proxy: {
        owner: await getProxyAdminOwner(),
        proxyContract: 'OptimizedTransparentProxy',
        viaAdminContract: 'DefaultProxyAdmin',
        execute: {
          init: {
            methodName: 'initialize',
            args:
              adaptorType == CrossChainMessagerType.WORMHOLE
                ? [
                    await getAddress((messagerConfig as IWormholeConfig).relayer),
                    await getAddress((messagerConfig as IWormholeConfig).wormholeBridge),
                    pool.address,
                  ]
                : [await getAddress((messagerConfig as ILayerZeroConfig).endpoint), pool.address],
          },
        },
      },
    })

    // Get freshly deployed Pool pool
    const adaptor = (await ethers.getContractAt(contractName, deployResult.address)) as WormholeAdaptor
    const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
    deployments.log('Contract address:', deployResult.address)
    deployments.log('Implementation address:', implAddr)
    deployments.log('Please update ADAPTOR_CONFIG_MAP after deployment')

    if (deployResult.newlyDeployed) {
      logVerifyCommand(deployResult)

      await pool.connect(deployerSigner).setAdaptorAddr(adaptor.address)
    } else {
      deployments.log(`${contractName} Contract already deployed.`)
    }
  }
}

export default deployFunc
deployFunc.tags = ['CrossChainAdaptor']
deployFunc.dependencies = ['MockWormhole', 'MockLayerZero', 'CrossChainPool']
