import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-solhint'
import '@nomiclabs/hardhat-etherscan'
import 'solidity-coverage'
import 'hardhat-deploy'
import 'hardhat-gas-reporter'
import 'hardhat-docgen'
import '@hardhat-docgen/core'
import '@hardhat-docgen/markdown'

import { HardhatUserConfig } from 'hardhat/config'
import dotenv from 'dotenv'
import secrets from './secrets.json' // BSC TESTNET ONLY!

dotenv.config()

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    mainnet: {
      url: process.env.ALCHEMY_API || '',
      gasPrice: 140 * 1000000000,
    },
    bsc_testnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [secrets.deployer.privateKey, secrets.user1.privateKey, secrets.user2.privateKey],
    },
    bsc_mainnet: {
      url: 'https://bsc-dataseed.binance.org/',
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [], // replace with mainnet wallet private key
    },
  },
  etherscan: {
    // Your API key for BSCscan
    // Obtain one at https://bscscan.io/
    apiKey: secrets.bscscan_api_key,
  },
  solidity: {
    compilers: [
      {
        version: '0.8.5',
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
    owner: {
      default: 0,
    },
    user1: {
      default: 1,
    },
    user2: {
      default: 2,
    },
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: false,
    except: ['/test/*', '/mock/*'],
  },
}

if (process.env.ACCOUNT_PRIVATE_KEYS) {
  config.networks = {
    ...config.networks,
    mainnet: {
      ...config.networks?.mainnet,
      accounts: JSON.parse(process.env.ACCOUNT_PRIVATE_KEYS),
    },
    bsc_mainnet: {
      ...config.networks?.bsc_mainnet,
      accounts: JSON.parse(process.env.ACCOUNT_PRIVATE_KEYS),
    },
  }
}

if (process.env.FORK_MAINNET && config.networks) {
  config.networks.hardhat = {
    forking: {
      url: process.env.ALCHEMY_API ? process.env.ALCHEMY_API : '',
    },
    chainId: 1,
  }
}

config.gasReporter = {
  enabled: process.env.REPORT_GAS ? true : false,
}

export default config
