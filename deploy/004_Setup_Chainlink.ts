import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { parseEther } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { BTC_TOKENS_ARGS, ETH_TOKENS_ARGS, USD_TOKENS_ARGS } from './002_Mock_Tokens'

const FEEDS = {
  chainlink_bsc: {
    bscusd: '0x5498BB86BC934c8D34FDA08E81D444153d0D06aD',
    btcusd: '0x31CF013A08c6Ac228C94551d535d5BAfE19c602a',
    ethusd: '0x86d67c3D38D2bCeE722E601025C25a575021c6EA',
    linkusd: '0x34C4c526902d88a3Aa98DB8a9b802603EB1E3470',
    usdtusd: '0x7898AcCC83587C3C55116c5230C17a6Cd9C71bad',
  },
  chainlink_mainnet: {
    aaveusd: '0x3CA13391E9fb38a75330fb28f8cc2eB3D9ceceED',
    bscusd: '0x0A77230d17318075983913bC2145DB16C7366156',
    btcusd: '0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743',
    chfusd: '0x3B37950485b450edF90cBB85d0cD27308Af4AB9A',
    daiusd: '0x51D7180edA2260cc4F6e4EebB82FEF5c3c2B8300',
    ethusd: '0x976B3D034E162d8bD72D6b9C989d545b839003b0',
    fraxusd: '0xbBa56eF1565354217a3353a466edB82E8F25b08e',
    linkusd: '0x49ccd9ca821EfEab2b98c60dC60F518E765EDe9a',
    usdcusd: '0xF096872672F44d6EBA71458D74fe67F9a77a23B9',
    usdtusd: '0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a',
  },
}

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  // Get Signers
  const [owner] = await ethers.getSigners()

  // Get last block timestamp
  const lastBlockTime = (await ethers.provider.getBlock('latest')).timestamp

  // Get deployed Chainlink Proxy Price Provider
  const ChainlinkProxyPriceProviderDeployment = await deployments.get('ChainlinkProxyPriceProvider')

  // Get Chainlink Proxy Price Provider Contract
  const ChainlinkProxyPriceProvider = await ethers.getContractAt(
    'ChainlinkProxyPriceProvider',
    ChainlinkProxyPriceProviderDeployment.address,
    owner
  )

  /// LOCALHOST ///
  // Only use mock chainlink on localhost only
  if (hre.network.name == 'localhost' || hre.network.name == 'hardhat') {
    ///  USD  ///
    const usdTestChainlinkAggregatorDeployResult = await deploy('USDTestChainlinkAggregator', {
      from: deployer,
      log: true,
      skipIfAlreadyDeployed: false,
      contract: 'TestChainlinkAggregator',
    })

    const USDTestChainlinkAggregator = await ethers.getContractAt(
      'TestChainlinkAggregator',
      usdTestChainlinkAggregatorDeployResult.address
    )

    // Set mock price feed
    await USDTestChainlinkAggregator.connect(owner).setLatestAnswer(parseEther('1'), lastBlockTime)

    // Get deployed token addresses and setup mock asset sources
    for (const index in USD_TOKENS_ARGS) {
      // Get deployed token instance
      const tokenSymbol = USD_TOKENS_ARGS[index][1] as string
      const token = await deployments.get(tokenSymbol)

      // Setup asset sources
      await ChainlinkProxyPriceProvider.connect(owner).setAssetSources(
        [token.address],
        [USDTestChainlinkAggregator.address]
      )
    }

    ///  ETH  ///
    const ethTestChainlinkAggregatorDeployResult = await deploy('ETHTestChainlinkAggregator', {
      from: deployer,
      log: true,
      skipIfAlreadyDeployed: false,
      contract: 'TestChainlinkAggregator',
    })

    // Get the contract
    const ETHTestChainlinkAggregator = await ethers.getContractAt(
      'TestChainlinkAggregator',
      ethTestChainlinkAggregatorDeployResult.address
    )

    // Set mock price feed
    await ETHTestChainlinkAggregator.connect(owner).setLatestAnswer(parseEther('3150'), lastBlockTime)

    // Get deployed token addresses and setup mock asset sources
    for (const index in ETH_TOKENS_ARGS) {
      // Get deployed token instance
      const tokenSymbol = ETH_TOKENS_ARGS[index][1] as string
      const token = await deployments.get(tokenSymbol)

      // Setup asset sources
      await ChainlinkProxyPriceProvider.connect(owner).setAssetSources(
        [token.address],
        [ETHTestChainlinkAggregator.address]
      )
    }

    ///  BTC  ///
    const btcTestChainlinkAggregatorDeployResult = await deploy('BTCTestChainlinkAggregator', {
      from: deployer,
      log: true,
      skipIfAlreadyDeployed: false,
      contract: 'TestChainlinkAggregator',
    })

    // Get the contract
    const BTCTestChainlinkAggregator = await ethers.getContractAt(
      'TestChainlinkAggregator',
      btcTestChainlinkAggregatorDeployResult.address
    )

    // Set mock price feed
    await BTCTestChainlinkAggregator.connect(owner).setLatestAnswer(parseEther('51125'), lastBlockTime)

    // Get deployed token addresses and setup mock asset sources
    for (const index in BTC_TOKENS_ARGS) {
      // Get deployed token instance
      const tokenSymbol = BTC_TOKENS_ARGS[index][1] as string
      const token = await deployments.get(tokenSymbol)

      // Setup asset sources
      await ChainlinkProxyPriceProvider.connect(owner).setAssetSources(
        [token.address],
        [BTCTestChainlinkAggregator.address]
      )
    }

    /// BSC NETWORK ///
  } else if (hre.network.name == 'bsc') {
    /// USD ///
    for (const index in USD_TOKENS_ARGS) {
      // Get deployed token instance
      const tokenSymbol = USD_TOKENS_ARGS[index][1] as string
      const token = await deployments.get(tokenSymbol)

      // Setup asset sources
      await ChainlinkProxyPriceProvider.connect(owner).setAssetSources([token.address], [FEEDS.chainlink_bsc.usdtusd])
    }

    /// ETH ///
    for (const index in ETH_TOKENS_ARGS) {
      // Get deployed token instance
      const tokenSymbol = ETH_TOKENS_ARGS[index][1] as string
      const token = await deployments.get(tokenSymbol)

      // Setup asset sources
      await ChainlinkProxyPriceProvider.connect(owner).setAssetSources([token.address], [FEEDS.chainlink_bsc.ethusd])
    }

    /// BTC ///
    for (const index in BTC_TOKENS_ARGS) {
      // Get deployed token instance
      const tokenSymbol = BTC_TOKENS_ARGS[index][1] as string
      const token = await deployments.get(tokenSymbol)

      // Setup asset sources
      await ChainlinkProxyPriceProvider.connect(owner).setAssetSources([token.address], [FEEDS.chainlink_bsc.btcusd])
    }
  }
}

export default deployFunc
deployFunc.tags = ['ChainLink']
deployFunc.dependencies = ['Pool'] // this ensure the Token script above is executed first, so `deployments.get('Pool')` succeeds
deployFunc.dependencies = ['Asset'] // this ensure the Token script above is executed first, so `deployments.get('Asset')` succeeds
