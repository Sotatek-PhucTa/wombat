import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
  WRAPPED_NATIVE_TOKENS_MAP,
  USD_TOKENS_MAP,
  BNB_DYNAMICPOOL_TOKENS_MAP,
  USD_SIDEPOOL_TOKENS_MAP,
  WOM_DYNAMICPOOL_TOKENS_MAP,
  FACTORYPOOL_TOKENS_MAP,
} from '../tokens.config'
import { logVerifyCommand } from '../utils'
import { getPoolContractName } from './040_WomSidePool'
import { getFactoryPoolContractName } from './050_FactoryPool'

const contractName = 'WombatRouter'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 110. Deploying on : ${hre.network.name}...`)

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

  const address = deployResult.address

  if (!deployResult.newlyDeployed) {
    if (
      hre.network.name == 'localhost' ||
      hre.network.name == 'hardhat' ||
      hre.network.name == 'bsc_testnet' ||
      hre.network.name == 'bsc_mainnet'
    ) {
      const router = await ethers.getContractAt(contractName, deployResult.address)
      const usdTokens = []
      const usdAssetsAddress = []
      const USD_TOKENS = USD_TOKENS_MAP[hre.network.name]
      for (const index in USD_TOKENS) {
        usdTokens.push(USD_TOKENS[index][2]) // token address
        const asset = await deployments.get(`Asset_P01_${USD_TOKENS[index][1]}`)
        usdAssetsAddress.push(asset.address) // asset address
      }

      const bnbTokens = []
      const bnbAssetsAddress = []
      const BNB_TOKENS = BNB_DYNAMICPOOL_TOKENS_MAP[hre.network.name]
      for (const index in BNB_TOKENS) {
        bnbTokens.push(BNB_TOKENS[index][2])
        const asset = await deployments.get(`Asset_DP01_${BNB_TOKENS[index][1]}`)
        bnbAssetsAddress.push(asset.address)
      }

      const sidepoolTokens = []
      const sidepoolAssetsAddress = []
      const SIDEPOOL_TOKENS = USD_SIDEPOOL_TOKENS_MAP[hre.network.name]
      for (const index in SIDEPOOL_TOKENS) {
        sidepoolTokens.push(SIDEPOOL_TOKENS[index][2])
        const asset = await deployments.get(`Asset_SP01_${SIDEPOOL_TOKENS[index][1]}`)
        sidepoolAssetsAddress.push(asset.address)
      }

      const womSidePoolTokens = []
      const WOM_SIDEPOOL_TOKENS = WOM_DYNAMICPOOL_TOKENS_MAP[hre.network.name]
      for (const poolName of Object.keys(WOM_SIDEPOOL_TOKENS)) {
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
        console.log(`Approving pool tokens for Pool: ${contractName}...`)
        const approveSpendingTxnByPool1 = await router
          .connect(owner)
          .approveSpendingByPool(womSidePoolTokens, womSidePoolDeployment.address)
        await approveSpendingTxnByPool1.wait()

        // reset array
        womSidePoolTokens.length = 0
      }

      const factoryPoolTokens = []
      const FACTORYPOOL_TOKENS = FACTORYPOOL_TOKENS_MAP[hre.network.name]
      for (const poolName of Object.keys(FACTORYPOOL_TOKENS)) {
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
        console.log(`Approving pool tokens for Pool: ${contractName}...`)
        const approveSpendingTxnByPool1 = await router
          .connect(owner)
          .approveSpendingByPool(factoryPoolTokens, factoryPoolDeployment.address)
        await approveSpendingTxnByPool1.wait()

        // reset array
        factoryPoolTokens.length = 0
      }

      const mainPoolDeployment = await deployments.get('Pool')
      const dynamicPoolDeployment = await deployments.get('DynamicPool_01')
      const sidePoolDeployment = await deployments.get('SidePool_01')

      /**
       * APPROVE POOL TOKENS
       **/

      // const approveSpendingTxn1 = await router
      //   .connect(owner)
      //   .approveSpendingByPool(usdTokens, mainPoolDeployment.address)
      // await approveSpendingTxn1.wait()

      // const approveSpendingTxn2 = await router
      //   .connect(owner)
      //   .approveSpendingByPool(bnbTokens, dynamicPoolDeployment.address)
      // await approveSpendingTxn2.wait()

      // const approveSpendingTxn3 = await router
      //   .connect(owner)
      //   .approveSpendingByPool(sidepoolTokens, sidePoolDeployment.address)
      // await approveSpendingTxn3.wait()

      /**
       * APPROVE POOL ASSETS
       **/

      // const approveSpendingTxn5 = await router
      //   .connect(owner)
      //   .approveSpendingByPool(bnbAssetsAddress, dynamicPoolDeployment.address)
      // await approveSpendingTxn5.wait()
    }

    console.log(`Deployment complete.`)
    logVerifyCommand(hre.network.name, deployResult)
  }

  return deployResult
}
export default deployFunc
deployFunc.tags = [contractName]
