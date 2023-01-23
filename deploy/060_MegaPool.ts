import { parseEther } from '@ethersproject/units'
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployOptions, DeployResult, DeploymentsExtension } from 'hardhat-deploy/types'
import { parseUnits } from 'ethers/lib/utils'
import { Contract } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const contractName = 'MegaPool'
const DEVELOPMENT_MODE = true

// Note: For development purpose only. Not production ready
const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments as DeploymentsExtension
  const { deployer, multisig } = await getNamedAccounts()
  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 010. Deploying on : ${hre.network.name}...`)

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
          args: [parseEther('0.002'), parseEther('0.0001')], // [A, haircut => 1bps]
        },
      },
    },
  })

  // Get freshly deployed Pool pool
  const pool = await ethers.getContractAt(contractName, poolDeployResult.address)
  const implAddr = await upgrades.erc1967.getImplementationAddress(poolDeployResult.address)
  console.log('Contract address:', poolDeployResult.address)
  console.log('Implementation address:', implAddr)

  if (poolDeployResult.newlyDeployed) {
    // Check setup config values
    const ampFactor = await pool.ampFactor()
    const hairCutRate = await pool.haircutRate()
    console.log(`Amplification factor is : ${ampFactor}`)
    console.log(`Haircut rate is : ${hairCutRate}`)

    await pool.connect(owner).setCrossChainHaircut(parseEther('0.004'))

    if (DEVELOPMENT_MODE) {
      await setUpTestEnv(pool, owner, deployer, deploy)
    }
  } else {
    console.log(`${contractName} Contract already deployed.`)
    return poolDeployResult
  }
}

async function setUpTestEnv(
  pool: Contract,
  owner: SignerWithAddress,
  deployer: string,
  deploy: (name: string, options: DeployOptions) => Promise<DeployResult>
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

  const asset1Result = await deploy('vUSD Asset', {
    contract: 'Asset',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [token0Result.address, 'Venus USDC LP', 'vUSDC-LP'],
  })

  await pool.connect(owner).addAsset(token0Result.address, asset0Result)
  await pool.connect(owner).addAsset(token1Result.address, asset1Result)

  await pool.setMaximumNetMintedCredit(parseEther('100000'))
  await pool.setMaximumNetBurnedCredit(parseEther('100000'))
  await pool.setSwapTokensForCreditEnabled(true)
  await pool.setSwapCreditForTokensEnabled(true)
}

export default deployFunc
deployFunc.tags = [contractName]
