import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  WRAPPED_NATIVE_TOKENS_MAP,
  USD_TOKENS_MAP,
  IUSD_POOL_TOKENS_MAP,
  CUSD_POOL_TOKENS_MAP,
  AXLUSDC_POOL_TOKENS_MAP,
  USDD_POOL_TOKENS_MAP,
  USD_SIDEPOOL_TOKENS_MAP,
  WOM_DYNAMICPOOL_TOKENS_MAP,
  FACTORYPOOL_TOKENS_MAP,
  BNBX_POOL_TOKENS_MAP,
} from '../tokens.config'
import { confirmTxn, logVerifyCommand } from '../utils'
import { getPoolContractName } from './040_WomSidePool'
import { getFactoryPoolContractName } from './050_FactoryPool'

const contractName = 'WombatRouter'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  deployments.log(`Step 110. Deploying on : ${hre.network.name}...`)

  /// Deploy pool
  const deployResult = await deploy(`${hre.network.name == 'bsc_mainnet' ? 'WombatRouter' : 'Router'}`, {
    // 'WombatRouter' is for mainnet, 'Router' is for testnet
    from: deployer,
    contract: 'WombatRouter',
    log: true,
    args: [WRAPPED_NATIVE_TOKENS_MAP[hre.network.name]],
    skipIfAlreadyDeployed: true,
    deterministicDeployment: false, // will adopt bridging protocols/ wrapped addresses instead of CREATE2
  })

  if (!deployResult.newlyDeployed) {
    if (
      hre.network.name == 'localhost' ||
      hre.network.name == 'hardhat' ||
      hre.network.name == 'bsc_testnet' ||
      hre.network.name == 'bsc_mainnet'
    ) {
      const router = await ethers.getContractAt(contractName, deployResult.address)
      await approveMainPool(router, owner)
      await approveIusdPool(router, owner)
      await approveCusdPool(router, owner)
      await approveAxlUsdcPool(router, owner)
      await approveUsddPool(router, owner)
      await approveSidePool(router, owner)
      await approveFactoryPools(router, owner)
      await approveWomPools(router, owner)
      await approveBnbxPool(router, owner)
    }

    deployments.log(`Deployment complete.`)
    logVerifyCommand(hre.network.name, deployResult)
  }

  return deployResult

  // TODO: skip approval if already approved
  async function approveSpending(
    router: Contract,
    owner: SignerWithAddress,
    tokenAddresses: string[],
    poolAddress: string
  ) {
    await confirmTxn(router.connect(owner).approveSpendingByPool(tokenAddresses, poolAddress))
  }

  async function approveMainPool(router: Contract, owner: SignerWithAddress) {
    const tokens = []
    const TOKENS = USD_TOKENS_MAP[hre.network.name]
    for (const index in TOKENS) {
      tokens.push(TOKENS[index][2] as string)
    }
    const mainPoolDeployment = await deployments.get('Pool')
    await approveSpending(router, owner, tokens, mainPoolDeployment.address)
  }

  async function approveIusdPool(router: Contract, owner: SignerWithAddress) {
    const tokens = []
    const TOKENS = IUSD_POOL_TOKENS_MAP[hre.network.name]
    for (const index in TOKENS) {
      let address = ''
      hre.network.name == 'bsc_mainnet'
        ? (address = TOKENS[index][2] as string)
        : (address = (await deployments.get(`${TOKENS[index][1]}`)).address as string)
      tokens.push(address)
    }
    const poolDeployment = await deployments.get('IUSDPool')
    await approveSpending(router, owner, tokens, poolDeployment.address)
  }

  async function approveCusdPool(router: Contract, owner: SignerWithAddress) {
    const tokens = []
    const TOKENS = CUSD_POOL_TOKENS_MAP[hre.network.name]
    for (const index in TOKENS) {
      let address = ''
      hre.network.name == 'bsc_mainnet'
        ? (address = TOKENS[index][2] as string)
        : (address = (await deployments.get(`${TOKENS[index][1]}`)).address as string)
      tokens.push(address)
    }
    const poolDeployment = await deployments.get('CUSDPool')
    await approveSpending(router, owner, tokens, poolDeployment.address)
  }

  async function approveAxlUsdcPool(router: Contract, owner: SignerWithAddress) {
    const tokens = []
    const TOKENS = AXLUSDC_POOL_TOKENS_MAP[hre.network.name]
    for (const index in TOKENS) {
      let address = ''
      hre.network.name == 'bsc_mainnet'
        ? (address = TOKENS[index][2] as string)
        : (address = (await deployments.get(`${TOKENS[index][1]}`)).address as string)
      tokens.push(address)
    }
    const poolDeployment = await deployments.get('AxlUsdcPool')
    await approveSpending(router, owner, tokens, poolDeployment.address)
  }

  async function approveUsddPool(router: Contract, owner: SignerWithAddress) {
    const tokens = []
    const TOKENS = USDD_POOL_TOKENS_MAP[hre.network.name]
    for (const index in TOKENS) {
      let address = ''
      hre.network.name == 'bsc_mainnet'
        ? (address = TOKENS[index][2] as string)
        : (address = (await deployments.get(`${TOKENS[index][1]}`)).address as string)
      tokens.push(address)
    }
    const poolDeployment = await deployments.get('USDDPool')
    await approveSpending(router, owner, tokens, poolDeployment.address)
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
    const sidePoolDeployment = await deployments.get('SidePool_01')
    const approveSpendingTxn3 = await router
      .connect(owner)
      .approveSpendingByPool(sidepoolTokens, sidePoolDeployment.address)
    await approveSpendingTxn3.wait()
  }

  async function approveFactoryPools(router: Contract, owner: SignerWithAddress) {
    const FACTORYPOOL_TOKENS = FACTORYPOOL_TOKENS_MAP[hre.network.name]
    for (const poolName of Object.keys(FACTORYPOOL_TOKENS)) {
      const factoryPoolTokens = []
      for (const args of Object.values(FACTORYPOOL_TOKENS[poolName])) {
        let asset = ''
        hre.network.name == 'bsc_mainnet'
          ? (asset = args[2] as string)
          : (asset = (await deployments.get(`${args[1]}`)).address as string)
        factoryPoolTokens.push(asset)
      }
      const contractName = getFactoryPoolContractName(poolName)
      const factoryPoolDeployment = await deployments.get(contractName)

      // approve by poolName
      deployments.log(`Approving pool tokens for Pool: ${contractName}...`)
      await approveSpending(router, owner, factoryPoolTokens, factoryPoolDeployment.address)
    }
  }

  async function approveWomPools(router: Contract, owner: SignerWithAddress) {
    const WOM_SIDEPOOL_TOKENS = WOM_DYNAMICPOOL_TOKENS_MAP[hre.network.name]
    for (const poolName of Object.keys(WOM_SIDEPOOL_TOKENS)) {
      const womSidePoolTokens = []
      for (const args of Object.values(WOM_SIDEPOOL_TOKENS[poolName])) {
        let asset = ''
        hre.network.name == 'bsc_mainnet'
          ? (asset = args[2] as string)
          : (asset = (await deployments.get(`${args[1]}`)).address as string)
        womSidePoolTokens.push(asset)
      }
      const contractName = getPoolContractName(poolName)
      const womSidePoolDeployment = await deployments.get(contractName)

      // approve by poolName
      deployments.log(`Approving pool tokens for Pool: ${contractName}...`)
      await approveSpending(router, owner, womSidePoolTokens, womSidePoolDeployment.address)
    }
  }

  async function approveBnbxPool(router: Contract, owner: SignerWithAddress) {
    const bnbx = BNBX_POOL_TOKENS_MAP[hre.network.name]
    const bnbxPool = await deployments.get('BnbxPool')
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
