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

### For BSC mainnet network

- Update your private key in `.env` and update your key at `bsc_mainnet` => `accounts` of `hardhat.config.ts`
- Run `yarn deploy_bsc_mainnet` and that's it.
- Note: Token vesting contracts are deployed with respective cliffs on TGE.

Behind the scenes:

- [hardhat-deploy](https://github.com/wighawag/tutorial-hardhat-deploy) is used to help make the whole deployment flow easier and more robust
- deployment configs are set up at `hardhat.config.ts`
- wallet accounts/ api keys are loaded from `secrets.json` (**testnet only**)
- scripts within the `deploy` folder are run in alphabetical order, i.e. 001*, 002*, etc.
- deployed contracts info, e.g. addresses located within the `deployments` folder

Hardhat Verify:

- Follow steps at [Binance Chain Docs](https://docs.binance.org/smart-chain/developer/deploy/hardhat-verify.html) on verifying contracts on bscscan.com such that you can `read/write` directly with your web3 metamask wallet.
- E.g. `npx hardhat verify --network bsc_testnet 0x9cc77B893d40861854fD90Abaf8414a5bD2bEcf8 'Venus USDC' 'vUSDC' '8' 0`

To verify proxy contracts:

- Verify the implementation contract. E.g. `npx hh verify --network bsc_testnet $(jq -r '.address' deployments/bsc_testnet/VeWom_Implementation.json)`.
- Go to bsc explorer in the proxy contract. Click 'More Options' and select 'Is this a proxy?' to enable read and write methods.

### BSC mainnet deployed contracts:

- Wombat Proxy Admin

  - Default Proxy Admin (Proxy Admin) => `0xa75F185888F1E8d2320e80dCd2e7a4c9A17e013B`

- Wombat Governance

  - MasterWombatV2 Proxy => `0xE2C07d20AF0Fb50CAE6cDD615CA44AbaAA31F9c8`
  - VeWom Proxy => `0x3DA62816dD31c56D9CdF22C6771ddb892cB5b0Cc`
  - Whitelist => `0xD61C53dcd6F3b4258E28c7Eb1C328789fa71B591`

- Wombat Token

  - WOM (BEP20) => `0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1`
  - Token Vesting 24M => `0x45a51Af45C370d1F8a0359913c7531D55a687D29`
  - Token Vesting 60M => `0x297622907E5c6C133Df6CCED61aFc03FEF534Fd9`

- Wombat Router

  - WombatRouter => `0x19609B03C976CCA288fbDae5c21d4290e9a4aDD7`

- Wombat Main Pool

  - Pool Proxy (Main entry) => `0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0`
  - Asset_P01_BUSD (LP-BUSD) => `0xF319947eCe3823b790dd87b0A509396fE325745a`
  - Asset_P01_USDC (LP-USDC) => `0xb43Ee2863370a56D3b7743EDCd8407259100b8e2`
  - Asset_P01_USDT (LP-USDT) => `0x4F95fE57BEA74b7F642cF9c097311959B9b988F7`
  - Asset_P01_DAI (LP-DAI) => `0x9D0a463D5dcB82008e86bF506eb048708a15dd84`

- Wombat Side Pool

  - Pool Proxy (Main entry) => `0x0520451B19AD0bb00eD35ef391086A692CFC74B2`
  - Asset_SP01_BUSD (LP-BUSD) => `0xA649Be04619a8F3B3475498E1ac15C90C9661C1A`
  - Asset_SP01_HAY (LP-HAY) => `0x1fa71DF4b344ffa5755726Ea7a9a56fbbEe0D38b`

- Wombat Dynamic Pool

  - Pool Proxy (Main entry) => `0x0029b7e8e9eD8001c868AA09c74A1ac6269D4183`
  - Asset_DP01_WBNB (LP-WBNB) => `0x74f019A5C4eD2C2950Ce16FaD7Af838549092c5b`
  - Asset_DP01_stkBNB (LP-stkBNB) => `0xc496f42eA6Fc72aF434F48469b847A469fe0D17f`
  - Asset_DP01_BNBx (LP-BNBx) => `0x10F7C62f47F19e3cE08fef38f74E3C0bB31FC24f`
  - Asset_DP01_aBNBc (LP-aBNBc) => `0x9d2deaD9547EB65Aa78E239647a0c783f296406B`

  - Wombat Side Pool (WOM-wmxWom)

  - Pool Proxy (Main entry) => `0xeEB5a751E0F5231Fc21c7415c4A4c6764f67ce2e`
  - Asset_wmxWOMPool_wmxWom (LP-wmxWom) => `0x3C42E4F84573aB8c88c8E479b7dC38A7e678D688`
  - Asset_wmxWOMPool_WOM (LP-WOM) => `0xF9BdC872D75f76B946E0770f96851b1f2F653caC`

  - mWOM Side Pool (WOM-mWom)

  - Pool Proxy (Main entry) => `0x083640c5dBD5a8dDc30100FB09B45901e12f9f55`
  - Asset_mWOMPool_mWOM (LP-mWOM) => `0x1f502fF26dB12F8e41B373f36Dc0ABf2D7F6723E`
  - Asset_mWOMPool_WOM (LP-WOM) => `0xEABa290B154aF45DE72FDf2a40E56349e4E68AC2`

- Wombat Rewarders

  - MultiRewarderPerSec_WBNB => `0x414D1a760320f948147FB71113851BB11CB53976`
  - MultiRewarderPerSec_PSTAKE => `0x946207061de96bfc2a5CD544EA4eC2F7fBE84A98`
  - MultiRewarderPerSec_ANKR => `0x2DC5C0A6b83Dc3B7eC92c4A868a87b464Aa27501`
  - MultiRewarderPerSec_SD => `0x053cd96D5BeB742189E21D9B9112a9195E19435f`
  - MultiRewarderPerSec_BUSD => `0xBD28Fb07c755408ecB81EB8Fcd3e380E4b315f0F`
  - MultiRewarderPerSec_HAY => `0xf812166D8Ff0C90f125b3ad7A59ff9ad6e2BC77D`
  - MultiRewarderPerSec_mWOM => `0xd29b3e305cF76e2076c7aACf018fa5D85510Ca01`
  - MultiRewarderPerSec_mWOMPool_WOM => `0x7A8faab51ca17C181F1516Ce46a716e47cc6e38e`

### BSC testnet deployed contracts:

- BSC Wallet Accounts

  - Deployer (owner) => `0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452`
  - User 1 => `0x1d39a90dAC4596b36D60682B6cec147Eb758AF90`
  - User 2 => `0x67F6e6EEB3e61e23Ee765905F5a04a2Bbd0E3a73`

- Wombat Proxy Admin

  - Default Proxy Admin (Proxy Admin) => `0x5961699Bf708A804e5ED528bDAcb9d4bA16c4F6a`

- Wombat Main Pool

  - Pool Proxy (Main entry) => `0x76F3378F13c6e9c5F477d1D9dE2A21151E883D71`
  - Asset V2 (LP-BUSD) => `0xA1a8d6688A2DEF14d6bD3A76E3AA2bdB5670C567`
  - Asset V2 (LP-USDC) => `0x61ABD791773a7E583aD439F558C6c0F157707e7b`
  - Asset V2 (LP-USDT) => `0x2C89105ce90f8C3aE13e01b268eAe57B95e1e5a6`
  - Asset V2 (LP-TUSD) => `0xe52E4510cBff4712e46499ce6e87Ead760542fD5`
  - Asset V2 (LP-DAI) => `0x9f6163070fBCa0a61F49F37e0123fCE3d28B8e21`
  - Asset V2 (LP-vUSDC) => `0x36c99D7D330F37Ac8f22C261242033957fcC6c24`

- Wombat Side Pool

  - Pool Proxy (Main entry) => `0x32997A613FBabE911887e296c27f55d735D55084`
  - Asset_SP01_BUSD (LP-BUSD) => `0x0d3dBc403d121eB53d14E2FE2a98e78CA3E17c44`
  - Asset_SP01_FRAX (LP-FRAX) => `0xc5f2B1df25B9Bfc61444b002121330bEa9460F3e`
  - Asset_SP01_HAY (LP-HAY) => `0xF52289Fd9eAFC94e35868F0D5e23140EBCa03ef4`
  - Asset_SP01_MIM (LP-MIM) => `0x0aF70A8aA5707Fd6407F9a583b69Ce071Ab58FE0`
  - Asset_SP01_TUSD (LP-TUSD) => `0x3F8e976aef5719F18e03aC9A2407Df1d0c601242`

- mWOM Side Pool

  - Pool Proxy (Main entry) => `0xd3c8392B86DB591FF95b4B8472C5344f9b237525`
  - Asset_mWOMPool_WOM (LP-BUSD) => `0xCABA3DA39490673f91303E9E61Ca23288DeBFDa4`
  - Asset_mWOMPool_mWOM (LP-BUSD) => `0x505b0159871F86Ae0F4512BB52dB5030E31E2459`

- wmxWOM Side Pool

  - Pool Proxy (Main entry) => `0x46da9508026B45AD44bE42bF5A3ff60f0Ed3CbCB`
  - Asset_wmxWOMPool_WOM (LP-WOM) => `0xF738a9E44be4a595529b61Af180e2027E71c9AE9`
  - Asset_wmxWOMPool_wmxWOM (LP-wmxWOM) => `0x0c53D31de26FB198278db8213D5238f6316c6338`

- Wombat Dynamic Pool

  - Pool Proxy (Main entry) => `0x37D75fFe7F96D5F74d2b5668B1605CEe17102159`
  - Asset_DP01_WBNB (LP-WBNB) => `0x6F90bD374f39327bc5A8bDdec5d8d26dd2aD9572`
  - Asset_DP01_stkBNB (LP-stkBNB) => `0xa89F99eCE9706e9d6c573b48E54259d84Ab50D95`
  - Asset_DP01_BNBx (LP-BNBx) => `0xbd6767F903003F2f2c7d0ff359F1E8c30817E4C3`
  - Asset_DP01_aBNBc (LP-aBNBc) => `0x2c0c36E3D0d44b45E9cf32F45D59F5b881DBA3bB`

- Wombat Governance

  - MasterWombat V3 Proxy => `0x8C0e9334DBFAC1b9184bC01Ef638BA705cc13EaF`
  - VeWom Proxy => `0xe8AAE244BA2100d4228DBF64070c4458dfBA59cb`
  - Voter Proxy => `0x22521ebB739F2BB28A98fC8e3792B66A75752478`
  - Bribe_BUSD Contract => `0xF38CD9795fE0E6575839C350f318886759Da836c`

- Wombat Token

  - WOM (ERC20) => `0x7BFC90abeEB4138e583bfC46aBC69De34c9ABb8B`
  - Token Vesting => `0x8D1696d63507d59E0bab03801D74F78fA76671D0` (v2)

- Wombat Router

  - WombatRouter => `0xED430B9b729260DA55006A49E06aFc451F958f1E`

- Mock ERC20 Stablecoins

  - BUSD => `0x326335BA4e70cb838Ee55dEB18027A6570E5144d`
  - USDC => `0x254dF1f8A8Fa9B7bFAd9e25bF912ea71484332cE`
  - USDT => `0x6E847Cc3383525Ad33bEDd260139c1e097546B60`
  - DAI => `0x735d905451c0B4ac4BBe5Ab323Cf5D6Ad7e3A030`
  - TUSD => `0xFE9AbD3dC0975f00e5C4ca6B148a992758F6A819`
  - vUSDC => `0x9cc77B893d40861854fD90Abaf8414a5bD2bEcf8`
  - FRAX => `0xa5c67cD016df71f9CDCfd9e76A749a1DDca6209d`
  - HAY => `0x97E0f48247EBad99456389a5C937Ca85975a7e8D`
  - MIM => `0xC82930a91c6fc643608A3626D552AA303DF2eDC7`
  - WBNB => `0x75D3A5080f2904D3c8ECddE08b6F4c33B260055C`
  - mWOM => `0x19DBbA3C11f2f484c6BD0288834Edb0eFd5eD672`
  - wmxWOM => `0x39bbBc689E2Da5D777c57707f4577f7869C751aD`

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
