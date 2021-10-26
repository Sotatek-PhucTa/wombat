import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-solhint'
import 'solidity-coverage'
import 'hardhat-deploy'
import 'hardhat-gas-reporter'
import 'hardhat-docgen'
import '@hardhat-docgen/core'
import '@hardhat-docgen/markdown'

import { HardhatUserConfig } from 'hardhat/config'
import dotenv from 'dotenv'

dotenv.config()

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    mainnet: {
      url: process.env.ALCHEMY_API || '',
      gasPrice: 140 * 1000000000,
    },
    bsc_mainnet: {
      url: 'https://bsc-dataseed.binance.org/',
      chainId: 56,
      gasPrice: 5000000000,
    },
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
  },
  mocha: {
    timeout: 200000,
  },
  namedAccounts: {
    deployer: {
      default: 0,
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
