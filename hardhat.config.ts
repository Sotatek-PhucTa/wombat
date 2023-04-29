import '@hardhat-docgen/core'
import '@hardhat-docgen/markdown'
import '@nomicfoundation/hardhat-chai-matchers'
import '@nomicfoundation/hardhat-toolbox'
import '@nomiclabs/hardhat-solhint'
import '@openzeppelin/hardhat-upgrades'
import dotenv from 'dotenv'
import 'hardhat-contract-sizer'
import 'hardhat-deploy'
import { HardhatUserConfig } from 'hardhat/config'
import secrets from './secrets.json' // BSC TESTNET ONLY!
import './tasks/tasks.index'
import { Network } from './types'
dotenv.config()

const config: HardhatUserConfig = {
  defaultNetwork: Network.HARDHAT,
  networks: {
    [Network.HARDHAT]: {
      allowUnlimitedContractSize: false,
    },
    [Network.LOCALHOST]: {},
    [Network.BSC_TESTNET]: {
      url: 'https://data-seed-prebsc-1-s3.binance.org:8545',
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [secrets.deployer.privateKey, secrets.user1.privateKey, secrets.user2.privateKey],
    },
    [Network.BSC_MAINNET]: {
      url: 'https://bsc-dataseed.binance.org/',
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [secrets.deployer.privateKey],
    },
    [Network.POLYGON_TESTNET]: {
      url: 'https://rpc-mumbai.maticvigil.com/',
      chainId: 80001,
      gasPrice: 20000000000,
      accounts: [secrets.deployer.privateKey, secrets.user1.privateKey, secrets.user2.privateKey],
    },
    [Network.POLYGON_MAINNET]: {
      url: 'https://polygon-rpc.com/',
      chainId: 137,
      gasPrice: 20000000000,
      accounts: [secrets.deployer.privateKey],
    },
    [Network.AVALANCHE_TESTNET]: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      gas: 5000000,
      gasPrice: 30 * 1000000000,
      chainId: 43113,
      accounts: [secrets.deployer.privateKey, secrets.user1.privateKey, secrets.user2.privateKey],
    },
    [Network.ARBITRUM_MAINNET]: {
      chainId: 42161,
      url: 'https://arb1.arbitrum.io/rpc',
      accounts: [secrets.deployer.privateKey],
    },
    [Network.ARBITRUM_TESTNET]: {
      chainId: 421613,
      url: 'https://goerli-rollup.arbitrum.io/rpc',
      accounts: [secrets.deployer.privateKey, secrets.user1.privateKey, secrets.user2.privateKey],
    },
    [Network.OPTIMISM_MAINNET]: {
      chainId: 10,
      url: 'https://mainnet.optimism.io',
      accounts: [secrets.deployer.privateKey],
    },
    [Network.OPTIMISM_TESTNET]: {
      chainId: 69,
      url: 'https://kovan.optimism.io',
      accounts: [secrets.deployer.privateKey, secrets.user1.privateKey, secrets.user2.privateKey],
    },
  },
  etherscan: {
    apiKey: {
      // get the correct key in https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-etherscan/src/ChainConfig.ts
      bsc: secrets.bscscan_api_key,
      bscTestnet: secrets.bscscan_api_key,
      avalancheFujiTestnet: secrets.snowtrace_api_key,
      avalanche: secrets.snowtrace_api_key,
      // TODO: add polygonscan key for polygon and polygonMumbai
      arbitrumOne: secrets.arbiscan_api_key,
      arbitrumGoerli: secrets.arbiscan_api_key,
    },
    // https://github.com/smartcontractkit/hardhat-starter-kit/issues/140
    customChains: [],
  },
  gasReporter: {
    enabled: secrets.gas_breakdown_enabled,
    outputFile: '.gas-snapshot',
    noColors: true,
    excludeContracts: ['contracts/wombat-governance/mocks/', 'contracts/wombat-core/test/'],
  },
  solidity: {
    compilers: [
      {
        version: '0.8.18',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: '0.4.18',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
    ],
  },
  typechain: {
    outDir: './build/typechain/',
    target: 'ethers-v5',
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
    deploy: 'deploy',
    deployments: 'deployments',
    imports: 'imports',
  },
  mocha: {
    timeout: 200000,
  },
  namedAccounts: {
    deployer: {
      default: 0, // use default for hardhat and localhost
      [Network.BSC_TESTNET]: '0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452',
      [Network.AVALANCHE_TESTNET]: '0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452',
      [Network.BSC_MAINNET]: '0xcB3Bb767104e0b3235520fafB182e005D7efD045',
      [Network.ARBITRUM_MAINNET]: '0xcB3Bb767104e0b3235520fafB182e005D7efD045',
      [Network.OPTIMISM_MAINNET]: '0xcB3Bb767104e0b3235520fafB182e005D7efD045',
    },
    user1: {
      default: 1,
    },
    user2: {
      default: 2,
    },
    multisig: {
      default: 0, // use default for hardhat and localhost
      [Network.BSC_TESTNET]: '0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452', // same as deployer
      [Network.AVALANCHE_TESTNET]: '0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452', // same as deployer
      [Network.BSC_MAINNET]: '0xC37a89CdB064aC2921Fcc8B3538aC0d6a3AaDF48', // Gnosis Safe
      [Network.ARBITRUM_MAINNET]: '0xC37a89CdB064aC2921Fcc8B3538aC0d6a3AaDF48', // Gnosis Safe
      // TODO: create gnosis multi-sig safe for OPT
      [Network.OPTIMISM_MAINNET]: '0xC37a89CdB064aC2921Fcc8B3538aC0d6a3AaDF48', // Gnosis Safe
    },
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: false,
    except: ['/test/*', '/mock/*'],
  },
}

const network = process.env.FORK_NETWORK || ''
if (Object.values(Network).includes(network as Network)) {
  const url = config.networks[network].url
  config.networks.hardhat.forking = { url }
  // use `deployer` on fork network
  config.networks[Network.LOCALHOST].accounts = [
    secrets.deployer.privateKey,
    secrets.user1.privateKey,
    secrets.user2.privateKey,
  ]
  // let hardhat reuse existing deployment in the forked network
  // documentation: https://github.com/wighawag/hardhat-deploy#importing-deployment-from-other-projects-with-truffle-support
  const external_deployments = [`deployments/${network}`]
  config.external = {
    // comment out if you don't want to re-use deployment from forking
    deployments: { [Network.HARDHAT]: external_deployments, [Network.LOCALHOST]: external_deployments },
  }
  // override deployer and multisig as well
  // caveat: localhost won't work without deployer credential
  // hardhat network bypass the credential check
  config.namedAccounts.deployer.default = config.namedAccounts.deployer[network]
  config.namedAccounts.multisig.default = config.namedAccounts.multisig[network]
  console.log(`Network hardhat is forking ${network}`)
}

export default config
