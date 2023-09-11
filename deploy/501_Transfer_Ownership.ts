import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { confirmTxn } from '../utils'
import { getCurrentNetwork } from '../types/network'
import assert from 'assert'

const deploymentNames = ['BribeRewarderFactory_Proxy']

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const network = getCurrentNetwork()
  const { deployments, getNamedAccounts } = hre
  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 501. Transfer ownerships on : ${network} with account : ${deployer}`)

  for (const deploymentName of deploymentNames) {
    // Get deployed contract
    const { address } = await deployments.get(deploymentName)
    const ownable = await ethers.getContractAt('Ownable', address)
    const currentOwner = await ownable.owner()
    assert(deployer == currentOwner, `Expected deployer to be owner, but found ${currentOwner}`)

    // transfer contract ownership to multi-sig
    deployments.log(`Transferring ownership of ${deploymentName} (at ${address}) to multisig (at ${multisig})...`)
    await confirmTxn(ownable.connect(deployerSigner).transferOwnership(multisig))
    deployments.log(`Transferred ownership of ${address} to ${multisig} from ${currentOwner}`)
  }
}

export default deployFunc
deployFunc.tags = ['TransferOwnership']
