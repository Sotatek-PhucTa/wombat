import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getCurrentNetwork } from '../types/network'
import { CrossChainMessagerType, Network } from '../types'
import { confirmTxn, getDeployedContract } from '../utils'
import { CROSS_CHAIN_POOL_TOKENS_MAP } from '../config/pools.config'
import {
  CrossChainPoolType,
  getAdaptorContracName,
  getAdaptorDeploymentName,
  getAdaptorMessagerType,
  loopAdaptorInGroup,
} from '../config/adaptor.config'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()

  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  const network: Network = getCurrentNetwork()

  deployments.log(`Step 063. Setting up Adaptor: ${network}...`)

  const CROSS_CHAIN_POOL_TOKENS = CROSS_CHAIN_POOL_TOKENS_MAP[network] || {}
  for (const poolType of Object.keys(CROSS_CHAIN_POOL_TOKENS)) {
    const adaptorType = getAdaptorMessagerType(poolType as CrossChainPoolType, network)
    const adaptor = await getDeployedContract(
      getAdaptorContracName(adaptorType),
      getAdaptorDeploymentName(adaptorType, poolType)
    )

    await loopAdaptorInGroup(
      poolType as CrossChainPoolType,
      network,
      async (otherNetwork: Network, otherChainId: number, otherAdaptorAddr: string) => {
        if (adaptorType == CrossChainMessagerType.WORMHOLE) {
          const currentAdaptor = await adaptor.adaptorAddress(otherChainId)
          if (currentAdaptor === ethers.constants.AddressZero) {
            deployments.log(`Add adaptor: ${otherAdaptorAddr} - ${otherNetwork}`)
            await confirmTxn(adaptor.connect(deployerSigner).setAdaptorAddress(otherChainId, otherAdaptorAddr))
          } else if (currentAdaptor !== otherAdaptorAddr) {
            throw new Error(
              `Adaptor ${otherAdaptorAddr} does not match with contract ${adaptor.address}'s state for ${otherChainId}`
            )
          }
        } else {
          await expect(adaptor.getTrustedRemoteAddress(otherChainId)).to.revertedWith('LzApp: no trusted path record')
          deployments.log(`Add adaptor: ${otherAdaptorAddr} - ${otherNetwork}`)
          await confirmTxn(adaptor.connect(deployerSigner).setTrustedRemoteAddress(otherChainId, otherAdaptorAddr))
        }
      },
      async (otherNetwork: Network, otherChainId: number, tokenAddr: string) => {
        const validToken = await adaptor.validToken(otherChainId, tokenAddr)
        if (!validToken) {
          deployments.log(`Approve token: ${tokenAddr} - ${otherNetwork}`)
          await confirmTxn(adaptor.connect(deployerSigner).approveToken(otherChainId, tokenAddr))
        }
      }
    )
  }
}

export default deployFunc
deployFunc.tags = ['CrossChainAdaptorSetup']
deployFunc.dependencies = ['CrossChainAdaptor']
