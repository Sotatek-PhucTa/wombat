import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { confirmTxn, getDeployedContract, logVerifyCommand } from '../utils'
import { getCurrentNetwork } from '../types/network'

const contractName = 'VeWomSetup'
const tags = ['FirstClass']

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const owner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 190. Deploying on : ${getCurrentNetwork()} with account : ${deployer}`)

  /// SetVoter
  const vewom = await getDeployedContract('VeWom')
  const oldVoter = await vewom.voter()
  const voter = await deployments.getOrNull('Voter')
  if (voter == undefined) {
    deployments.log('Voter is not deployed yet. Pause the VeWom')
    await confirmTxn(vewom.connect(owner).pause())
  } else if (oldVoter != voter.address) {
    deployments.log('Setting voter contract for VeWom')
    await confirmTxn(vewom.connect(owner).setVoter(voter.address))
  }

  /// Deploy whitelist
  const deployResult = await deploy('Whitelist', {
    from: deployer,
    contract: 'Whitelist',
    log: true,
    args: [],
    skipIfAlreadyDeployed: true,
    deterministicDeployment: false,
  })

  if (deployResult.newlyDeployed) {
    deployments.log(`Whitelist deployed to ${deployResult.address}`)
    deployments.log('Setting whitelist contract for VeWom')
    await confirmTxn(vewom.connect(owner).setWhitelist(deployResult.address))
    logVerifyCommand(deployResult)
    return deployResult
  } else {
    deployments.log(`${contractName} Contract already deployed.`)
    return deployResult
  }
}

export default deployFunc
deployFunc.tags = [contractName, ...tags]
deployFunc.dependencies = ['VeWom']
