# Wombat Exchange Core
------

This is the repo for serving the core smart contracts of Wombat Exchange 🚀 ✨

## Local Development

Below lists the basic steps in kickstarting your local development 🖥️

*Requires `node@>=14`, visit [node.js](https://nodejs.org/en/) for more details.*

- Run `yarn` to install dependencies
- Run `yarn compile` to compile contracts
- Run `yarn test` to run unit tests


> You may want to run `yarn clean` first if you encounter contract code recompiling issues.


## Deployment

For local hardhat network 🚁

- Run `yarn deploy`

For BSC testnet network:

- *TBD*

## Git Workflow

- Create new branches named `feature/xxx` or `fix/xxx` for new features or bug fixes respectively; they should branch out from the `develop` branch
- If it's a quick fix, branch off master with `hotfix/xxx` and merge into master
- After your new code is completed, go back to `develop` and merge the new branch
- Do not commit to `master` branch directly to maintain a proper workflow

> A simple Github Actions CI workflow is adopted where `linting` and `testing` would be run each time a commit has been pushed.

## High-level System Overview

*TBD*

## Protocol Design 👷‍♂️

Wombat protocol adopts a monolithic smart contract design where a single implementation contract, i.e. `Pool.sol`, inherits multiple contracts for extended functionalities, such as `ownable`, `initializable`, `reentrancy guards`, `pausable`, and `core algorithm` contracts. These inherited contracts provide access-controlled functions, and the ability to `pause` or `upgrade` the implementation contract (*also serves as main entry point of Wombat protocol*) should unexpected events occur after deployment.

Additional peripheral contracts include libraries, such as `DSMath`, and `SignedSafeMath` that provides robust arithmetic operations on integers.

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

> Non-stablecoin assets can also be introduced to Wombat protocol as long as they are traded in isolation within their aggregate accounts. For example, pool account id_1 of aBNB, bBNB, etc. and pool account id_2 of BUSD, BUSD-T, USDC, TUSD, etc. 

## Helpful Links 🔗

* [Solidity Integers](https://docs.soliditylang.org/en/v0.8.9/types.html#integers)
  * [DS Math](https://github.com/dapphub/ds-math)
  * [OZ SignedSafeMath](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/math/SignedSafeMath.sol)
  * [OZ Safecast](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/math/SafeCast.sol)
* [Hardhat console-log options](https://hardhat.org/hardhat-network/reference/#console-log)
* [Solidity Basic Units](https://docs.soliditylang.org/en/latest/units-and-global-variables.html)
* [Ethers BigNumber](https://docs.ethers.io/v5/api/utils/bignumber/)
* [Visibility for Solidity Functions](https://docs.soliditylang.org/en/v0.8.9/contracts.html#visibility-and-getters)
* [State of Smart Contract Upgrades](https://blog.openzeppelin.com/the-state-of-smart-contract-upgrades/)
* [Proxy Upgrade Pattern](https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies)
  * [Transparent Proxy](https://blog.openzeppelin.com/the-transparent-proxy-pattern/)
  * [UUPS](https://eips.ethereum.org/EIPS/eip-1822)
  * [Transparent vs UUPS Proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#transparent-vs-uups)
* [Solidity by Example](https://solidity-by-example.org/)
* [Chainlink Feed Registry](https://docs.chain.link/docs/feed-registry/)
* [BSC Ecosystem](https://github.com/binance-chain/bsc-ecosystem)
  * [Deploy BSC contracts with Hardhat](https://docs.binance.org/smart-chain/developer/deploy/hardhat.html)
  * [Verify BSC contracts with Hardhat](https://docs.binance.org/smart-chain/developer/deploy/hardhat-verify.html)
* [Token Vesting Contract](https://docs.openzeppelin.com/contracts/2.x/api/drafts#TokenVesting)