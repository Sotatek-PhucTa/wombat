import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getCurrentNetwork } from '../types/network'
import { Network } from '../types'
import { confirmTxn, getAddress, getDeployedContract } from '../utils'
import { CROSS_CHAIN_POOL_TOKENS_MAP } from '../config/pools.config'
import { NETWORK_GROUP_MAP, WORMHOLE_ADAPTOR_CONFIG_MAP, WORMHOLE_ID_CONFIG_MAP } from '../config/wormhole.config'
import { Token, getTokenDeploymentOrAddress } from '../config/token'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getWormholeAdaptorDeploymentName } from '../utils/deploy'

const wormholeAdaptorContractName = 'WormholeAdaptor'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()

  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  const network: Network = getCurrentNetwork()

  deployments.log(`Step 063. Setting up Adaptor: ${network}...`)

  const otherNetworksInGroup = Object.entries(NETWORK_GROUP_MAP)
    .filter(([nw, nwGroup]) => nwGroup === NETWORK_GROUP_MAP[network] && nw !== network)
    .map((el) => el[0] as Network)

  const CROSS_CHAIN_POOL_TOKENS = CROSS_CHAIN_POOL_TOKENS_MAP[network] || {}
  for (const poolName of Object.keys(CROSS_CHAIN_POOL_TOKENS)) {
    const wormholeAdaptor = await getDeployedContract(
      wormholeAdaptorContractName,
      getWormholeAdaptorDeploymentName(poolName)
    )

    // We only approve the adaptor if it is within the same network group
    for (const otherNetwork of otherNetworksInGroup) {
      const otherNetworkConfig = WORMHOLE_ADAPTOR_CONFIG_MAP[otherNetwork]
      if (otherNetworkConfig && otherNetworkConfig[poolName]) {
        const otherAdapterAddr = await getAddress(otherNetworkConfig[poolName].adaptorAddr)
        const tokens = otherNetworkConfig[poolName].tokens

        const wormholeId = WORMHOLE_ID_CONFIG_MAP[otherNetwork]
        // Set Adaptor within the same network group
        const currentAdaptor = await wormholeAdaptor.adaptorAddress(wormholeId)
        if (currentAdaptor === ethers.constants.AddressZero) {
          deployments.log(`Add adaptor: ${otherAdapterAddr} - ${otherNetwork}`)
          await confirmTxn(wormholeAdaptor.connect(deployerSigner).setAdaptorAddress(wormholeId, otherAdapterAddr))
        } else if (currentAdaptor !== otherAdapterAddr) {
          throw new Error(
            `Adaptor ${otherAdapterAddr} does not match with contract ${wormholeAdaptor.address}'s state for ${wormholeId}`
          )
        }

        // Approve tokens from other chains within the same group
        for (const token of tokens) {
          const tokenDeployment = getTokenDeploymentOrAddress(token, otherNetwork)
          const tokenAddr = await getAddress(tokenDeployment)
          const validToken = await wormholeAdaptor.validToken(wormholeId, tokenAddr)
          if (!validToken) {
            deployments.log(`Approve token: ${Token[token]} at ${tokenAddr} - ${otherNetwork}`)
            await confirmTxn(wormholeAdaptor.connect(deployerSigner).approveToken(wormholeId, tokenAddr))
          }
        }
      }
    }
  }
}

export default deployFunc
deployFunc.tags = ['WormholeAdaptorSetup']
deployFunc.dependencies = [wormholeAdaptorContractName]
