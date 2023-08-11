import { ethers } from "hardhat"
import { DeployFunction, DeploymentsExtension } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { getCurrentNetwork } from "../types/network"

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	const { deployments, getNamedAccounts } = hre
	const { deployer, multisig } = await getNamedAccounts()
	const deployerSigner = await ethers.getSigner(deployer)

	deployments.log(`Step 195. Deploying on: ${getCurrentNetwork()}...`)

	const rewarderImpl = await deployments.deploy('BoostedMultiRewarder_Implementation', {
		from: deployer,
		contract: 'BoostedMultiRewarder',
		log: true,
		skipIfAlreadyDeployed: true,
	})

	const bribeImpl = await deployments.deploy('BribeV2_Implementation', {
		from: deployer,
		contract: 'BribeV2',
		log: true,
		skipIfAlreadyDeployed: true,
	})

	// Transfer ownership to multisig?
	const rewarderBeacon = await deployments.deploy('BoostedMultiRewarder_Beacon', {
		from: deployer,
		contract: 'UpgradeableBeacon',
		log: true,
		skipIfAlreadyDeployed: true,
		args: [rewarderImpl.address]
	})
	
	// Transfer ownership to multisig?
	const bribeBeacon = await deployments.deploy('BribeV2_Beacon', {
		from: deployer,
		contract: 'UpgradeableBeacon',
		log: true,
		skipIfAlreadyDeployed: true,
		args: [bribeImpl.address]
	})

	if (!rewarderBeacon.newlyDeployed) {
		if (rewarderImpl.newlyDeployed) {
			//TODO: Update impl addr by signer or need to generate multisig request
			const beacon = await ethers.getContractAt('UpgradeableBeacon', rewarderBeacon.address)
			await beacon.connect(deployerSigner).upgradeTo(rewarderImpl.address)
		}
	}

	if (!bribeBeacon.newlyDeployed) {
		if (bribeImpl.newlyDeployed) {
			//TODO: Update impl addr by signer or need to generate multisig request
			const beacon = await ethers.getContractAt('UpgradeableBeacon', bribeBeacon.address)
			await beacon.connect(deployerSigner).upgradeTo(bribeImpl.address)
		}
	}

	
}

export default deployFunc
deployFunc.tags = ['BribeRewarderBeacon']