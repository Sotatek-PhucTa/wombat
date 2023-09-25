import { ethers, getNamedAccounts } from 'hardhat'
import { VeWom } from '../build/typechain'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import assert from 'assert'
import { getDeployedContract } from '../utils'

async function pauseVeWom(signer: SignerWithAddress) {
  const vewom = (await getDeployedContract('VeWom')) as VeWom
  assert(!(await vewom.paused()), 'VeWom is paused already')
  await vewom.connect(signer).pause()

  assert(await vewom.paused(), 'VeWom must be paused')
}

async function run() {
  const { deployer } = await getNamedAccounts()
  const signer = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  await pauseVeWom(signer)
  console.log('Successful')
}

run()
