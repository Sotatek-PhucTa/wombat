import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { assert } from 'chai'
import { Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { CROSS_CHAIN_POOL_TOKENS_MAP, DYNAMICPOOL_TOKENS_MAP, FACTORYPOOL_TOKENS_MAP } from '../config/pools.config'
import { getWrappedNativeToken } from '../config/router.config'
import { IPoolConfig, NetworkPoolInfo } from '../types'
import { confirmTxn, getDeployedContract, getUnderlyingTokenAddr, logVerifyCommand } from '../utils'
import { getAssetDeploymentName, getPoolDeploymentName } from '../utils/deploy'
import { Token, getTokenAddress } from '../config/token'
import { getCurrentNetwork } from '../types/network'

const contractName = 'WombatRouter'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const owner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const network = getCurrentNetwork()

  deployments.log(`Step 110. Deploying on : ${network}...`)

  /// Deploy pool
  const wrappedNativeToken = await getWrappedNativeToken()
  assert(wrappedNativeToken != Token.UNKNOWN, 'Wrapped native token is not set')
  const deployResult = await deploy('WombatRouter', {
    from: deployer,
    contract: 'WombatRouter',
    log: true,
    args: [await getTokenAddress(wrappedNativeToken)],
    skipIfAlreadyDeployed: true,
    deterministicDeployment: false, // will adopt bridging protocols/ wrapped addresses instead of CREATE2
  })

  if (deployResult.newlyDeployed) {
    deployments.log(`Deployment complete.`)
    logVerifyCommand(deployResult)
  }

  const router = await ethers.getContractAt(contractName, deployResult.address)
  await approveForPools(router, FACTORYPOOL_TOKENS_MAP[network] || {}, owner)
  await approveForPools(router, DYNAMICPOOL_TOKENS_MAP[network] || {}, owner)
  await approveForPools(router, CROSS_CHAIN_POOL_TOKENS_MAP[network] || {}, owner)

  return deployResult
}

async function approveForPools(router: Contract, poolConfigs: NetworkPoolInfo<IPoolConfig>, owner: SignerWithAddress) {
  for (const [poolName, poolInfo] of Object.entries(poolConfigs)) {
    const tokens = []
    for (const [, assetInfo] of Object.entries(poolInfo.assets)) {
      const underlyingTokenAddr = await getUnderlyingTokenAddr(assetInfo)
      tokens.push(underlyingTokenAddr)
      if (poolInfo.setting.supportNativeToken) {
        // approve LP so native token's withdraw/withdrawFromOtherAsset can be used. Examples:
        // To support add/remove BNB, approve LP-BNB
        // To support remove LP-BNBx as BNB, approve LP-BNBx
        const asset = await getDeployedContract('Asset', getAssetDeploymentName(poolName, assetInfo.tokenSymbol))
        tokens.push(asset.address)
      }
    }
    const deploymentName = getPoolDeploymentName(poolInfo.setting.deploymentNamePrefix, poolName)
    const poolDeployment = await deployments.get(deploymentName)
    if (deploymentName == 'FactoryPools_StandalonePool') {
      continue // this pool only holds deprecated tokens
    }

    deployments.log(`Checking Pool ${deploymentName}...`)
    await approveSpending(router, owner, tokens, poolDeployment.address)
  }
}

async function approveSpending(
  router: Contract,
  owner: SignerWithAddress,
  tokenAddresses: string[],
  poolAddress: string
) {
  assert(tokenAddresses.length > 0, `tokenAddresses is empty for ${poolAddress}`)
  if (await isAllApproved(tokenAddresses, router.address, poolAddress)) {
    deployments.log(
      `Skip approving spending on ${poolAddress} since it is already approved for token ${tokenAddresses[0]}`
    )
  } else {
    deployments.log(`Approving spending on ${poolAddress} for ${tokenAddresses}`)
    await confirmTxn(router.connect(owner).approveSpendingByPool(tokenAddresses, poolAddress))
  }
}

async function isAllApproved(tokens: string[], owner: string, spender: string) {
  const isTokenApproved = await Promise.all(tokens.map((token) => isApproved(token, owner, spender)))
  return isTokenApproved.every((t) => t)
}

async function isApproved(token: string, owner: string, spender: string) {
  const erc20 = await ethers.getContractAt('ERC20', token)
  const allowance = await erc20.allowance(owner, spender)
  return allowance > 0
}

export default deployFunc
deployFunc.tags = [contractName]
