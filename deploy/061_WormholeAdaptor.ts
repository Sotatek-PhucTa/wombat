import { ethers } from 'hardhat'
import { DeploymentsExtension } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { CrossChainPool, WormholeAdaptor } from '../build/typechain'
import { WORMHOLE_MAPS } from '../tokens.config'
import { Network } from '../types'
import { logVerifyCommand } from '../utils'

const contractName = 'WormholeAdaptor'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments as DeploymentsExtension
  const { deployer, multisig } = await getNamedAccounts()

  deployments.log(`Step 061. Deploying on : ${hre.network.name}...`)

  const poolDeployment = await deployments.get('CrossChainPool')

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
            1, // TODO: use 15 consistancy level for BNB chain
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

    // Manually set up as addresses are available in other networks:
    // await adaptor.approveToken(...)
    // await adaptor.setAdaptorAddress(...)

    const pool = (await ethers.getContractAt('CrossChainPool', poolDeployment.address)) as CrossChainPool
    await pool.setAdaptorAddr(adaptor.address)
  } else {
    deployments.log(`${contractName} Contract already deployed.`)
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['CrossChainPool']
deployFunc.skip = (hre: HardhatRuntimeEnvironment) => {
  return ![Network.BSC_TESTNET, Network.AVALANCHE_TESTNET, Network.LOCALHOST, Network.HARDHAT].includes(
    hre.network.name as Network
  )
}
