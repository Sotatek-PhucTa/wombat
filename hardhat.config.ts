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
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
      ...(process.env.FORK_MAINNET != 'false'
        ? {
            forking: {
              // pick one from https://chainlist.org/chain/56
              url: 'https://bsc-dataseed1.defibit.io',
              blockNumber: 25997388,
            },
          }
        : {}),
    },
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
  },
  etherscan: {
    apiKey: {
      // get the correct key in https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-etherscan/src/ChainConfig.ts
      bsc: secrets.bscscan_api_key,
      bscTestnet: secrets.bscscan_api_key,
      avalancheFujiTestnet: secrets.snowtrace_api_key,
      avalanche: secrets.snowtrace_api_key,
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
        version: '0.8.15',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
      {
        version: '0.8.5',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
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
      bsc_testnet: '0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452',
      bsc_mainnet: '0xcB3Bb767104e0b3235520fafB182e005D7efD045',
    },
    user1: {
      default: 1,
    },
    user2: {
      default: 2,
    },
    multisig: {
      default: 0,
      bsc_testnet: '0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452', // same as deployer
      bsc_mainnet: '0xC37a89CdB064aC2921Fcc8B3538aC0d6a3AaDF48', // Gnosis Safe
    },
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: false,
    except: ['/test/*', '/mock/*'],
  },
}

export default config
