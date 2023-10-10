import { Deployer } from '@matterlabs/hardhat-zksync-deploy'
import { getImplementationAddress } from '@openzeppelin/upgrades-core'
import * as hre from 'hardhat'
import { deployments } from 'hardhat'
import { DeployResult } from 'hardhat-deploy/types'
import { Wallet } from 'zksync-web3'
import secrets from '../secrets.json'
import { Network } from '../types'

export function isZkSync(): boolean {
  return !!hre.network.zksync
}

export function getDeployerZksync(): Deployer {
  if (hre.network.name == Network.LOCALHOST) {
    return new Deployer(hre, new Wallet(secrets.zksync.privateKey))
  }
  return new Deployer(hre, Wallet.fromMnemonic(secrets.deployer.mnemonic))
}

export function getDeployerSignerZksync(): Wallet {
  const deployer = getDeployerZksync()
  return deployer.zkWallet
}

export async function deployProxyZksync(
  deploymentName: string,
  implementationName: string,
  contractName: string,
  args: any[]
): Promise<DeployResult> {
  const deployment = await deployments.getOrNull(deploymentName)
  if (deployment != null) {
    return {
      newlyDeployed: false,
      ...deployment,
    }
  } else {
    const deployer = getDeployerZksync()
    const contract = await deployer.loadArtifact(contractName)
    const proxy = await hre.zkUpgrades.deployProxy(deployer.zkWallet, contract, args, { initializer: 'initialize' })
    const proxyAdmin = await hre.zkUpgrades.admin.getInstance(deployer.zkWallet)
    const implementationAddr = await getImplementationAddress(deployer.zkWallet.provider, proxy.address)

    const proxyArtifact = await deployer.loadArtifact('TransparentUpgradeableProxy')
    const proxyAdminArtifact = await deployer.loadArtifact('ProxyAdmin')

    // save proxy admin
    await deployments.save('DefaultProxyAdmin', {
      abi: proxyAdminArtifact.abi,
      address: proxyAdmin.address,
    })

    // save proxy
    await proxy.deployed()
    await deployments.save(deploymentName, {
      abi: {
        ...contract.abi,
        ...proxyArtifact.abi,
      },
      address: proxy.address,
    })
    await deployments.save(`${deploymentName}_Proxy`, {
      abi: proxyArtifact.abi,
      address: proxy.address,
    })

    // save implementation
    await deployments.save(`${implementationName}`, {
      abi: contract.abi,
      address: implementationAddr,
    })
    return {
      newlyDeployed: true,
      abi: contract.abi,
      address: proxy.address,
      implementation: implementationAddr,
    }
  }
}
