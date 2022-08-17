import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { WRAPPED_NATIVE_TOKENS_MAP } from '../tokens.config'

const contractName = 'Router'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

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
      // TODO: we can programatically approve tokens to pools
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
