import { parseEther } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { parseUnits } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { DeployOptions, DeployResult, DeploymentsExtension } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Asset, MegaPool, MockERC20 } from '../build/typechain'
import { confirmTxn, getDeadlineFromNow, logVerifyCommand } from '../utils'

const contractName = 'MegaPool'
const DEVELOPMENT_MODE = true

// Note: For development purpose only. Not production ready
// TODO: Write some automatic tests for cross-chain swap
// Sample swaps:
// - https://testnet.bscscan.com/tx/0xe80a7a90887383e3f201ad73d8a6e46188d66d73d41051123161607d2e696255
// - https://testnet.bscscan.com/tx/0x46fd8910593dd81ee03994a04efe88456e690108544afb1fe6c78ea4276a228e
const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments as DeploymentsExtension
  const { deployer, multisig } = await getNamedAccounts()
  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  deployments.log(`Step 060. Deploying on : ${hre.network.name}...`)

  // Note: For development purpose only. Not production ready
  if (!['bsc_testnet', 'fuji'].includes(hre.network.name)) throw 'MegaPool is only available in testnet'

  const coreV3DeployResult = await deploy('CoreV3', { from: deployer, log: true, skipIfAlreadyDeployed: true })

  /// Deploy pool
  const poolDeployResult = await deploy(contractName, {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    libraries: { CoreV3: coreV3DeployResult.address },
    proxy: {
      owner: multisig, // change to Gnosis Safe after all admin scripts are done
      proxyContract: 'OptimizedTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [parseEther('0.002'), parseEther('0.004')], // [A, haircut => 40bps]
        },
      },
    },
  })

  // Get freshly deployed Pool pool
  const pool = await ethers.getContractAt(contractName, poolDeployResult.address)
  const implAddr = await upgrades.erc1967.getImplementationAddress(poolDeployResult.address)
  deployments.log('Contract address:', poolDeployResult.address)
  deployments.log('Implementation address:', implAddr)

  if (poolDeployResult.newlyDeployed) {
    // Check setup config values
    const ampFactor = await pool.ampFactor()
    const hairCutRate = await pool.haircutRate()
    deployments.log(`Amplification factor is : ${ampFactor}`)
    deployments.log(`Haircut rate is : ${hairCutRate}`)

    logVerifyCommand(hre.network.name, coreV3DeployResult)
    logVerifyCommand(hre.network.name, poolDeployResult)

    if (DEVELOPMENT_MODE) {
      await setUpTestEnv(pool as MegaPool, owner, deployer, deploy, hre.network.name)
    }
  } else {
    deployments.log(`${contractName} Contract already deployed.`)
  }
}

async function setUpTestEnv(
  pool: MegaPool,
  owner: SignerWithAddress,
  deployer: string,
  deploy: (name: string, options: DeployOptions) => Promise<DeployResult>,
  network: string
) {
  const token0Result = await deploy('Binance USD', {
    contract: 'MockERC20',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: ['Binance USD', 'BUSD', 6, parseUnits('10000000', 6)],
  })

  const token1Result = await deploy('Venus USDC', {
    contract: 'MockERC20',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: ['Venus USDC', 'vUSDC', 6, parseUnits('10000000', 6)],
  })

  const asset0Result = await deploy('BUSD Asset', {
    contract: 'Asset',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [token0Result.address, 'Binance USD LP', 'BUSD-LP'],
  })

  const asset1Result = await deploy('vUSDC Asset', {
    contract: 'Asset',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [token1Result.address, 'Venus USDC LP', 'vUSDC-LP'],
  })

  logVerifyCommand(network, token0Result)
  logVerifyCommand(network, token1Result)
  logVerifyCommand(network, asset0Result)
  logVerifyCommand(network, asset1Result)

  const token0 = (await ethers.getContractAt('MockERC20', token0Result.address)) as MockERC20
  const token1 = (await ethers.getContractAt('MockERC20', token1Result.address)) as MockERC20
  const asset0 = (await ethers.getContractAt('Asset', asset0Result.address)) as Asset
  const asset1 = (await ethers.getContractAt('Asset', asset1Result.address)) as Asset

  // set up pool
  deployments.log('set up pool...')
  await confirmTxn(pool.connect(owner).addAsset(asset0Result.address, asset0Result.address))
  await confirmTxn(pool.connect(owner).addAsset(token1Result.address, asset1Result.address))

  await confirmTxn(asset0.setPool(pool.address))
  await confirmTxn(asset1.setPool(pool.address))

  await confirmTxn(pool.setMaximumNetMintedCredit(parseEther('100000')))
  await confirmTxn(pool.setMaximumNetBurnedCredit(parseEther('100000')))
  await confirmTxn(pool.setSwapTokensForCreditEnabled(true))
  await confirmTxn(pool.setSwapCreditForTokensEnabled(true))

  // deposit tokens
  deployments.log('deposit tokens...')
  await confirmTxn(token0.approve(pool.address, parseEther('10000000')))
  await confirmTxn(token1.approve(pool.address, parseEther('10000000')))
  await confirmTxn(
    pool.deposit(asset0Result.address, parseUnits('100000', 6), 0, owner.address, getDeadlineFromNow(3600), false)
  )
  await confirmTxn(
    pool.deposit(asset1Result.address, parseUnits('100000', 6), 0, owner.address, getDeadlineFromNow(3600), false)
  )
}

export default deployFunc
deployFunc.tags = [contractName]
