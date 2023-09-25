import '@hardhat-docgen/core'
import '@hardhat-docgen/markdown'
import 'hardhat-dependency-compiler'
import '@nomicfoundation/hardhat-chai-matchers'
import '@nomiclabs/hardhat-solhint'
import dotenv from 'dotenv'
import 'hardhat-contract-sizer'
import 'hardhat-deploy'
import '@matterlabs/hardhat-zksync-deploy'
import '@matterlabs/hardhat-zksync-solc'
import '@matterlabs/hardhat-zksync-verify'
import '@matterlabs/hardhat-zksync-upgradable'

import { HardhatUserConfig } from 'hardhat/config'
import secrets from './secrets.json' // BSC TESTNET ONLY!
import './tasks/tasks.index'
import { Network } from './types'
import _ from 'lodash'
dotenv.config()

// TODO: clean up by using import from hardhat.config.ts
const config: HardhatUserConfig = {
  defaultNetwork: Network.HARDHAT,
  networks: {
    [Network.LOCALHOST]: {
      chainId: 270,
      url: 'http://localhost:3050',
      ethNetwork: 'http://localhost:8545',
      zksync: true,
      // zksync local node rich wallet preloaded
      // https://era.zksync.io/docs/tools/testing/dockerized-testing.html#working-with-rich-wallets
      // https://github.com/matter-labs/local-setup/blob/main/rich-wallets.json
      accounts: [secrets.zksync.privateKey],
    },
    [Network.GOERLI]: {
      chainId: 5,
      url: 'https://rpc.ankr.com/eth_goerli',
      accounts: [secrets.deployer.privateKey],
      zksync: false,
    },
    [Network.ZKSYNC_TESTNET]: {
      chainId: 280,
      url: 'https://testnet.era.zksync.dev',
      ethNetwork: Network.GOERLI,
      accounts: [secrets.deployer.privateKey],
      zksync: true,
      verifyURL: 'https://zksync2-testnet-explorer.zksync.dev/contract_verification',
    },
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
    // These github users are both multisig owners and deployers.
    jack: '0xcB3Bb767104e0b3235520fafB182e005D7efD045',
    drop19: '0xc92b4ceF4BFA0EeFE16eDA4689da10df9Fe9e801',
    tj: '0x9e031064ce7C3E9b6dda1FfCF9E5D41AFBbdfEEa',
    deployer: {
      default: 'jack',
      // Keep hardhat and localhost network using the first signers in ethers.getSigners().
      // Some test code assumes owner, deployer, and multisig are the same.
      [Network.HARDHAT]: 0,
      [Network.LOCALHOST]: 0,
      [Network.ZKSYNC_TESTNET]: '0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452',
    },
    multisig: {
      // No default to fail if used without initialization. Error singature: `Error: invalid address`.
      [Network.HARDHAT]: 'deployer',
      [Network.LOCALHOST]: 'deployer',
      [Network.ZKSYNC_TESTNET]: 'jack',
    },
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: false,
    except: ['/test/*', '/mock/*'],
  },
  dependencyCompiler: {
    paths: [
      '@openzeppelin/contracts/governance/TimelockController.sol',
      '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol',
      '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol',
    ],
  },
  zksolc: {
    version: 'latest', // Uses latest available in https://github.com/matter-labs/zksolc-bin/
    settings: {
      // https://era.zksync.io/docs/tools/hardhat/compiling-libraries.html
      libraries: {
        'contracts/wombat-core/pool/CoreV3.sol': {
          // Set CoreV3 address to zero just to bypass the compilation process
          // CoreV3 only use in CrossChainPool which will not be deployed on zksync
          // Need to update the address if we actually using the library
          CoreV3: '0x0000000000000000000000000000000000000000',
        },
      },
    },
  },
  // Enable reading deployments from other chains.
  // This is needed for cross chain pool to set up adaptor addresses in other chains.
  // To read deployments in another chain, prefix it with the network name.
  // For example, deployments.get('bsc_testnet/DefaultProxyAdmin') will read deployments/bsc_testnet/DefaultProxyAdmin.json.
  external: {
    deployments: _.chain(Object.values(Network))
      .mapKeys((value) => value)
      .mapValues(() => ['deployments'])
      .value(),
  },
}

export default config
