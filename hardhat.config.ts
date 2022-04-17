import '@hardhat-docgen/core'
import '@hardhat-docgen/markdown'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-solhint'
import '@nomiclabs/hardhat-waffle'
import '@openzeppelin/hardhat-upgrades'
import '@typechain/hardhat'
import dotenv from 'dotenv'
import 'hardhat-contract-sizer'
import 'hardhat-deploy'
import 'hardhat-docgen'
import 'hardhat-gas-reporter'
import { HardhatUserConfig } from 'hardhat/config'
import 'solidity-coverage'
import secrets from './secrets.json' // BSC TESTNET ONLY!

dotenv.config()

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
      forking: {
        url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
        blockNumber: 17444370,
      },
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
      accounts: [secrets.deployer.privateKey], // replace with mainnet wallet private key
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
    deployer: {
      default: '0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452',
    },
    user1: {
      default: 1,
    },
    user2: {
      default: 2,
    },
    mainnetDeployer: {
      default: '0x8c6644415b3F3CD7FC0A453c5bE3d3306Fe0b2F9',
    },
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: false,
    except: ['/test/*', '/mock/*'],
  },
}

config.gasReporter = {
  enabled: secrets.gas_breakdown_enabled,
  outputFile: '.gas-snapshot',
  noColors: true,
}

export default config
