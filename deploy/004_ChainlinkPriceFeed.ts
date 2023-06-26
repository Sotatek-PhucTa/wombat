import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers, network } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { CHAINLINK_MAX_PRICE_AGE_BOUND, CHAINLINK_PRICE_FEEDS } from '../config/oracle.config'
import { Network } from '../types'
import { confirmTxn, isOwner, logVerifyCommand } from '../utils'
import { ChainlinkPriceFeed } from '../build/typechain'
import { getTokenAddress } from '../config/token'
import assert from 'assert'
import { getCurrentNetwork } from '../types/network'

const contractName = 'ChainlinkPriceFeed'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const maxAgeBound = CHAINLINK_MAX_PRICE_AGE_BOUND[network.name as Network]
  assert(maxAgeBound, `Undefined max age bound for ${network.name}`)

  deployments.log(`Step 004. Deploying on : ${hre.network.name}...`)
  const deployResult = await deploy(contractName, {
    from: deployer,
    log: true,
    contract: 'ChainlinkPriceFeed',
    skipIfAlreadyDeployed: true,
    args: [maxAgeBound],
  })

  const pricefeed = (await ethers.getContractAt('ChainlinkPriceFeed', deployResult.address)) as ChainlinkPriceFeed

  if (deployResult.newlyDeployed) {
    logVerifyCommand(deployResult)
    deployments.log(`Transferring ownership of ${deployResult.address} to multisig(${multisig})...`)
    // The owner of the rewarder contract can add new reward tokens and withdraw them
    await confirmTxn(pricefeed.connect(deployerSigner).transferOwnership(multisig))
  }

  const chainlinkPriceFeed = CHAINLINK_PRICE_FEEDS[hre.network.name as Network] || {}
  const _isOwner = await isOwner(pricefeed, deployer)
  for (const [token, feed] of Object.entries(chainlinkPriceFeed)) {
    const tokenAddr = await getTokenAddress(Number(token))
    const currentFeed = await pricefeed.usdPriceFeeds(tokenAddr)
    const currentMaxPriceAge = await pricefeed.maxPriceAge(tokenAddr)

    if (currentFeed === ethers.constants.AddressZero) {
      if (_isOwner) {
        deployments.log(`Setting price feed address for ${tokenAddr} to ${feed.contract}...`)
        await confirmTxn(
          pricefeed.connect(deployerSigner).setChainlinkUsdPriceFeed(tokenAddr, feed.contract, feed.maxPriceAge)
        )
      } else {
        deployments.log(`Please prepare multisig to \`setChainlinkUsdPriceFeed\` for ${tokenAddr}: ${feed.contract}`)
      }
    } else if (currentFeed !== feed.contract) {
      throw `Invalid feed address ${currentFeed} for ${tokenAddr}. Expected: ${feed.contract}`
    } else if (currentMaxPriceAge.eq(feed.maxPriceAge)) {
      throw `Invalid max price age ${currentMaxPriceAge} for ${tokenAddr}. Expected: ${feed.maxPriceAge}`
    }
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['MockTokens']
deployFunc.skip = async () => {
  return [Network.HARDHAT, Network.LOCALHOST].includes(getCurrentNetwork())
}
