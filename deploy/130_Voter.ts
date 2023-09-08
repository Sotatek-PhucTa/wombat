import { deployments } from 'hardhat'
import { BigNumberish } from 'ethers'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { logVerifyCommand } from '../utils'
import { parseEther } from 'ethers/lib/utils'
import { Token, getTokenAddress } from '../config/token'
import { getCurrentNetwork } from '../types/network'
import { Network, PartialRecord } from '../types'
import { convertTokenPerMonthToTokenPerSec } from '../config/emission'
import assert from 'assert'
import { Epochs } from '../config/epoch'
import { time } from '@nomicfoundation/hardhat-network-helpers'

const VOTER_ARGS: PartialRecord<Network, VoterArg> = {
  [Network.HARDHAT]: {
    ...defaultVoterArg(),
    womPerSec: convertTokenPerMonthToTokenPerSec(parseEther('1800000')),
    secondsToStart: 300,
  },
  [Network.ETHEREUM_MAINNET]: {
    ...defaultVoterArg(),
    womPerSec: 0,
    baseAllocation: 1000,
    firstEpoch: Epochs.Sep20,
  },
}

interface VoterArg {
  womPerSec: BigNumberish
  // Total emission = 1000 point.
  // For example, 750 means 75% base emission and 25% vote emission.
  baseAllocation: number
  firstEpoch?: Epochs
  secondsToStart?: number
}

function defaultVoterArg(): VoterArg {
  return {
    womPerSec: 0,
    baseAllocation: 750,
  }
}

async function toDeployArg(arg: VoterArg): Promise<any[]> {
  const wombatToken = await getTokenAddress(Token.WOM)
  const vewom = await deployments.get('VeWom')
  const [latest, epochStart] = await getStartTime(arg)
  return [wombatToken, vewom.address, arg.womPerSec, latest, epochStart, arg.baseAllocation]
}

async function getStartTime(arg: VoterArg): Promise<[BigNumberish, BigNumberish]> {
  if (arg.firstEpoch) {
    return [arg.firstEpoch, arg.firstEpoch]
  } else if (arg.secondsToStart) {
    const latest = await time.latest()
    return [latest, latest + arg.secondsToStart]
  } else {
    throw new Error('Voter arg does not have firstEpoch or secondsToStart')
  }
}

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const network = getCurrentNetwork()
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  deployments.log(`Step 130. Deploying on: ${getCurrentNetwork()}...`)

  // Deploy Voter
  const voterArg = VOTER_ARGS[network]
  assert(voterArg != undefined, 'VoterArg is undefined')
  const deployResult = await deploy('Voter', {
    from: deployer,
    contract: 'Voter',
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: multisig,
      proxyContract: 'OptimizedTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: await toDeployArg(voterArg),
        },
      },
    },
  })

  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  deployments.log('Contract address:', deployResult.address)
  deployments.log('Implementation address:', implAddr)

  if (deployResult.newlyDeployed) {
    deployments.log(`Voter Deployment complete.`)
  }

  logVerifyCommand(deployResult)
}

export default deployFunc
deployFunc.dependencies = ['WombatToken', 'VeWom']
deployFunc.tags = ['Voter']
