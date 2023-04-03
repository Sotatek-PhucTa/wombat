import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { assert } from 'chai'
import { Contract } from 'ethers'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  BNBX_POOL_TOKENS_MAP,
  DYNAMICPOOL_TOKENS_MAP,
  FACTORYPOOL_TOKENS_MAP,
  USD_SIDEPOOL_TOKENS_MAP,
  USD_TOKENS_MAP,
  WRAPPED_NATIVE_TOKENS_MAP,
} from '../tokens.config'
import { Network } from '../types'
import { confirmTxn, getUnderlyingTokenAddr, logVerifyCommand } from '../utils'
import { getFactoryPoolContractName } from './050_FactoryPool'

const contractName = 'WombatRouter'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const owner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 110. Deploying on : ${hre.network.name}...`)

  /// Deploy pool
  const deployResult = await deploy('WombatRouter', {
    from: deployer,
    contract: 'WombatRouter',
    log: true,
    args: [WRAPPED_NATIVE_TOKENS_MAP[hre.network.name as Network]],
    skipIfAlreadyDeployed: true,
    deterministicDeployment: false, // will adopt bridging protocols/ wrapped addresses instead of CREATE2
  })

  if (deployResult.newlyDeployed) {
    deployments.log(`Deployment complete.`)
    logVerifyCommand(hre.network.name, deployResult)
  }

  const router = await ethers.getContractAt(contractName, deployResult.address)
  await approveMainPool(router, owner)
  await approveSidePool(router, owner)
  await approveFactoryPools(router, owner)
  await approveDynamicPools(router, owner)
  await approveBnbxPool(router, owner)
  await approveWomSidePools(router, owner)

  return deployResult

  async function approveSpending(
    router: Contract,
    owner: SignerWithAddress,
    tokenAddresses: string[],
    poolAddress: string
  ) {
    assert(tokenAddresses.length > 0)
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

  async function approveMainPool(router: Contract, owner: SignerWithAddress) {
    const tokens = []
    const TOKENS = USD_TOKENS_MAP[hre.network.name]
    for (const index in TOKENS) {
      const maybeAddress = TOKENS[index][2] as string
      const token = ethers.utils.isAddress(maybeAddress)
        ? maybeAddress
        : (await deployments.get(`${TOKENS[index][1]}`)).address
      tokens.push(token)
    }
    const mainPoolDeployment = await deployments.getOrNull('Pool')
    if (!mainPoolDeployment) return
    await approveSpending(router, owner, tokens, mainPoolDeployment.address)
  }

  async function approveSidePool(router: Contract, owner: SignerWithAddress) {
    const sidepoolTokens = []
    const sidepoolAssetsAddress = []
    const SIDEPOOL_TOKENS = USD_SIDEPOOL_TOKENS_MAP[hre.network.name]
    for (const index in SIDEPOOL_TOKENS) {
      sidepoolTokens.push(SIDEPOOL_TOKENS[index][2])
      const asset = await deployments.get(`Asset_SP01_${SIDEPOOL_TOKENS[index][1]}`)
      sidepoolAssetsAddress.push(asset.address)
    }
    const sidePoolDeployment = await deployments.getOrNull('SidePool_01')
    if (!sidePoolDeployment) return
    const approveSpendingTxn3 = await router
      .connect(owner)
      .approveSpendingByPool(sidepoolTokens, sidePoolDeployment.address)
    await approveSpendingTxn3.wait()
  }

  async function approveFactoryPools(router: Contract, owner: SignerWithAddress) {
    const FACTORYPOOL_TOKENS = FACTORYPOOL_TOKENS_MAP[hre.network.name as Network] || {}
    for (const [poolName, poolInfo] of Object.entries(FACTORYPOOL_TOKENS)) {
      const tokens = []
      for (const [, assetInfo] of Object.entries(poolInfo)) {
        const underlyingTokenAddr = await getUnderlyingTokenAddr(assetInfo)
        tokens.push(underlyingTokenAddr)
      }
      const contractName = getFactoryPoolContractName(poolName)
      const poolDeployment = await deployments.get(contractName)

      // approve by poolName
      deployments.log(`Approving pool tokens for Pool: ${contractName}...`)
      await approveSpending(router, owner, tokens, poolDeployment.address)
    }
  }

  // TODO refactor all the approve functions
  async function approveDynamicPools(router: Contract, owner: SignerWithAddress) {
    const DYNAMICPOOL_TOKENS = DYNAMICPOOL_TOKENS_MAP[hre.network.name as Network] || {}
    for (const [poolName, poolInfo] of Object.entries(DYNAMICPOOL_TOKENS)) {
      const tokens = []
      for (const [, assetInfo] of Object.entries(poolInfo)) {
        const underlyingTokenAddr = await getUnderlyingTokenAddr(assetInfo)
        tokens.push(underlyingTokenAddr)
        // approve LP so native token's withdraw/withdrawFromOtherAsset can be used. Examples:
        // To support add/remove BNB, approve LP-BNB
        // To support remove LP-BNBx as BNB, approve LP-BNBx
        const asset = await deployments.get(`Asset_${poolName}_${assetInfo.tokenSymbol}`)
        tokens.push(asset.address)
      }
      const contractName = `DynamicPools_${poolName}`
      const poolDeployment = await deployments.get(contractName)

      // approve by poolName
      deployments.log(`Approving pool tokens for Pool: ${contractName}...`)
      await approveSpending(router, owner, tokens, poolDeployment.address)
    }
  }

  async function approveWomSidePools(router: Contract, owner: SignerWithAddress) {
    const FACTORYPOOL_TOKENS = FACTORYPOOL_TOKENS_MAP[hre.network.name as Network] || {}
    for (const [poolName, poolInfo] of Object.entries(FACTORYPOOL_TOKENS)) {
      const tokens = []
      for (const [, assetInfo] of Object.entries(poolInfo)) {
        const underlyingTokenAddr = await getUnderlyingTokenAddr(assetInfo)
        tokens.push(underlyingTokenAddr)
      }
      const contractName = getFactoryPoolContractName(poolName)
      const poolDeployment = await deployments.get(contractName)

      // approve by poolName
      deployments.log(`Approving pool tokens for Pool: ${contractName}...`)
      await approveSpending(router, owner, tokens, poolDeployment.address)
    }
  }

  async function approveBnbxPool(router: Contract, owner: SignerWithAddress) {
    const bnbx = BNBX_POOL_TOKENS_MAP[hre.network.name] || {}
    const bnbxPool = await deployments.getOrNull('BnbxPool')
    if (!bnbxPool) return
    const tokens = []
    for (const index in bnbx) {
      const tokenAddress = bnbx[index][2] as string
      const tokenSymbol = bnbx[index][1]
      const asset = await deployments.get(`Asset_BnbxPool_${tokenSymbol}`)
      tokens.push(tokenAddress)
      tokens.push(asset.address)
    }
    await approveSpending(router, owner, tokens, bnbxPool.address)
  }
}

export default deployFunc
deployFunc.tags = [contractName]
