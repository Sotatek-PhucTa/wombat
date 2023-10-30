// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { deployments, getNamedAccounts } from 'hardhat'
import { getCurrentNetwork } from '../types/network'
import { Network } from '../types'

const deployFunc = async function () {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  /// Deploy mock LZEndpoint for dev
  await deploy('LZEndpointMock', { from: deployer, log: true, skipIfAlreadyDeployed: false, args: [0] })
}

export default deployFunc
deployFunc.tags = ['MockLayerZero']
deployFunc.skip = async () => {
  return ![Network.HARDHAT, Network.LOCALHOST].includes(getCurrentNetwork())
}
