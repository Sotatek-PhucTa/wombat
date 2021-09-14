import { deployments, ethers } from 'hardhat'

async function runTest() {
  const [owner] = await ethers.getSigners()

  // Get deployed Chainlink Proxy Price Provider
  const ChainlinkProxyPriceProviderDeployment = await deployments.get('ChainlinkProxyPriceProvider')

  // Get Chainlink Proxy Price Provider Contract
  const ChainlinkProxyPriceProvider = await ethers.getContractAt(
    'ChainlinkProxyPriceProvider',
    ChainlinkProxyPriceProviderDeployment.address,
    owner
  )

  // Let's test out DAI and Any ETH prices for instance
  const daiDeployment = await deployments.get('DAI.e')
  const anyETHDeployment = await deployments.get('AnyETH')
  const renBTCDeployment = await deployments.get('renBTC')

  const daiAddress = daiDeployment.address
  const anyETHAddress = anyETHDeployment.address
  const renBTCAddress = renBTCDeployment.address

  // Get prices from Chainlink Oracle
  const resultUSD = await ChainlinkProxyPriceProvider.getAssetPrice(daiAddress)
  const resultETH = await ChainlinkProxyPriceProvider.getAssetPrice(anyETHAddress)
  const resultBTC = await ChainlinkProxyPriceProvider.getAssetPrice(renBTCAddress)

  console.log(`Current DAI price : ${ethers.utils.formatUnits(resultUSD.toString(), 8)}`)
  console.log(`Current AnyETH price : ${ethers.utils.formatUnits(resultETH.toString(), 8)}`)
  console.log(`Current renBTC price : ${ethers.utils.formatUnits(resultBTC.toString(), 8)}`)
}

runTest()
