import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { DeployFunction, DeploymentsExtension } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getBribes } from '../config/emissions.config'
import { confirmTxn, getAddress, getDeployedContract, getLatestMasterWombat, isOwner, logVerifyCommand } from '../utils'
import { deployRewarderOrBribe, getBribeDeploymentName } from '../utils/deploy'
import { getCurrentNetwork } from '../types/network'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const deployerSigner = await ethers.getSigner(deployer)

  deployments.log(`Step 194. Deploying on: ${getCurrentNetwork()}...`)
  const voter = await getDeployedContract('Voter')
  for await (const [lpToken, bribeConfig] of Object.entries(await getBribes())) {
    const deployResult = await deployRewarderOrBribe(
      'Bribe',
      getBribeDeploymentName,
      lpToken,
      voter.address,
      bribeConfig
    )

    // Add new Bribe to Voter. Skip if not owner.
    if (deployResult.newlyDeployed) {
      if (await isOwner(voter, deployerSigner.address)) {
        const masterWombat = await getLatestMasterWombat()
        const lpTokenAddress = await getAddress(bribeConfig.lpToken)
        await addBribe(voter, deployerSigner, masterWombat.address, lpTokenAddress, deployResult.address, deployments)
        deployments.log(`addBribe for ${lpTokenAddress} complete.`)
      } else {
        deployments.log(
          `User ${deployerSigner.address} does not own Voter. Please call add/setBribe in multi-sig. Bribe: ${
            deployResult.address
          }. LP: ${JSON.stringify(bribeConfig.lpToken)}.`
        )
      }
    }

    logVerifyCommand(deployResult)
  }
}

// Add a bribe to an LP or set if it already exists.
async function addBribe(
  voter: Contract,
  owner: SignerWithAddress,
  masterWombat: string,
  lpToken: string,
  bribe: string,
  deployments: DeploymentsExtension
) {
  deployments.log('addBribe', bribe, lpToken)
  try {
    await confirmTxn(voter.connect(owner).add(masterWombat, lpToken, bribe))
  } catch (err: any) {
    if (err.message.includes('voter: already added')) {
      deployments.log(`Set bribe ${bribe} since it is already added`)
      await confirmTxn(voter.connect(owner).setBribe(lpToken, bribe))
    } else {
      deployments.log('Failed to add bribe', bribe, 'due to', err)
      throw err
    }
  }
}

export default deployFunc
// do not depend on MWv3 and Voter which are owned by multisig in mainnet
deployFunc.dependencies = []
deployFunc.tags = ['Bribe']
