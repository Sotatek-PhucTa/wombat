import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { DeployFunction, DeploymentsExtension } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { BRIBE_MAPS } from '../tokens.config'
import { confirmTxn, getAddress, getDeadlineFromNow, getDeployedContract, isOwner, logVerifyCommand } from '../utils'
import { Network } from '../types'
import { getTokenAddress } from '../types/token'
import { assert } from 'chai'
import { parseEther } from 'ethers/lib/utils'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigner = await ethers.getSigner(deployer)

  deployments.log(`Step 131. Deploying on: ${hre.network.name}...`)

  // Deploy all Bribe
  const voter = await getDeployedContract('Voter')
  for await (const [token, bribeConfig] of Object.entries(BRIBE_MAPS[hre.network.name as Network] || {})) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const startTimestamp = bribeConfig?.startTimestamp || getDeadlineFromNow(bribeConfig.secondsToStart!)
    const name = `Bribe_${token}`
    const lpTokenAddress = await getAddress(bribeConfig.lpToken)
    const rewardTokens =
      bribeConfig.rewardToken != ethers.constants.AddressZero
        ? [bribeConfig.rewardToken]
        : await Promise.all(bribeConfig.rewardTokens.map((t) => getTokenAddress(t)))
    assert(rewardTokens.length > 0, `Empty rewardTokens for bribe at ${token}`)
    const deployResult = await deploy(name, {
      from: deployer,
      contract: 'Bribe',
      log: true,
      skipIfAlreadyDeployed: true,
      args: [voter.address, lpTokenAddress, startTimestamp, rewardTokens[0], bribeConfig.tokenPerSec],
    })

    // Add new Bribe to Voter. Skip if not owner.
    if (deployResult.newlyDeployed) {
      if (rewardTokens.length > 1) {
        deployments.log(`${name} adding all rewardTokens`)
        const bribe = await getDeployedContract('Bribe', name)
        for (const address of rewardTokens) {
          await confirmTxn(bribe.connect(deployerSigner).addRewardToken(address, bribeConfig.tokenPerSec))
        }
      }

      deployments.log(`${name} Deployment complete.`)
      if (await isOwner(voter, deployerSigner.address)) {
        const masterWombat = await deployments.get('MasterWombatV3')
        await addBribe(voter, deployerSigner, masterWombat.address, lpTokenAddress, deployResult.address, deployments)
        deployments.log(`addBribe for ${lpTokenAddress} complete.`)
      } else {
        deployments.log(
          `User ${deployerSigner.address} does not own Voter. Please call add/setBribe in multi-sig. Bribe: ${deployResult.address}. LP: ${bribeConfig.lpToken}.`
        )
      }

      const bribe = await getDeployedContract('Bribe', name)
      deployments.log(`Transferring operator of ${deployResult.address} to ${deployer}...`)
      // The operator of the rewarder contract can set and update reward rates
      await confirmTxn(bribe.connect(deployerSigner).setOperator(deployer))
      deployments.log(`Transferring ownership of ${deployResult.address} to ${multisig}...`)
      // The owner of the rewarder contract can add new reward tokens and withdraw them
      await confirmTxn(bribe.connect(deployerSigner).transferOwnership(multisig))
      deployments.log('Bribe transferred to multisig')
    }

    logVerifyCommand(hre.network.name, deployResult)
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
  deployments.log('addBribe', bribe)
  try {
    await confirmTxn(voter.connect(owner).add(masterWombat, lpToken, bribe))
  } catch (err: any) {
    if (err.error.stack.includes('voter: already added')) {
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
