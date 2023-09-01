import { ethers, upgrades } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getCurrentNetwork } from '../types/network'
import { confirmTxn, getAddress, getDeployedContract, isOwner, logVerifyCommand } from '../utils'
import { Deployment } from '../types'
import { getProxyAdminOwner } from '../utils/deploy'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const contractName = 'BribeRewarderFactory'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 196. Deploying on: ${getCurrentNetwork()}...`)

  const voterDeployment = await deployments.getOrNull('Voter')
  const mwAddr = await getAddress(Deployment('BoostedMasterWombat'))

  const rewarderBeaconAddr = await getAddress(Deployment('BoostedMultiRewarder_Beacon'))
  const bribeBeaconAddr = await getAddress(Deployment('BribeV2_Beacon'))

  const deployResult = await deployments.deploy(contractName, {
    from: deployer,
    log: true,
    contract: contractName,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: await getProxyAdminOwner(), // change to Gnosis Safe after all admin scripts are done
      proxyContract: 'OptimizedTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [
            rewarderBeaconAddr,
            bribeBeaconAddr,
            mwAddr,
            voterDeployment ? voterDeployment.address : ethers.constants.AddressZero,
          ],
        },
      },
    },
  })

  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  deployments.log('Contract address:', deployResult.address)
  deployments.log('Implementation address:', implAddr)

  if (voterDeployment != undefined) {
    const bribeRewarderFactory = await getDeployedContract('BribeRewarderFactory')
    if ((await bribeRewarderFactory.voter()) != voterDeployment.address) {
      if (await isOwner(bribeRewarderFactory, deployer)) {
        deployments.log(`Setting Voter on BribeRewarderFactory to ${voterDeployment.address}...`)
        await confirmTxn(bribeRewarderFactory.connect(deployerSigner).setVoter(voterDeployment.address))
      } else {
        deployments.log(
          `Deployer is not owner of bribeRewarderFactory. Please propose multisig to setVoter at ${deployResult.address}`
        )
      }
    }
  } else {
    deployments.log(`Please setBribeFactory after deploy Voter and setVoter at ${deployResult.address}`)
  }

  if (deployResult.newlyDeployed) {
    deployments.log(`BribeRewarderFactory Deployment complete.`)
  }
  logVerifyCommand(deployResult)
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['BoostedMasterWombat', 'BribeRewarderBeacon']
