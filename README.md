# Wombat Exchange Core

---

This is the repo for serving the core smart contracts of Wombat Exchange 🚀 ✨

## Local Development

Below lists the basic steps in kickstarting your local development 🖥️

_Requires `node@>=14` and `node@<=16`, visit [node.js](https://nodejs.org/en/) for more details._

- Run `yarn` to install dependencies
- Run `yarn compile` to compile contracts
- Run `yarn test` to run unit tests

> You may want to run `yarn clean` first if you encounter contract code recompiling issues.

## Git Workflow

- Create new branches named `feature/xxx` or `fix/xxx` for new features or bug fixes respectively; they should branch out from the `develop` branch
- If it's a quick fix, branch off master with `hotfix/xxx` and merge into master
- After your new code is completed, go back to `develop` and merge the new branch
- Do not commit to `master` branch directly to maintain a proper workflow

> A simple Github Actions CI workflow is adopted where `linting` and `testing` would be run each time a commit has been pushed.

## Deployment 🚁

### For BSC testnet network

- Run `yarn deploy_bsc_testnet` and that's it.
- Run `yarn bsc_testnet_demo` to run a demo of core smart contracts interactions via scripts.

Behind the scenes:

- [hardhat-deploy](https://github.com/wighawag/tutorial-hardhat-deploy) is used to help make the whole deployment flow easier and more robust
- deployment configs are set up at `hardhat.config.ts`
- wallet accounts/ api keys are loaded from `secrets.json` (**testnet only**)
- scripts within the `deploy` folder are run in alphabetical order, i.e. 001*, 002*, etc.
- deployed contracts info, e.g. addresses located within the `deployments` folder

Hardhat Verify:

- Follow steps at [Binance Chain Docs](https://docs.binance.org/smart-chain/developer/deploy/hardhat-verify.html) on verifying contracts on bscscan.com such that you can `read/write` directly with your web3 metamask wallet.
- E.g. `npx hardhat verify --network bsc_testnet 0x9cc77B893d40861854fD90Abaf8414a5bD2bEcf8 'Venus USDC' 'vUSDC' '8' 0`

Deployed contracts v1 (BSC Testnet):

- BSC Wallet Accounts

  - Deployer (owner) => `0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452`
  - User 1 => `0x1d39a90dAC4596b36D60682B6cec147Eb758AF90`
  - User 2 => `0x67F6e6EEB3e61e23Ee765905F5a04a2Bbd0E3a73`

- Wombat Core

  - Pool (Main entry) => `0xDa01302C86ECcd5bc94c1086777acF3c3Af7EF63`
  - Account (USD_Aggregate) => `0xEc61d2E5780dC9636dF55ab761D8748F7899298f`
  - Asset (LP-BUSD) => `0x421aa41e85d240237582864DfA6f66E1A734356a`
  - Asset (LP-USDC) => `0x41FDf92c5E3E86931c3Bcb9a8F0f5362b7C2ab95`
  - Asset (LP-USDT) => `0xc265451A429909BD980dee9f0362FaD4b674F8Ac`
  - Asset (LP-DAI) => `0x0aD0599bCB1670ea1350f05C6daafC2b949eDB79`
  - Asset (LP-TUSD) => `0x6dA135D8D8bd55c1A191F2c6c2F05FCc8FA8dE73`
  - Asset (LP-vUSDC) => `0xdB94436080Df9C5a2736c878D686D096d8d7a14C`

- Wombat Token

  - WOM (ERC20) => `0x37ffd749977ace830d6f061d43199fcdfd34b41e`
  - Token Vesting => `0xF33Fcb7EB28481d019A493F4fB5Db2D206A52A26` (v1 deprecated - interval count bug)
  - Token Vesting => `0x37FFd749977ACE830D6f061D43199fCDfd34b41e` (v2)

- Mock ERC20 Stablecoins

  - BUSD => `0x326335BA4e70cb838Ee55dEB18027A6570E5144d`
  - USDC => `0x254dF1f8A8Fa9B7bFAd9e25bF912ea71484332cE`
  - USDT => `0x6E847Cc3383525Ad33bEDd260139c1e097546B60`
  - DAI => `0x735d905451c0B4ac4BBe5Ab323Cf5D6Ad7e3A030`
  - TUSD => `0xFE9AbD3dC0975f00e5C4ca6B148a992758F6A819`
  - vUSDC => `0x9cc77B893d40861854fD90Abaf8414a5bD2bEcf8`

### For BSC mainnet network

- Update accounts deployer private key at `hardhat.config.ts`
- Run `yarn deploy_bsc_mainnet`
- Deploy the `Asset` contracts individually as shown in `003_Assets.ts`
- Safeguard the `deployer private key` or `transferOwnership` to multisig (e.g. Gnosis Safe)

## High-level System Overview

![Wombat High-level System Design"](/diagrams/high-level-design-v2.png 'High-level System Design')

### The Approve/TransferFrom Pattern

The operations `deposit`, `swap`, and `withdraw` all adopts the `Approve/TransferFrom` pattern, i.e. users must grant the erc20 token contract for approval of the pool or asset contract to change the erc20 token balance mapping on behalf of the user (i.e. trusted agent to transferFrom the user). The steps for these operations are listed below.

- For `deposit` and `swap`, the user would first need to approve `pool` contract the amount for the ERC20 token that they intend to deposit or swap.
- For `withdraw`, the user would need to perform an extra step of approving the corresponding `asset` contract for the ERC20 token they intend to withdraw, as the asset contract would transfer the corresponding LP tokens from the user to `burn` prior to transferring the actual `underlying ERC20` token back to the user.

> `increaseAllowance` should be used instead of `approve` due to potential attack vectors as described at [OZ Docs](https://docs.openzeppelin.com/contracts/2.x/api/token/erc20#ERC20-increaseAllowance-address-uint256-)

### Adding new assets

Each asset, e.g. LP-BUSD, LP-USDC, LP-BUSD-T, etc. must be added into the `pool` contract once they are created. This is done by invoking the `addAsset(address token, address asset)` function where `token` is the underlying ERC20 token and `asset` is the corresponding ERC20-LP token.

## Protocol Design 👷‍♂️

Wombat protocol adopts a monolithic smart contract design where a single implementation contract, i.e. `Pool.sol`, inherits multiple contracts for extended functionalities, such as `ownable`, `initializable`, `reentrancy guards`, `pausable`, and `core algorithm` contracts. These inherited contracts provide access-controlled functions, and the ability to `pause` or `upgrade` the implementation contract (_also serves as main entry point of Wombat protocol_) should unexpected events occur after deployment.

### On CoreV2 (Maths)

Additional peripheral contracts include libraries, such as `DSMath`, and `SignedSafeMath` provides robust arithmetic operations on integers. Though `solc 0.8+` provides integer overflow/ underflow protection, the libraries offer support in areas such as `fixed point math` and calcuations using `WAD` which offers arithmetics for decimal number with 18 digits of precision (most common standard).

We also prefer `safety over gas costs`. Furthermore, the additional gas costs are negligent ([OZ forum discussion](https://forum.openzeppelin.com/t/oz-contracts-v4-safemath/9759/4)) and can be further optimised by the compiler.

A `WAD converter` is implemented to ensure prices amongst stablecoins with different decimals are calculated accurately during a `swap` operation. This is because internally, cryptocurrency amounts use integers and hence we would convert all incoming amounts to the `WAD` base before operating on them.

`int256` has been adopted instead of `uint256` to cater for negative integers which occur within the core stableswap invariant equation. We consider the impact of this switch to be negligible, as the difference in integer ranges are miniscule.

- A `uint256` has a min value of `0` and a max value of `2^256-1 => 1.157920892373162e+77`
- A `int256` has a min value of `-2^255 => -5.78960446186581e+76` and a max value of `2^255-1 => 5.78960446186581e+76`

> A "unstructured storage" + "transparent proxy" contract upgrade pattern is currently used. UUPS proxies, which are more lightweight and versatile may be considered in future deployments.

## Oracles

An oracle allows Wombat protocol to get the asset prices from a chainlink oracle services provider. An oracle implementation is not currently needed due to:

- Wombat's stableswap invariant design does not require asset price input
- Assumption of pegged assets priced at 1
- Assumption of pegged assets reverting to their pegged prices.

Though an oracle is not needed for stableswap, an oracle would be required for non-pegged assets swap, where it would serve as a preventive measure for the protocol. For example, when an oracle detects an asset price to be larger than 2% deviation, it will revert the swap to protect against users as well as the protocol's asset base.

While Wombat protocol focuses on being a stableswap protocol, we can still implement price oracles getter functions within the implementation contract for future upgradability or roadmap changes.

> Non-stablecoin but soft-pegged assets can also be introduced to Wombat protocol as long as they are traded in isolation within their aggregate pools.

## Licensing

The primary license for Wombat V1 Core is the Business Source License 1.1 (BUSL-1.1), see [LICENSE](/LICENSE)

### Exceptions

- All files in `contracts/*/interfaces/` are licensed under `GPL-2.0-or-later` (as indicated in their SPDX headers).
- All files in `contracts/*/libraries/` are licensed under `GPL-2.0-or-later` or `MIT` (as indicated in their SPDX headers).
- All files in contracts/test remain unlicensed.

## Helpful Links 🔗

- [Solidity Integers](https://docs.soliditylang.org/en/v0.8.9/types.html#integers)
  - [DS Math](https://github.com/dapphub/ds-math)
  - [OZ SignedSafeMath](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/math/SignedSafeMath.sol)
  - [OZ Safecast](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/math/SafeCast.sol)
- [Hardhat console-log options](https://hardhat.org/hardhat-network/reference/#console-log)
- [Solidity Basic Units](https://docs.soliditylang.org/en/latest/units-and-global-variables.html)
- [Ethers BigNumber](https://docs.ethers.io/v5/api/utils/bignumber/)
- [Visibility for Solidity Functions](https://docs.soliditylang.org/en/v0.8.9/contracts.html#visibility-and-getters)
- [State of Smart Contract Upgrades](https://blog.openzeppelin.com/the-state-of-smart-contract-upgrades/)
- [Proxy Upgrade Pattern](https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies)
  - [Transparent Proxy](https://blog.openzeppelin.com/the-transparent-proxy-pattern/)
  - [UUPS](https://eips.ethereum.org/EIPS/eip-1822)
  - [Transparent vs UUPS Proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#transparent-vs-uups)
- [Solidity by Example](https://solidity-by-example.org/)
- [Chainlink Feed Registry](https://docs.chain.link/docs/feed-registry/)
- [BSC Ecosystem](https://github.com/binance-chain/bsc-ecosystem)
  - [Deploy BSC contracts with Hardhat](https://docs.binance.org/smart-chain/developer/deploy/hardhat.html)
  - [Verify BSC contracts with Hardhat](https://docs.binance.org/smart-chain/developer/deploy/hardhat-verify.html)
- [Token Vesting Contract](https://docs.openzeppelin.com/contracts/2.x/api/drafts#TokenVesting)
