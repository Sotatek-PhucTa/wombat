import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getCurrentNetwork } from '../types/network'
import { Network } from '../types'
import { confirmTxn, getDeployedContract } from '../utils'
import { CROSS_CHAIN_POOL_TOKENS_MAP } from '../config/pools.config'
import { CrossChainPoolType, loopAdaptorInGroup } from '../config/wormhole.config'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getWormholeAdaptorDeploymentName } from '../utils/deploy'

const wormholeAdaptorContractName = 'WormholeAdaptor'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()

  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  const network: Network = getCurrentNetwork()

  deployments.log(`Step 063. Setting up Adaptor: ${network}...`)

  const CROSS_CHAIN_POOL_TOKENS = CROSS_CHAIN_POOL_TOKENS_MAP[network] || {}
  for (const poolType of Object.keys(CROSS_CHAIN_POOL_TOKENS)) {
    const wormholeAdaptor = await getDeployedContract(
      wormholeAdaptorContractName,
      getWormholeAdaptorDeploymentName(poolType)
    )

    await loopAdaptorInGroup(
      poolType as CrossChainPoolType,
      network,
      async (otherNetwork: Network, wormholeId: number, otherAdaptorAddr: string) => {
        const currentAdaptor = await wormholeAdaptor.adaptorAddress(wormholeId)
        if (currentAdaptor === ethers.constants.AddressZero) {
          deployments.log(`Add adaptor: ${otherAdaptorAddr} - ${otherNetwork}`)
          await confirmTxn(wormholeAdaptor.connect(deployerSigner).setAdaptorAddress(wormholeId, otherAdaptorAddr))
        } else if (currentAdaptor !== otherAdaptorAddr) {
          throw new Error(
            `Adaptor ${otherAdaptorAddr} does not match with contract ${wormholeAdaptor.address}'s state for ${wormholeId}`
          )
        }
      },
      async (otherNetwork: Network, wormholeId: number, tokenAddr: string) => {
        const validToken = await wormholeAdaptor.validToken(wormholeId, tokenAddr)
        if (!validToken) {
          deployments.log(`Approve token: ${tokenAddr} - ${otherNetwork}`)
          await confirmTxn(wormholeAdaptor.connect(deployerSigner).approveToken(wormholeId, tokenAddr))
        }
      }
    )
  }
}

export default deployFunc
deployFunc.tags = ['WormholeAdaptorSetup']
deployFunc.dependencies = [wormholeAdaptorContractName]
