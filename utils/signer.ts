import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers, getNamedAccounts } from 'hardhat'
import { getDeployerSignerZksync, isZkSync } from './zksync'
import { isForkedNetwork } from '.'

export async function getDeployerSigner() {
  if (isZkSync()) {
    return getDeployerSignerZksync()
  }
  const { deployer } = await getNamedAccounts()
  return await SignerWithAddress.create(ethers.provider.getSigner(deployer))
}

export async function getSignersFromCurrentNetwork() {
  if (isForkedNetwork()) {
    const { multisig: multisigAddr } = await getNamedAccounts()
    const multisig = await SignerWithAddress.create(ethers.provider.getSigner(multisigAddr))
    return [multisig, ...(await ethers.getSigners())]
  }
  return await ethers.getSigners()
}
