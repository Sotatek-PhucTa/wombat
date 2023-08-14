import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Network } from '../types'
import { confirmTxn, getDeployedContract } from '../utils'
import { getCurrentNetwork } from '../types/network'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const network: Network = getCurrentNetwork()
  const { deployer } = await getNamedAccounts()
  const owner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 195. Deploying on: ${network}...`)

  const masterWombat = await getDeployedContract('BoostedMasterWombat')
  const vewom = await deployments.getOrNull('VeWom')
  const voter = await deployments.getOrNull('Voter')
  const bribeRewarderFactory = await deployments.getOrNull('BribeRewarderFactory')
  if (vewom != undefined && vewom != (await masterWombat.veWom())) {
    deployments.log(`set vewom to ${vewom.address}`)
    await confirmTxn(masterWombat.connect(owner).setVeWom(vewom.address))
  }
  if (voter != undefined && voter != (await masterWombat.voter())) {
    deployments.log(`set voter to ${voter.address}`)
    await confirmTxn(masterWombat.connect(owner).setVoter(voter.address))
  }
  if (bribeRewarderFactory != undefined && bribeRewarderFactory != (await masterWombat.bribeRewarderFactory())) {
    deployments.log(`set bribeRewarderFactory to ${bribeRewarderFactory.address}`)
    await confirmTxn(masterWombat.connect(owner).setBribeRewarderFactory(bribeRewarderFactory.address))
  }
}

export default deployFunc
deployFunc.dependencies = ['BoostedMasterWombat']
deployFunc.tags = ['BoostedMasterWombatSetup']
