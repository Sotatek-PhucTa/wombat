import { ethers, upgrades } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { getCurrentNetwork } from "../types/network"
import { getAddress, logVerifyCommand } from "../utils"
import { Deployment } from "../types"

const contractName = 'BribeRewarderFactory'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	const { deployments, getNamedAccounts } = hre
	const { deployer, multisig } = await getNamedAccounts()
	const deployerSigner = await ethers.getSigner(deployer)

	deployments.log(`Step 195. Deploying on: ${getCurrentNetwork()}...`)

	const voterAddr = await getAddress(Deployment('Voter'))
	const mwAddr = await getAddress(Deployment('BoostedMasterWombat'))

	const rewarderBeaconAddr = await getAddress(Deployment('BoostedMultiRewarder_Beacon'))
	const bribeBeaconAddr = await getAddress(Deployment('BribeV2_Beacon'))

	const deployResult = await deployments.deploy(contractName, {
		from: deployer,
		log: true,
		contract: contractName,
		skipIfAlreadyDeployed: true,
		proxy: {
			owner: multisig, // change to Gnosis Safe after all admin scripts are done
			proxyContract: 'OptimizedTransparentProxy',
			viaAdminContract: 'DefaultProxyAdmin',
			execute: {
				init: {
					methodName: 'initialize',
					args: [rewarderBeaconAddr, bribeBeaconAddr, mwAddr, voterAddr],
				},
			},
		},
	})

	const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  deployments.log('Contract address:', deployResult.address)
  deployments.log('Implementation address:', implAddr)

  if (deployResult.newlyDeployed) {
    deployments.log(`BribeRewarderFactory Deployment complete.`)
  }

	logVerifyCommand(deployResult)
}


export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['Voter', 'BoostedMasterWombat', 'BribeRewarderBeacon']