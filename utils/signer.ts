import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers, getNamedAccounts } from 'hardhat'
import { getDeployerSignerZksync, isZkSync } from './zksync'

export async function getDeployerSigner() {
  if (isZkSync()) {
    return getDeployerSignerZksync()
  }
  const { deployer } = await getNamedAccounts()
  return await SignerWithAddress.create(ethers.provider.getSigner(deployer))
}
