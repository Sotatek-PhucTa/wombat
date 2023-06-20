import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { assert } from 'chai'
import { Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { CROSS_CHAIN_POOL_TOKENS_MAP, DYNAMICPOOL_TOKENS_MAP, FACTORYPOOL_TOKENS_MAP } from '../config/tokens.config'
import { getWrappedNativeToken } from '../config/router.config'
import { IPoolConfig, Network, NetworkPoolInfo } from '../types'
import { confirmTxn, getDeployedContract, getUnderlyingTokenAddr, logVerifyCommand } from '../utils'
import { getAssetDeploymentName, getPoolDeploymentName } from '../utils/deploy'
import { Token, getTokenAddress } from '../config/token'

const contractName = 'WombatRouter'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const owner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 110. Deploying on : ${hre.network.name}...`)

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
    logVerifyCommand(hre.network.name, deployResult)
  }

  const router = await ethers.getContractAt(contractName, deployResult.address)
  await approveForPools(router, FACTORYPOOL_TOKENS_MAP[hre.network.name as Network] || {}, owner)
  await approveForPools(router, DYNAMICPOOL_TOKENS_MAP[hre.network.name as Network] || {}, owner)
  await approveForPools(router, CROSS_CHAIN_POOL_TOKENS_MAP[hre.network.name as Network] || {}, owner)

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

    // approve by poolName
    deployments.log(`Approving pool tokens for Pool: ${deploymentName}...`)
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
  // We only sample the last token here. This is a heuristics that changes are append to config. We already verified
  // tokenAddresses exist. So at(-1) can't be null, but linter is stupid.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const erc20 = await ethers.getContractAt('ERC20', tokenAddresses.at(-1)!)
  if ((await erc20.allowance(router.address, poolAddress)) > 0) {
    deployments.log(
      `Skip approving spending on ${poolAddress} since it is already approved for token ${tokenAddresses[0]}`
    )
  } else {
    deployments.log(`Approving spending on ${poolAddress} for ${tokenAddresses}`)
    await confirmTxn(router.connect(owner).approveSpendingByPool(tokenAddresses, poolAddress))
  }
}

export default deployFunc
deployFunc.tags = [contractName]
