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
- Note: You may also execute only specific parts of the deployments by running e.g. `hh deploy --network bsc_testnet --tags Bribe` given that you have named the deployment script with `deployFunc.tags = ['Bribe']`

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

  - MasterWombatV3 Proxy => `0x489833311676B566f888119c29bd997Dc6C95830`
  - MasterWombatV2 Proxy => `0xE2C07d20AF0Fb50CAE6cDD615CA44AbaAA31F9c8`
  - VeWom Proxy => `0x3DA62816dD31c56D9CdF22C6771ddb892cB5b0Cc`
  - Voter Proxy => `0x04D4e1C1F3D6539071b6D3849fDaED04d48D563d`
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

- Factory Pool Stables 01

  - Pool Proxy (Main entry) => `0x48f6A8a0158031BaF8ce3e45344518f1e69f2A14`
  - Asset_stables_01_BUSD (LP-BUSD) => `0xcF434949c242C2D32514BA971947bD3700EFB015`
  - Asset_stables_01_FRAX (LP-FRAX) => `0x47aB513f97e1CC7D7d1a4DB4563F1a0fa5C371EB`
  - Asset_stables_01_TUSD (LP-TUSD) => `0x3C8e744f6c4Ed2c9D82e33D69DDcC5961Aa05367`

- BNBx Pool
  - Pool Proxy (Main entry) => `0x8df1126de13bcfef999556899F469d64021adBae`
  - Asset_BnbxPool_BNBx => `0x16B37225889A038FAD42efdED462821224A509A7`
  - Asset_BnbxPool_WBNB => `0x0321D1D769cc1e81Ba21a157992b635363740f86`

- Wombat Dynamic Pool (Deprecated)

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

- qWOM Side Pool (WOM-qWom)

  - Pool Proxy (Main entry) => `0x2c5464b9052319e3d76f8279031f04e4B7fd7955`
  - Asset_qWOMPool_qWOM (LP-qWOM) => `0x87073ba87517E7ca981AaE3636754bCA95C120E4`
  - Asset_qWOMPool_WOM (LP-WOM) => `0xB5c9368545A26b91d5f7340205e5d9559f48Bcf8`

- Wombat Rewarders

  - MultiRewarderPerSec_V3_HAY => `0x7903289B0122f3F4E0fF532D1D8A300D19bFd46f`
  - MultiRewarderPerSec_V3_mWOM => `0x04299f69b567c6C8dC49162138E0ba32cD15ffA4`
  - MultiRewarderPerSec_V3_mWOMPool_WOM => `0x624BE60CC68Dd7Fc2e3f9f28cC7ef58c5bEB1e26`
  - MultiRewarderPerSec_V3_qWOM => `0x06228b709Ed3c8344ae61e64b48204174d2e48B5`
  - MultiRewarderPerSec_V3_qWOMPool_WOM => `0x75Eaa804518a66196946598317Aed57Ef86235Fe`
  - MultiRewarderPerSec_V3_wmxWom => `0x71E41ca23115545682B12900AfC8c5130e03E623`
  - MultiRewarderPerSec_V3_wmxWOMPool_WOM => `0xa12BA2d89a16f57C4b714b03C7951c41c7695502`
  - MultiRewarderPerSec_WBNB => `0x414D1a760320f948147FB71113851BB11CB53976`
  - MultiRewarderPerSec_PSTAKE => `0x946207061de96bfc2a5CD544EA4eC2F7fBE84A98`
  - MultiRewarderPerSec_ANKR => `0x2DC5C0A6b83Dc3B7eC92c4A868a87b464Aa27501`
  - MultiRewarderPerSec_SD => `0x053cd96D5BeB742189E21D9B9112a9195E19435f`
  - MultiRewarderPerSec_BUSD (DEFUNCT) => `0xBD28Fb07c755408ecB81EB8Fcd3e380E4b315f0F`
  - MultiRewarderPerSec_HAY (DEFUNCT) => `0xf812166D8Ff0C90f125b3ad7A59ff9ad6e2BC77D`
  - MultiRewarderPerSec_V2_BUSD (LATEST) => `0x6521a549834F5E6d253CD2e5F4fbe4048f86cd7b`
  - MultiRewarderPerSec_V2_HAY (LATEST) => `0xC9bFC3eFeFe4CF96877009F75a61F5c1937e5d1a`
  - MultiRewarderPerSec_mWOM => `0xd29b3e305cF76e2076c7aACf018fa5D85510Ca01`
  - MultiRewarderPerSec_mWOMPool_WOM => `0x7A8faab51ca17C181F1516Ce46a716e47cc6e38e`
  - MultiRewarderPerSec_qWOM => `0xc7Fbef047e25257043Afc1bB9bC3894a47cFCd6c`
  - MultiRewarderPerSec_qWOMPool_WOM => `0x5D0f17F6385B3C0d1d8Ac4a6CcCacA2A558408e6`

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

- Factory Pool Stables 01

  - Pool Proxy (Main entry) => `0x9817A92bd6B79B64974275730adBEc7462D42E2F`
  - Asset_stables_01_BUSD (LP-BUSD) => `0x3cBcC2a75d54f9746EC18302a1367Bb9eE0C3575`
  - Asset_stables_01_FRAX (LP-FRAX) => `0xAf605D0De1b4654b31b8918587aBc45572e22CEd`
  - Asset_stables_01_TUSD (LP-TUSD) => `0x80050Ff8E1C7284025A3669C30f2CD46b735a7Eb`

- mWOM Side Pool

  - Pool Proxy (Main entry) => `0xd3c8392B86DB591FF95b4B8472C5344f9b237525`
  - Asset_mWOMPool_WOM (LP-BUSD) => `0x704C122E59C8cD20CD89DeB9E00e6f499794dfD4`
  - Asset_mWOMPool_mWOM (LP-BUSD) => `0x505b0159871F86Ae0F4512BB52dB5030E31E2459`

- wmxWOM Side Pool

  - Pool Proxy (Main entry) => `0x46da9508026B45AD44bE42bF5A3ff60f0Ed3CbCB`
  - Asset_wmxWOMPool_WOM (LP-WOM) => `0xF738a9E44be4a595529b61Af180e2027E71c9AE9`
  - Asset_wmxWOMPool_wmxWOM (LP-wmxWOM) => `0x0c53D31de26FB198278db8213D5238f6316c6338`

- qWOM Side Pool

  - Pool Proxy (Main entry) => `0xcCEA75F57044df96a5CBC1dC9BcedA48efa22E1e`
  - Asset_qWOMPool_WOM (LP-WOM) => `0x82e5314DfdA9aD1a7F594B7D0b5D6b13459f4826`
  - Asset_qWOMPool_qWOM (LP-qWOM) => `0x22056C9F7e8033BBea9F32b903a0ECF8a7Ea0bC7`

- Wombat BNBx Dynamic Pool

  - Pool Proxy (Main entry) => `0x7749C4737424bdaA69755e20e46eC53053dfA921`
  - Asset_BnbxPool_WBNB => `0xC0aFB4E0f2A11E2a74F168904F47178865b728ba`
  - Asset_BnbxPool_BNBx => `0xB9207cc7bEaFb74773Cd08C869d6F6f890105564`

- Wombat Governance

  - MasterWombatV2 Proxy => `0x78BAEc04D81fCF87551a8495d87035911a7875C6`
  - MasterWombatV3 Proxy => `0x8C0e9334DBFAC1b9184bC01Ef638BA705cc13EaF`
  - VeWom Proxy => `0x3868B84D4cea3110694d07A2d222418F7B401fE8`
  - Voter Proxy => `0x23c8D0437b74CE912850B89a42F28e4037cA7849`
  - Bribe_BUSD => `0x3aEA5139441318A951e11aB38392c8C75F1a7522`
  - Bribe_FRAX_BUSD => `0xcF7640E12b4aB4F5a4Fe35b231541DF9a83351Ea`

- Wombat Rewarders

  - MultiRewarderPerSec_V3_BUSD `0x175A26Ee230744e3FDcde5a101519a0682410a7F`
  - MultiRewarderPerSec_V3_FRAX `0x6002E1e8B2d532C68e3Fe5caF2eDF527dFd63683`
  - MultiRewarderPerSec_V3_FRAX_BUSD `0xeCfe20544a7CD580CA12DA7390b111898C6f7d1c`
  - MultiRewarderPerSec_V3_qWOM `0x4ad04CfB697604f02c282a9c187dEE05abB23E1c`
  - MultiRewarderPerSec_V3_qWOMPool_WOM `0xdA385297E58A7e7db4D88e3B1e4581B103C6f232`
  - MultiRewarderPerSec_V3_USDC `0xa2644c7EB99DE997516378B269f09C2fce067fd8`
  - MultiRewarderPerSec_V3_wWOM `0x6Ad9E25a49319E316137E938cC74c31F4D0C0fca`

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
