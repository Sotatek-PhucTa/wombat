import { parseEther } from '@ethersproject/units'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Token, getTokenDeploymentOrAddress } from '../config/token'

interface IWombatToken {
  [token: string]: unknown[]
}

export const WOMBAT_TOKENS_ARGS: IWombatToken = {
  WOM: ['Wombat Token', 'WOM', '18', '1000000000'], // 1b tokens minted to msg.sender initially
}

const contractName = 'WombatToken'
const tags = ['FirstClass']

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  deployments.log(`Step 002. Deploying on : ${hre.network.name}...`)

  /// Deploy pool
  const womDeployResult = await deploy(contractName, {
    from: deployer,
    contract: 'WombatERC20',
    log: true,
    args: [hre.network.name == 'bsc_mainnet' ? multisig : deployer, parseEther(WOMBAT_TOKENS_ARGS['WOM'][3] as string)], // 1b tokens minted to gnosis safe or msg.sender initially
    skipIfAlreadyDeployed: true,
    deterministicDeployment: false, // will adopt bridging protocols/ wrapped addresses instead of CREATE2
  })

  if (womDeployResult.newlyDeployed) {
    if (
      hre.network.name == 'localhost' ||
      hre.network.name == 'hardhat' ||
      hre.network.name == 'bsc_testnet' ||
      hre.network.name == 'bsc_mainnet'
    ) {
      // Get freshly deployed WOM contract
      const womToken = await ethers.getContractAt('WombatERC20', womDeployResult.address)

      // Check dev account
      const name = await womToken.name()
      const symbol = await womToken.symbol()
      const decimals = await womToken.decimals()
      const totalSupply = await womToken.totalSupply()
      const deployerBalance = await womToken.balanceOf(deployer)
      deployments.log(`Token details are ${name}, ${symbol}, ${decimals}, ${totalSupply}, ${deployerBalance}`)
      deployments.log(`Deployment complete.`)
    }
  }

  return womDeployResult
}
export default deployFunc
deployFunc.tags = [contractName, ...tags]
deployFunc.skip = async () => {
  // skip if we are not going to resolve from deployment
  const deploymentOrAddress = getTokenDeploymentOrAddress(Token.WOM)
  return deploymentOrAddress.type !== 'deployment'
}
