// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { deployments, getNamedAccounts } from 'hardhat'
import { getCurrentNetwork } from '../types/network'
import { Network } from '../types'

const deployFunc = async function () {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  /// Deploy mock relayer and bridge for dev
  await deploy('MockWormhole', { from: deployer, log: true, skipIfAlreadyDeployed: false })
  await deploy('MockRelayer', { from: deployer, log: true, skipIfAlreadyDeployed: false })
}

export default deployFunc
deployFunc.tags = ['MockWormhole']
deployFunc.skip = async () => {
  return ![Network.HARDHAT, Network.LOCALHOST].includes(getCurrentNetwork())
}
