import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers, network } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { PythPriceFeed } from '../build/typechain'
import { PYTH_MAX_PRICE_AGE_BOUND, PYTH_PRICE_IDS } from '../config/oracle.config'
import { Network } from '../types'
import { confirmTxn, isOwner, logVerifyCommand } from '../utils'
import { getTokenAddress } from '../config/token'
import { ExternalContract, getContractAddress } from '../config/contract'
import assert from 'assert'

const contractName = 'PythPriceFeed'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const deployerSigner = await SignerWithAddress.create(ethers.provider.getSigner(deployer))
  const pyth = await getContractAddress(ExternalContract.PythOracle)
  const maxAgeBound = PYTH_MAX_PRICE_AGE_BOUND[network.name as Network]
  assert(maxAgeBound, `Undefined max age bound for ${network.name}`)

  deployments.log(`Step 005. Deploying on : ${hre.network.name}...`)
  const deployResult = await deploy(contractName, {
    from: deployer,
    log: true,
    contract: 'PythPriceFeed',
    skipIfAlreadyDeployed: true,
    args: [pyth, maxAgeBound],
  })

  const pricefeed = (await ethers.getContractAt('PythPriceFeed', deployResult.address)) as PythPriceFeed

  if (deployResult.newlyDeployed) {
    logVerifyCommand(hre.network.name, deployResult)

    deployments.log(`Transferring ownership of ${deployResult.address} to multisig(${multisig})...`)
    // The owner of the rewarder contract can add new reward tokens and withdraw them
    await confirmTxn(pricefeed.connect(deployerSigner).transferOwnership(multisig))
  }

  const pythPriceId = PYTH_PRICE_IDS[hre.network.name as Network] || {}
  const _isOwner = await isOwner(pricefeed, deployer)
  for (const [token, feed] of Object.entries(pythPriceId)) {
    const tokenAddr = await getTokenAddress(Number(token))
    const currentId = await pricefeed.priceIDs(tokenAddr)
    const currentMaxPriceAge = await pricefeed.maxPriceAge(tokenAddr)

    if (currentId === ethers.constants.HashZero) {
      if (_isOwner) {
        deployments.log(`Setting price feed id for ${tokenAddr} to ${feed.priceId}...`)
        await confirmTxn(pricefeed.connect(deployerSigner).setPriceID(tokenAddr, feed.priceId, feed.maxPriceAge))
      } else {
        deployments.log(`Please prepare multisig to \`setPriceID\` for ${tokenAddr}: ${feed.priceId}`)
      }
    } else if (currentId !== feed.priceId) {
      throw `Invalid feed id ${currentId} for ${tokenAddr}. Expected: ${feed.priceId}`
    } else if (currentMaxPriceAge.eq(feed.maxPriceAge)) {
      throw `Invalid max price age ${currentMaxPriceAge} for ${tokenAddr}. Expected: ${feed.maxPriceAge}`
    }
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['MockTokens']
