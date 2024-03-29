import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { confirmTxn, getLatestMasterWombat, isOwner, logVerifyCommand } from '../utils'
import { Token, getTokenAddress } from '../config/token'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getCurrentNetwork } from '../types/network'
import { getProxyAdminOwner } from '../utils/deploy'

const contractName = 'VeWom'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const network = getCurrentNetwork()
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer)) // first account used for testnet and mainnet

  deployments.log(`Step 102. Deploying on : ${network} with account : ${deployer}`)

  const wombatToken = await getTokenAddress(Token.WOM)
  const masterWombat = await getLatestMasterWombat()
  // deterministicDeployment is used only for implementation but not the proxy contract
  // it is not useful in this case
  const deployResult = await deploy(`${contractName}`, {
    from: deployer,
    contract: 'VeWom',
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: await getProxyAdminOwner(),
      proxyContract: 'OptimizedTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [wombatToken, masterWombat.address],
        },
      },
    },
  })
  // Get freshly deployed Pool contract
  const contract = await ethers.getContractAt(contractName, deployResult.address)
  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  deployments.log('Contract address:', deployResult.address)
  deployments.log('Implementation address:', implAddr)
  logVerifyCommand(deployResult)

  if (deployResult.newlyDeployed) {
    if (await isOwner(masterWombat, deployerSigner.address)) {
      deployments.log('Setting veWOM contract for MasterWombatV3...')
      await confirmTxn(masterWombat.connect(deployerSigner).setVeWom(deployResult.address))
    } else {
      deployments.log(
        `User ${deployerSigner.address} does not own MasterWombat. Please call setVeWom in multi-sig. VeWom: ${deployResult.address}`
      )
    }

    // Check setup config values
    const womTokenAddress = await contract.wom()
    const masterWombatAddress = await contract.masterWombat()
    const veWomAddress = await masterWombat.veWom()
    deployments.log(`WomTokenAddress is : ${womTokenAddress}`)
    deployments.log(`MasterWombatV3Address is : ${masterWombatAddress}`)
    deployments.log(`VeWomAddress is : ${veWomAddress}`)
    return deployResult
  } else {
    deployments.log(`${contractName} Contract already deployed.`)
    return deployResult
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['WombatToken']
