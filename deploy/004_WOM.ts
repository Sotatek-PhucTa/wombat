import { parseEther } from '@ethersproject/units'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

interface IWombatToken {
  [token: string]: unknown[]
}

export const WOMBAT_TOKENS_ARGS: IWombatToken = {
  WOM: ['Wombat Token', 'WOM', '18', '1000000000'], // 1b tokens minted to msg.sender initially
}

const contractName = 'WombatToken'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  console.log(`Step 004. Deploying on : ${hre.network.name} with account : ${deployer}`)

  /// Deploy pool
  const womDeployResult = await deploy(contractName, {
    from: deployer,
    contract: 'WombatERC20',
    log: true,
    args: [parseEther(WOMBAT_TOKENS_ARGS['WOM'][3] as string)], // 1b tokens minted to msg.sender initially
    skipIfAlreadyDeployed: true,
    deterministicDeployment: true, // use CREATE2 for deterministic address
  })

  // Mock WOM token only on localhost and bsc testnet
  if (womDeployResult.newlyDeployed) {
    if (hre.network.name == 'localhost' || hre.network.name == 'hardhat' || hre.network.name == 'bsc_testnet') {
      // Get freshly deployed WOM contract
      const womToken = await ethers.getContractAt('WombatERC20', womDeployResult.address)

      // Check dev account
      const name = await womToken.name()
      const symbol = await womToken.symbol()
      const decimals = await womToken.decimals()
      const totalSupply = await womToken.totalSupply()
      const deployerBalance = await womToken.balanceOf(deployer)
      console.log(`Token details are ${name}, ${symbol}, ${decimals}, ${totalSupply}, ${deployerBalance}`)
      console.log(`Deployer account is: ${deployer}`)
    }
  }

  return womDeployResult
}
export default deployFunc
deployFunc.tags = [contractName]
