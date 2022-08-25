import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { WRAPPED_NATIVE_TOKENS_MAP, USD_TOKENS_MAP, BNB_DYNAMICPOOL_TOKENS_MAP } from '../tokens.config'

const contractName = 'Router'

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
      // Approve pool spending tokens from router
      const router = await ethers.getContractAt(contractName, deployResult.address)
      const usdTokens = []
      for (const index in USD_TOKENS_MAP) {
        usdTokens.push(USD_TOKENS_MAP[index][2]) // token address
      }

      const bnbTokens = []
      for (const index in BNB_DYNAMICPOOL_TOKENS_MAP) {
        bnbTokens.push(BNB_DYNAMICPOOL_TOKENS_MAP[index][2])
      }

      const mainPoolDeployment = await deployments.get('Pool')
      const dynamicPoolDeployment = await deployments.get('DynamicPool_01')

      await router.connect(owner).approveSpendingByPool(usdTokens, mainPoolDeployment.address)
      await router.connect(owner).approveSpendingByPool(bnbTokens, dynamicPoolDeployment.address)
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
