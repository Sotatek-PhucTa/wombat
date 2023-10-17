import '@hardhat-docgen/core'
import '@hardhat-docgen/markdown'
import 'hardhat-dependency-compiler'
import '@nomicfoundation/hardhat-chai-matchers'
import '@nomicfoundation/hardhat-toolbox'
import '@nomiclabs/hardhat-solhint'
import '@openzeppelin/hardhat-upgrades'
import dotenv from 'dotenv'
import 'hardhat-contract-sizer'
import 'hardhat-deploy'
import { HardhatUserConfig, extendEnvironment } from 'hardhat/config'
import secrets from './secrets.json' // BSC TESTNET ONLY!
import './tasks/tasks.index'
import { Network } from './types'
import { HardhatRuntimeEnvironment, HttpNetworkUserConfig } from 'hardhat/types'
import _ from 'lodash'
dotenv.config()

const config: HardhatUserConfig = {
  defaultNetwork: Network.HARDHAT,
  networks: {
    [Network.HARDHAT]: {
      // Use free gas so any test account works.
      gasPrice: 0,
      initialBaseFeePerGas: 0,
      allowUnlimitedContractSize: false,
    },
    [Network.LOCALHOST]: {},
    [Network.BSC_TESTNET]: {
      url: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [secrets.deployer.privateKey, secrets.user1.privateKey, secrets.user2.privateKey],
    },
    [Network.BSC_MAINNET]: {
      url: secrets.quicknode_binance_url || 'https://bsc-dataseed.binance.org/',
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [secrets.deployer.privateKey],
    },
    [Network.POLYGON_TESTNET]: {
      url: 'https://polygon-mumbai.blockpi.network/v1/rpc/public/',
      chainId: 80001,
      gasPrice: 20000000000,
      accounts: [secrets.deployer.privateKey, secrets.user1.privateKey, secrets.user2.privateKey],
    },
    [Network.POLYGON_MAINNET]: {
      url: secrets.alchemy_polygon_url || 'https://polygon-rpc.com/',
      chainId: 137,
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
      url: secrets.alchemy_arbitrum_url || 'https://arb1.arbitrum.io/rpc',
      accounts: [secrets.deployer.privateKey],
    },
    [Network.ARBITRUM_TESTNET]: {
      chainId: 421613,
      url: 'https://goerli-rollup.arbitrum.io/rpc',
      accounts: [secrets.deployer.privateKey, secrets.user1.privateKey, secrets.user2.privateKey],
    },
    [Network.OPTIMISM_MAINNET]: {
      chainId: 10,
      url: secrets.alchemy_optimism_url || 'https://mainnet.optimism.io',
      accounts: [secrets.deployer.privateKey],
    },
    [Network.OPTIMISM_TESTNET]: {
      chainId: 69,
      url: 'https://kovan.optimism.io',
      accounts: [secrets.deployer.privateKey, secrets.user1.privateKey, secrets.user2.privateKey],
    },
    [Network.ETHEREUM_MAINNET]: {
      chainId: 1,
      url: secrets.alchemy_ethereum_url || 'https://eth.llamarpc.com',
      accounts: [secrets.deployer.privateKey],
    },
    [Network.BASE_MAINNET]: {
      chainId: 8453,
      url: 'https://mainnet.base.org/',
      accounts: [secrets.deployer.privateKey],
    },
    [Network.AVALANCHE_MAINNET]: {
      chainId: 43114,
      url: 'https://rpc.ankr.com/avalanche/',
      accounts: [secrets.deployer.privateKey],
    },
    [Network.SCROLL_TESTNET]: {
      chainId: 534351,
      url: 'https://sepolia-rpc.scroll.io/',
      accounts: [secrets.deployer.privateKey],
    },
    [Network.SCROLL_MAINNET]: {
      chainId: 534352,
      url: 'https://rpc.scroll.io/',
      accounts: [secrets.deployer.privateKey],
    },
    [Network.SKALE_TESTNET]: {
      chainId: 1351057110,
      url: 'https://staging-v3.skalenodes.com/v1/staging-fast-active-bellatrix/',
      accounts: [secrets.deployer.privateKey],
    },
  },
  etherscan: {
    apiKey: {
      // get the correct key in https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-verify/src/internal/chain-config.ts
      bsc: secrets.bscscan_api_key,
      bscTestnet: secrets.bscscan_api_key,
      avalancheFujiTestnet: secrets.snowtrace_api_key,
      avalanche: secrets.snowtrace_api_key,
      polygon: secrets.polygonscan_api_key,
      polygonMumbai: secrets.polygonscan_api_key,
      arbitrumOne: secrets.arbiscan_api_key,
      arbitrumGoerli: secrets.arbiscan_api_key,
      optimisticEthereum: secrets.opt_etherscan_api_key,
      mainnet: secrets.etherscan_api_key,
      scrollSepolia: 'abc',
      skaleTestnet: 'abc',
      // FIXME: https://app.clickup.com/t/865d89hfw
      // base: secrets.base_api_key,
      scroll: 'abc',
    },
    // https://github.com/smartcontractkit/hardhat-starter-kit/issues/140
    customChains: [
      {
        network: 'scrollSepolia',
        chainId: 534351,
        urls: {
          apiURL: 'https://sepolia-blockscout.scroll.io/api',
          browserURL: 'https://sepolia-blockscout.scroll.io/',
        },
      },
      {
        network: 'skaleTestnet',
        chainId: 1351057110,
        urls: {
          apiURL: 'https://staging-fast-active-bellatrix.explorer.staging-v3.skalenodes.com/api',
          browserURL: 'https://staging-fast-active-bellatrix.explorer.staging-v3.skalenodes.com',
        },
      },
      {
        network: 'scroll',
        chainId: 534352,
        urls: {
          apiURL: 'https://blockscout.scroll.io/api',
          browserURL: 'https://blockscout.scroll.io/',
        },
      },
    ],
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
      [Network.BSC_TESTNET]: '0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452',
      [Network.AVALANCHE_TESTNET]: '0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452',
      [Network.POLYGON_TESTNET]: '0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452',
      [Network.SCROLL_TESTNET]: '0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452',
      [Network.SKALE_TESTNET]: '0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452',
    },
    multisig: {
      // No default to fail if used without initialization. Error singature: `Error: invalid address`.
      [Network.HARDHAT]: 'deployer',
      [Network.LOCALHOST]: 'deployer',
      [Network.BSC_TESTNET]: 'deployer',
      [Network.AVALANCHE_TESTNET]: 'deployer',
      [Network.SCROLL_TESTNET]: 'deployer',
      [Network.POLYGON_TESTNET]: 'deployer',
      [Network.SKALE_TESTNET]: 'deployer',
      [Network.BSC_MAINNET]: '0xC37a89CdB064aC2921Fcc8B3538aC0d6a3AaDF48', // Gnosis Safe
      [Network.ARBITRUM_MAINNET]: '0xC37a89CdB064aC2921Fcc8B3538aC0d6a3AaDF48', // Gnosis Safe
      [Network.OPTIMISM_MAINNET]: '0x9A104004ef083b0980F19Aa5D0Cfaaf2b5FFe388', // Gnosis Safe
      [Network.ETHEREUM_MAINNET]: '0x5781b4fe4fAdB61ea2483eEDD9498388F9b353b1', // Gnosis Safe
      [Network.BASE_MAINNET]: '0xF6EC90f57D4042c61935882c0DA67D6A3a886F98',
      [Network.POLYGON_MAINNET]: '0x9467E157C8c6aF8F25DB75629F907325B49c41bA',
      [Network.AVALANCHE_MAINNET]: '0xcCD7D2cd47bf8130691397a6428Bb9E6bD1F2364',
      // TODO change to gnosis safe
      [Network.SCROLL_MAINNET]: 'deployer',
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

const network = process.env.FORK_NETWORK || ''
if (Object.values(Network).includes(network as Network)) {
  const blockNumber = parseInt(process.env.FORK_BLOCK_NUMBER || '0') || undefined
  const url = config.networks[network].url
  config.networks.hardhat.forking = { url, blockNumber }
  // use `deployer` on fork network
  config.networks[Network.LOCALHOST].accounts = [
    secrets.deployer.privateKey,
    secrets.user1.privateKey,
    secrets.user2.privateKey,
  ]
  // let hardhat reuse existing deployment in the forked network
  // documentation: https://github.com/wighawag/hardhat-deploy#importing-deployment-from-other-projects-with-truffle-support
  const external_deployments = ['deployments', `deployments/${network}`]
  config.external = {
    // comment out if you don't want to re-use deployment from forking
    deployments: Object.assign({}, config.external?.deployments, {
      [Network.HARDHAT]: external_deployments,
      [Network.LOCALHOST]: external_deployments,
    }),
  }
  // override deployer and multisig as well
  // caveat: localhost won't work without deployer credential
  // hardhat network bypass the credential check
  config.namedAccounts.deployer = config.namedAccounts.deployer[network] ?? config.namedAccounts.deployer.default
  config.namedAccounts.multisig = config.namedAccounts.multisig[network] ?? config.namedAccounts.multisig.default
  console.log(`Network hardhat is forking ${network}`)
}

// Workaround to impersonate when connecting to localhost
// See https://github.com/NomicFoundation/hardhat/issues/1226#issuecomment-1519092725
extendEnvironment((hre: HardhatRuntimeEnvironment) => {
  const config = hre.network.config as HttpNetworkUserConfig
  if (hre.network.name === Network.LOCALHOST && config?.url) {
    console.log('Overriding hre.ethers.provider to allow impersonation')
    hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider(config.url)
  }
})

export default config
