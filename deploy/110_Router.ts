import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { WRAPPED_NATIVE_TOKENS_MAP, USD_TOKENS_MAP, BNB_DYNAMICPOOL_TOKENS_MAP } from '../tokens.config'

const contractName = 'WombatRouter'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 110. Deploying on : ${hre.network.name}...`)

  /// Deploy pool
  const deployResult = await deploy(contractName, {
    from: deployer,
    contract: 'WombatRouter',
    log: true,
    args: [WRAPPED_NATIVE_TOKENS_MAP[hre.network.name]],
    skipIfAlreadyDeployed: true,
    deterministicDeployment: false, // will adopt bridging protocols/ wrapped addresses instead of CREATE2
  })

  const address = deployResult.address

  if (deployResult.newlyDeployed) {
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

      const mainPoolDeployment = await deployments.get('Pool')
      const dynamicPoolDeployment = await deployments.get('DynamicPool_01')

      // Approve pool spending tokens from router
      const approveSpendingTxn1 = await router
        .connect(owner)
        .approveSpendingByPool(usdTokens, mainPoolDeployment.address)
      await approveSpendingTxn1.wait()
      const approveSpendingTxn2 = await router
        .connect(owner)
        .approveSpendingByPool(bnbTokens, dynamicPoolDeployment.address)
      await approveSpendingTxn2.wait()

      // Approve pool assets from router
      const approveSpendingTxn3 = await router
        .connect(owner)
        .approveSpendingByPool(usdAssetsAddress, mainPoolDeployment.address)
      await approveSpendingTxn3.wait()

      const approveSpendingTxn4 = await router
        .connect(owner)
        .approveSpendingByPool(bnbAssetsAddress, dynamicPoolDeployment.address)
      await approveSpendingTxn4.wait()
    }

    console.log(`Deployment complete.`)
    console.log(
      `To verify, run: hh verify --network ${hre.network.name} ${address} '${
        WRAPPED_NATIVE_TOKENS_MAP[hre.network.name]
      }'`
    )
  }

  return deployResult
}
export default deployFunc
deployFunc.tags = [contractName]
