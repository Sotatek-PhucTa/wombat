import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers, network } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { CHAINLINK_MAX_PRICE_AGE, CHAINLINK_PRICE_FEEDS } from '../config/oracle.config'
import { Network } from '../types'
import { confirmTxn, isOwner, logVerifyCommand } from '../utils'
import { ChainlinkPriceFeed } from '../build/typechain'
import { getTokenAddress } from '../config/token'
import assert from 'assert'

const contractName = 'ChainlinkPriceFeed'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))

  deployments.log(`Step 004. Deploying on : ${hre.network.name}...`)
  const deployResult = await deploy(contractName, {
    from: deployer,
    log: true,
    contract: 'ChainlinkPriceFeed',
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: multisig,
      proxyContract: 'OptimizedTransparentProxy', // TODO: verify if proxy is needed
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [],
        },
      },
    },
  })

  const pricefeed = (await ethers.getContractAt('ChainlinkPriceFeed', deployResult.address)) as ChainlinkPriceFeed

  if (deployResult.newlyDeployed) {
    logVerifyCommand(hre.network.name, deployResult)
    const maxAge = CHAINLINK_MAX_PRICE_AGE[network.name as Network]
    assert(maxAge, `Invalid max age for ${network.name}`)
    deployments.log(`Setting max price age to ${maxAge}...`)
    await confirmTxn(pricefeed.connect(deployerSigner).setMaxPriceAge(maxAge))

    deployments.log(`Transferring ownership of ${deployResult.address} to multisig(${multisig})...`)
    // The owner of the rewarder contract can add new reward tokens and withdraw them
    await confirmTxn(pricefeed.connect(deployerSigner).transferOwnership(multisig))
  }

  const chainlinkPriceFeed = CHAINLINK_PRICE_FEEDS[hre.network.name as Network] || {}
  const _isOwner = await isOwner(pricefeed, deployer)
  for (const [token, feed] of Object.entries(chainlinkPriceFeed)) {
    const tokenAddr = await getTokenAddress(Number(token))
    const currentFeed = await pricefeed.usdPriceFeeds(tokenAddr)
    if (currentFeed === ethers.constants.AddressZero) {
      if (_isOwner) {
        deployments.log(`Setting price feed address for ${tokenAddr} to ${feed}...`)
        await confirmTxn(pricefeed.connect(deployerSigner).setChainlinkUsdPriceFeed(tokenAddr, feed))
      } else {
        deployments.log(`Please prepare multisig to \`setChainlinkUsdPriceFeed\` for ${tokenAddr}: ${feed}`)
      }
    } else if (currentFeed !== feed) {
      throw `Invalid feed address ${currentFeed} for ${tokenAddr}. Expected: ${feed}`
    }
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['MockTokens']
