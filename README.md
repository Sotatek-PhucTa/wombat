# Wombat Exchange Core

---

This is the repo for serving the core smart contracts of Wombat Exchange 🚀 ✨

## Local Development

Below lists the basic steps in kickstarting your local development 🖥️

_Requires `node@>=18`, visit [node.js](https://nodejs.org/en/) for more details._

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

#### Wombat Governance
  - Default Proxy Admin (Proxy Admin) => `0xa75F185888F1E8d2320e80dCd2e7a4c9A17e013B`
  - MasterWombatV3 Proxy => `0x489833311676B566f888119c29bd997Dc6C95830`
  - MasterWombatV2 Proxy => `0xE2C07d20AF0Fb50CAE6cDD615CA44AbaAA31F9c8`
  - VeWom Proxy => `0x3DA62816dD31c56D9CdF22C6771ddb892cB5b0Cc`
  - Voter Proxy => `0x04D4e1C1F3D6539071b6D3849fDaED04d48D563d`
  - Whitelist => `0xD61C53dcd6F3b4258E28c7Eb1C328789fa71B591`
  - TimelockController => `0x9f3F1e89831391214fAA57ee7e27667156140655`

#### Wombat Token
  - WOM (BEP20) => `0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1`
  - Token Vesting 24M => `0x45a51Af45C370d1F8a0359913c7531D55a687D29`
  - Token Vesting 60M => `0x297622907E5c6C133Df6CCED61aFc03FEF534Fd9`

#### Wombat Router
  - WombatRouter => `0x19609B03C976CCA288fbDae5c21d4290e9a4aDD7`

#### Wombat Main Pool
  - Pool Proxy (Main entry) => `0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0`
  - Asset_MainPool_BUSD (LP-BUSD) => `0xF319947eCe3823b790dd87b0A509396fE325745a`
  - Asset_MainPool_USDC (LP-USDC) => `0xb43Ee2863370a56D3b7743EDCd8407259100b8e2`
  - Asset_MainPool_USDT (LP-USDT) => `0x4F95fE57BEA74b7F642cF9c097311959B9b988F7`
  - Asset_MainPool_DAI (LP-DAI) => `0x9D0a463D5dcB82008e86bF506eb048708a15dd84`

#### Standalone Pool (for removed assets)
  - FactoryPools_StandalonePool_Proxy => `0x6569DDC1Cc2648c89BC8025046A7dd65EB8940F3`
  - Asset_SidePool_01_BUSD (LP-BUSD) => `0xA649Be04619a8F3B3475498E1ac15C90C9661C1A`
  - Asset_stables_01_TUSD (LP-TUSD) => `0x3C8e744f6c4Ed2c9D82e33D69DDcC5961Aa05367`
  - Asset_frxETH_Pool_WETH (deprecated) => `0xb268c3181921747379271B9BFfCE8B16311656e3`
  - Asset_HAY_Pool_HAY (LP-HAY) => `0xa393D61fE1532257B69b753aF7d1EfB0e22f1A6E`

#### Factory Pool Stables 01
  - Pool Proxy (Main entry) => `0x48f6A8a0158031BaF8ce3e45344518f1e69f2A14`
  - Asset_stables_01_BUSD (LP-BUSD) => `0xcF434949c242C2D32514BA971947bD3700EFB015`
  - Asset_stables_01_FRAX (LP-FRAX) => `0x47aB513f97e1CC7D7d1a4DB4563F1a0fa5C371EB`
  - Bribe_frax => `0x966c3729366294829911A2fc651DD88378E71C01`
  - MultiRewarderPerSec_V3_Asset_stables_01_FRAX => `0x1f770175649236eF45d8Fe029949EC9119EFBD3d`

#### iUSD Pool
  - Pool Proxy (Main entry) => `0x277E777F7687239B092c8845D4d2cd083a33C903`
  - Asset_IUSDPool_iUSD (LP-iUSD) => `0x3A29dF144bB54A8bF3d20357c116befa7adE962d`
  - Asset_IUSDPool_BUSD (LP-BUSD) => `0x7Ff1AEc17ea060BBcB7dF6b8723F6Ea7fc905E8F`
  - Bribe_IUSDPool_iUSD => `0xF80722121949C4Ae1047D9A3e26D25b71D8de4D2`
  - Bribe_IUSDPool_BUSD => `0xBD4420e06E39E55ea3e6DE4f3D5b43eb3bEC77de`

#### CUSD Pool (Deprecated)
  - Pool Proxy (Main entry) => `0x4dFa92842d05a790252A7f374323b9C86D7b7E12`

#### axlUSDC Pool
  - Pool Proxy (Main entry) => `0x8ad47d7ab304272322513eE63665906b64a49dA2`
  - Asset_AxlUsdcPool_axlUSDC (LP-axlUSDC) => `0x77F645Ee0c6d47380A942B04B8151fD542927391`
  - Asset_AxlUsdcPool_BUSD (LP-BUSD) => `0x791b2424df9865994Ad570425278902E2B5D7946`
  - Bribe_AxlUsdcPool_axlUSDC => `0x27306b37d3C20F8B5297D20715ab173ad47ece80`
  - Bribe_AxlUsdcPool_BUSD => `0x3F9Ec209eBAe56e1401cBa4e064f97a9127E61C8`

#### USDD Pool
  - Pool Proxy (Main entry) => `0x05f727876d7C123B9Bb41507251E2Afd81EAD09A`
  - Asset_USDDPool_USDD (LP-USDD) => `0x24a70c1489d521F5e2D2612474630eFe7C2ba073`
  - Asset_USDDPool_USDC (LP-USDC) => `0x9F9CeA30d242d7f5527Fa900f9fb0F77A98FdA82`

#### BOB Pool
  - Pool Proxy (Main entry) => `0xeA6cDd9e8819BbF7f8791E7D084d9F0a6Afa7892`
  - Asset_BOB_Pool_BOB (LP-BOB) => `0x4968E21be7Bb0ced1bd3859d3dB993ad3a05d2E6`
  - Asset_BOB_Pool_USDC (LP-USDC) => `0x6b98d2B6ed0131338C7945Db8588DA43323d1b8C`
  - Bribe_BOBPool_BOB => `0xbeFB02dC4863Bd4B2803c32d75CA5DfeFa6f6091`
  - Bribe_BOBPool_USDC => `0x25157762a68FA8061fa800Ee3b53C593967A5c9b`

#### BNBx Pool
  - Pool Proxy (Main entry) => `0x8df1126de13bcfef999556899F469d64021adBae`
  - Asset_BnbxPool_BNBx => `0x16B37225889A038FAD42efdED462821224A509A7`
  - Asset_BnbxPool_WBNB => `0x0321D1D769cc1e81Ba21a157992b635363740f86`
  - Bribe_BNBx => `0x20d7B9Ed2c4E2DCC55F9B463975b21bBf2A6eCd1`
  - Bribe_BnbxPool_WBNB => `0x40841197A2ac1fb7d21d4eb9577e6529bd9892a1`

#### stkBNB Pool
  - Pool Proxy (Main entry) => `0xB0219A90EF6A24a237bC038f7B7a6eAc5e01edB0`
  - Asset_StkBnbPool_stkBNB => `0x0E202A0bCad2712d1fdeEB94Ec98C58bEeD0679f`
  - Asset_StkBnbPool_WBNB => `0x6C7B407411b3DB90DfA25DA4aA66605438D378CE`
  - Bribe_StkBnb => `0xC4992f30b4F0398718FE945FFF9f0C273d74afAF`
  - Bribe_StkBnbPool_WBNB => `0x60ACa4Fd79BA7855771F78fC255539464252e1BD`

#### frxETH Pool
  - Pool Proxy (Main entry) => `0x2Ea772346486972E7690219c190dAdDa40Ac5dA4`
  - Asset_frxETH_Pool_frxETH => `0xd67EdEA100AdC2Aa8ae0b5CEe7bF420ee17E5bB9`
  - Asset_frxETH_Pool_ETH => `0x4d41E9EDe1783b85756D3f5Bd136C50c4Fb8E67E`
  - Asset_frxETH_Pool_sfrxETH => `0xa9a08133af8241e36193b57E4dFE43D147Cd23cC`
  - PriceFeed_GovernedPriceFeed_Asset_frxETH_Pool_sfrxETH => `0xDD29f25A64eb824E1FF37948FD2485D9E073fA01`
  - Bribe_Asset_frxETH_Pool_frxETH => `0xDfba6A2A516AB5d46f60fE61E023C8B371b20f1D`
  - Bribe_Asset_frxETH_Pool_WETH (deprecated) => `0x18022e971e47575BEB749C8ee675e7b7F4229c51`
  - Bribe_Asset_frxETH_Pool_ETH => `0x015542b048C4711c52791346247187B5CcbecE5e`
  - Bribe_Asset_frxETH_Pool_sfrxETH => `0xab7700961aa1adc72a2b32c396eCa4F9ec3aB145`
  - MultiRewarderPerSec_V3_frxETH_Pool_ETH => `0x1cBb0f9ce44F024B47E5f7c07D72F6044DEf4497`
  - MultiRewarderPerSec_V3_Asset_frxETH_Pool_frxETH => `0x44B597258b4bf87762F22C99b3D9a6E3fA7068E4`
  - MultiRewarderPerSec_V3_Asset_frxETH_Pool_sfrxETH => `0x5Ab8f02aca0ed53A1aad6150F19048F539c6A62d`

#### Wombat Dynamic Pool (Deprecated)
  - Pool Proxy (Main entry) => `0x0029b7e8e9eD8001c868AA09c74A1ac6269D4183`
  - Asset_DP01_WBNB (LP-WBNB) => `0x74f019A5C4eD2C2950Ce16FaD7Af838549092c5b`
  - Asset_DP01_stkBNB (LP-stkBNB) => `0xc496f42eA6Fc72aF434F48469b847A469fe0D17f`
  - Asset_DP01_BNBx (LP-BNBx) => `0x10F7C62f47F19e3cE08fef38f74E3C0bB31FC24f`
  - Asset_DP01_aBNBc (LP-aBNBc) => `0x9d2deaD9547EB65Aa78E239647a0c783f296406B`

#### Wombat Side Pool (WOM-wmxWom)
  - Pool Proxy (Main entry) => `0xeEB5a751E0F5231Fc21c7415c4A4c6764f67ce2e`
  - Asset_wmxWOMPool_wmxWOM (LP-wmxWom) => `0x3C42E4F84573aB8c88c8E479b7dC38A7e678D688`
  - Asset_wmxWOMPool_WOM (LP-WOM) => `0xF9BdC872D75f76B946E0770f96851b1f2F653caC`
  - Bribe_wmxWom => `0x08401FDb51D7C53e5A1Ee22186f030354B8880eD`
  - Bribe_wmxWOMPool_WOM => `0xE2a60C52C4abB9fbc3f711da3cb9E633269DBC67`
  - MultiRewarderPerSec_V3_Asset_wmxWOMPool_WOM => `0x83BC718359D5C950618b4E85e1237c42C67d20f8`
  - MultiRewarderPerSec_V3_Asset_wmxWOMPool_wmxWom => `0xB06B2eec4439f0e057D540845d033998DF1828b2`

#### mWOM Side Pool (WOM-mWom)
  - Pool Proxy (Main entry) => `0x083640c5dBD5a8dDc30100FB09B45901e12f9f55`
  - Asset_mWOMPool_mWOM (LP-mWOM) => `0x1f502fF26dB12F8e41B373f36Dc0ABf2D7F6723E`
  - Asset_mWOMPool_WOM (LP-WOM) => `0xEABa290B154aF45DE72FDf2a40E56349e4E68AC2`
  - Bribe_mWOM => `0x7DC7E908427ab2C737A827cDc8069fF002489649`
  - Bribe_mWOMPool_WOM => `0x5E5dCBa266AB4c999889421C001b93b899d3092a`
  - MultiRewarderPerSec_V3_Asset_mWOMPool_WOM => `0xc4B2F992496376C6127e73F1211450322E580668`
  - MultiRewarderPerSec_V3_Asset_mWOMPool_mWOM => `0xEfdEC25602Ee8358278f3f5cFa0230C4bDD5fC5F`

#### qWOM Side Pool (WOM-qWom)
  - Pool Proxy (Main entry) => `0x2c5464b9052319e3d76f8279031f04e4B7fd7955`
  - Asset_qWOMPool_qWOM (LP-qWOM) => `0x87073ba87517E7ca981AaE3636754bCA95C120E4`
  - Asset_qWOMPool_WOM (LP-WOM) => `0xB5c9368545A26b91d5f7340205e5d9559f48Bcf8`
  - Bribe_qWOM => `0x7F95D391e5F1A4B0a265e40Bf588739BEa2202c4`
  - Bribe_qWOMPool_WOM => `0xcf2e56E086fcD21eaB3614A5A78c8Ae27c2F0536`
  - MultiRewarderPerSec_V3_Asset_qWOMPool_WOM => `0xA2Ccca1D89D5d4098265CEf9674D65Cb9B642d96`
  - MultiRewarderPerSec_V3_Asset_qWOMPool_qWOM => `0x5f027adF7eFFB310297fF78e2FB73D2B9626653c`

#### MIM Pool
  - Pool Proxy (Main entry) => `0xb8b1b72a9b9BA90E2539348fEC1Ad6b265F9F684`
  - Asset_MIM_Pool_MIM (LP-MIM) => `0xA45C0ABeef67C363364E0e73832df9986aBa3800`
  - Asset_MIM_Pool_USDT (LP-USDT) => `0x61e338828ABBdD7bddAd918BB3Cd1F09d4345752`
  - Bribe_Asset_MIM_Pool_MIM => `0x09Da8826fdC3c5211A9B128d1f4Fb61CE86705f9`
  - Bribe_Asset_MIM_Pool_USDT => `0xACEB589012edbBEe4CE7b4E89B916700B43419CA`

#### Mixed Pool
  - Pool Proxy (Main entry) => `0x9498563e47D7CFdFa22B818bb8112781036c201C`
  - Asset_Mixed_Pool_USD+ (LP-USD+) => `0x88bEb144352BD3109c79076202Fac2bcEAb87117`
  - Asset_Mixed_Pool_USDT+ (LP-USDT+) => `0xbd459E33307A4ae92fFFCb45C6893084CFC273B1`
  - Asset_Mixed_Pool_USDC (LP-USDC) => `0x8Df8b50B73849f0433EE3314BD956e624e67b3ce`
  - Asset_Mixed_Pool_FRAX => `0x6b60066966080deaB5090d6026CB134591a1cC95`
  - Asset_Mixed_Pool_CUSD (LP-CUSD) => `0x3ac762C607ed6Dba156cBcF11efF96340e86b490`
  - Asset_Mixed_Pool_HAY (LP-HAY) => `0xa6eF6C45EbFDBc13f6D032fbDFeC9b389C1603E5`
  - Bribe_Asset_Mixed_Pool_USD+ => `0xd66fE42C6Eb5471a7483354Cf9476bBFEa2e717D`
  - Bribe_Asset_Mixed_Pool_USDT+ => `0x6aA55c9E51Cb2cC39A50f872607d76dc6910e046`
  - Bribe_Asset_Mixed_Pool_USDC => `0x92e8B58ef7E68A4cb44910390fc85a33B1870dcB`
  - Bribe_Asset_Mixed_Pool_FRAX => `0x810287C8809225b632dE790C0935D30003c67e4a`
  - Bribe_Asset_Mixed_Pool_CUSD => `0x52Eb70A364FE86B8286a5E076Be6c8f816B2E3D9`
  - Bribe_Asset_Mixed_Pool_HAY => `0x861C5005754f26ab955899721b531B3922fE2320`
  - MultiRewarderPerSec_V3_Asset_Mixed_Pool_FRAX => `0xf3acb264090f7CeC38b88Af7071a36a718D80B14`
  - MultiRewarderPerSec_V3_Asset_Mixed_Pool_CUSD => `0x9d4816D27Da9421f52A7D62E82CE7F2415F88BA2`

#### AnkrBNB Pool
  - Pool Proxy (DynamicPoolV2) => `0x6F1c689235580341562cdc3304E923cC8fad5bFa`
  - Asset_AnkrBNBPool_WBNB => `0x0e99fBfD04c255124A168c6Ae68CcE3c7dCC5760`
  - Asset_AnkrBNBPool_ankrBNB => `0xB6D83F199b361403BDa2c44712a77F55E7f8855f`
  - Bribe_Asset_AnkrBNBPool_WBNB => `0x048DC3bA13406bCC8226CE62385261894F118047`
  - Bribe_Asset_AnkrBNBPool_ankrBNB => `0x32816B1d037F6b058D3b5c76EEe497F769376DBb`

#### BNBy Pool
  - Pool Proxy (DynamicPoolV2) => `0xbed9B758A681d73a95Ab4c01309C63aa16297b80`
  - Asset_BNBy_Pool_WBNB => `0x5A65Cb65C601A396e79Ff9e03650Bdc97Ed2dE8B`
  - Asset_BNBy_Pool_BNBy => `0x5d64eD5f5121d0A3452ad36D8aeFA554D4060F4a`
  - Bribe_Asset_BNBy_Pool_WBNB => `0x8779D3887b029F4005a4C5B6aDBC6589bEA301b1`
  - Bribe_Asset_BNBy_Pool_BNBy => `0xc007e84D995e49f68AEA51D7f6E3aDD21b73676f`
  - MultiRewarderPerSec_V3_Asset_BNBy_Pool_WBNB => `0x36D775d270cc4ABD392cC5C6db12D0A7E0f2e47F`
  - MultiRewarderPerSec_V3_Asset_BNBy_Pool_BNBy => `0x2e14E0b0df067c2882205F2781b02d4d6Dd7E3BC`

#### wBETH Pool
  - DynamicPools_wBETH_Pool_Proxy => `0x8b892b6Ea1d0e5B29b719d6Bd6eb9354f1cDE060`
  - Asset_wBETH_Pool_wBETH => `0x975693AFe5bb69088a716E3A7f9BFF77ec51D57F`
  - Asset_wBETH_Pool_ETH => `0x4447DE210475BFa08e5D42271A73D7624c8a5aC6`
  - Bribe_Asset_wBETH_Pool_wBETH => `0x2c0D2B8379ff694E47a52AfBd4Fe8F5A14207d86`
  - Bribe_Asset_wBETH_Pool_ETH => `0xe237531dD203796145B13919B7EBB57886A0c1cB`
  - MultiRewarderPerSec_V3_Asset_wBETH_Pool_wBETH => `0x1E9C11B40802488e676450bBB86a7ba92023eA23`
  - MultiRewarderPerSec_V3_Asset_wBETH_Pool_ETH => `0x54ED8B35E800bD2D85F2529CEF4592f1c8b37610`

#### ankrETH Pool
  - DynamicPools_ankrETH_Pool_Proxy => `0x1b507b97c89eDE3E40d1b2Ed92972197c6276D35`
  - Asset_ankrETH_Pool_ETH => `0x90F6F0e11EF071aeCdBbCA5Ef01c2d630f2B5201`
  - Asset_ankrETH_Pool_ankrETH => `0x128FA2c0708Bd0e357Cd97EadAAfa3bc9608228b`
  - Bribe_Asset_ankrETH_Pool_ETH => `0xc7a6bA5F28993BaDb566007bD2E0CB253c431974`
  - Bribe_Asset_ankrETH_Pool_ankrETH => `0x8Dc7B0a98fC1A70e07cb2efEe6e339Bf9FE87B47`

#### SnBNB Pool
  - SnBNB_Pool_Proxy => `0xF1e604e9A31c3b575f91CF008445B7ce06BF3fef`
  - Asset_SnBNB_Pool_SnBNB => `0xaA0811AfF60Fbe2d7D7D0A18F26e584b8C148Ee8`
  - Asset_SnBNB_Pool_WBNB => `0x5d38a3B0f04F6C6026c24FFa78CcDf421F91df38`

#### Smart HAY Pool
  - Pool Proxy (Main entry) => `0x0520451B19AD0bb00eD35ef391086A692CFC74B2`
  - Asset_SidePool_01_HAY (LP-HAY) => `0x1fa71DF4b344ffa5755726Ea7a9a56fbbEe0D38b`
  - Asset_HAY_Pool_USDC => `0x681124f5BDD9aCDA19d1721063254189903CD685`
  - Asset_HAY_Pool_USDT => `0x184EB7DDE8c00fad900120235b534AABc1d96F75`
  - Bribe_HAY => `0x6dD7116B2640f4FA7a2AAD3fA6a6126bFA782B0B`
  - Bribe_Asset_HAY_Pool_HAY => `0xD8e4FD44F43C46427338A9b8c946E7D57AF22c10`
  - Bribe_Asset_HAY_Pool_USDC => `0x8E926C7792635362ACf425DcB3dCb2bf42167826`
  - Bribe_Asset_HAY_Pool_USDT => `0xD80356F64c0693BAd4844250527B144cDf382915`

#### HAY Pool (deprecated)
  - HAY_Pool_Proxy (removed) => `0xa61dccC6c6E34C8Fbf14527386cA35589e9b8C27`

#### Wombat Rewarders
  - MultiRewarderPerSec_V3_HAY (deprecated) => `0x7903289B0122f3F4E0fF532D1D8A300D19bFd46f`
  - MultiRewarderPerSec_V3_mWOM (deprecated) => `0x04299f69b567c6C8dC49162138E0ba32cD15ffA4`
  - MultiRewarderPerSec_V3_mWOMPool_WOM (deprecated) => `0x624BE60CC68Dd7Fc2e3f9f28cC7ef58c5bEB1e26`
  - MultiRewarderPerSec_V3_qWOM (deprecated) => `0x06228b709Ed3c8344ae61e64b48204174d2e48B5`
  - MultiRewarderPerSec_V3_qWOMPool_WOM (deprecated) => `0x75Eaa804518a66196946598317Aed57Ef86235Fe`
  - MultiRewarderPerSec_V3_wmxWom (deprecated) => `0x71E41ca23115545682B12900AfC8c5130e03E623`
  - MultiRewarderPerSec_V3_wmxWOMPool_WOM (deprecated) => `0xa12BA2d89a16f57C4b714b03C7951c41c7695502`
  - MultiRewarderPerSec_WBNB (deprecated) => `0x414D1a760320f948147FB71113851BB11CB53976`
  - MultiRewarderPerSec_PSTAKE (deprecated) => `0x946207061de96bfc2a5CD544EA4eC2F7fBE84A98`
  - MultiRewarderPerSec_ANKR (deprecated) => `0x2DC5C0A6b83Dc3B7eC92c4A868a87b464Aa27501`
  - MultiRewarderPerSec_SD (deprecated) => `0x053cd96D5BeB742189E21D9B9112a9195E19435f`
  - MultiRewarderPerSec_BUSD (DEFUNCT) => `0xBD28Fb07c755408ecB81EB8Fcd3e380E4b315f0F`
  - MultiRewarderPerSec_HAY (DEFUNCT) => `0xf812166D8Ff0C90f125b3ad7A59ff9ad6e2BC77D`
  - MultiRewarderPerSec_V2_BUSD (LATEST) => `0x6521a549834F5E6d253CD2e5F4fbe4048f86cd7b`
  - MultiRewarderPerSec_V2_HAY (LATEST) => `0xC9bFC3eFeFe4CF96877009F75a61F5c1937e5d1a`
  - MultiRewarderPerSec_mWOM (deprecated) => `0xd29b3e305cF76e2076c7aACf018fa5D85510Ca01`
  - MultiRewarderPerSec_mWOMPool_WOM (deprecated) => `0x7A8faab51ca17C181F1516Ce46a716e47cc6e38e`
  - MultiRewarderPerSec_qWOM (deprecated) => `0xc7Fbef047e25257043Afc1bB9bC3894a47cFCd6c`
  - MultiRewarderPerSec_qWOMPool_WOM (deprecated) => `0x5D0f17F6385B3C0d1d8Ac4a6CcCacA2A558408e6`
  - MultiRewarderPerSec_V3_BNBx (deprecated) => `0xe4fD5D5C4D058c2323a35FbB720897EEeB6C76Bd`
  - MultiRewarderPerSec_V3_BnbxPool_WBNB (deprecated) => `0xFbc083ed7655F68baF0f2039431Ea09c3635176D`
  - MultiRewarderPerSec_V3_stkBnb (deprecated) => `0x28edda710ef4E72bf1389e2ff7d50Ccfa75f95Af`
  - MultiRewarderPerSec_V3_StkBnbPool_WBNB (deprecated) => `0x7Db1B59747430b0F5946e8Cd525CFc41bfD3A1C1`

### Arbitrum mainnet deployed contracts:

#### Wombat Governance
  - Default Proxy Admin (Proxy Admin) => `0x2722FE570Fa9f7fEE1662dEee01F5d76003dE182`
  - Wombat Token => `0x7b5eb3940021ec0e8e463d5dbb4b7b09a89ddf96`
  - WombatRouter => `0xc4B2F992496376C6127e73F1211450322E580668`
  - MasterWombatV3 Proxy => `0x62A83C6791A3d7950D823BB71a38e47252b6b6F4`
  - VeWom Proxy => `0x488B34F704a601DAeEf14135146a3dA79F2d3EFC`
  - Voter Proxy => `0x3f90a5a47364c0467031fB00246192d40E3D2D9D`
  - Whitelist => `0x9A65781bFff8E43E4345D6B1b5157B2657F2735D`

#### Main Pool
  - Pool Proxy (HighCovRatioFeePoolV2) => `0xc6bc781E20f9323012F6e422bdf552Ff06bA6CD1`
  - Asset_MainPool_USDCe (LP-USDCe) => `0x2977b0B54a76c2b56D32cef19f8ea83Cc766cFD9`
  - Asset_MainPool_USDC (LP-USDC) => `0xE5232c2837204ee66952f365f104C09140FB2E43`
  - Asset_MainPool_USDT (LP-USDT) => `0x85cEBD962861be410a777755dFa06914de6af003`
  - Asset_MainPool_DAI (LP-DAI) => `0x0Fa7b744F18D8E8c3D61B64b110F25CC27E73055`

#### USD+ Pool
  - Pool Proxy (HighCovRatioFeePoolV2) => `0xCF20fDA54e37f3fB456930f02fb07FccF49e4849`
  - Asset_USDPlus_Pool_USD+ (LP-USD+) => `0xBd7568d25338940ba212e3F299D2cCC138fA35F0`
  - Asset_USDPlus_Pool_DAI+ (LP-DAI+) => `0x51E073D92b0c226F7B0065909440b18A85769606`
  - Asset_USDPlus_Pool_USDCe (LP-USDCe) => `0x6ADd078996308547C57B052549a19c5f66BF42C8`
  - Bribe_Asset_USDPlus_Pool_USD+ => `0x8cd967EA785E5C947559C58DD8A8c572EA6980DE`
  - Bribe_Asset_USDPlus_Pool_DAI+ => `0x8b892b6Ea1d0e5B29b719d6Bd6eb9354f1cDE060`
  - Bribe_Asset_USDPlus_Pool_USDCe => `0x1edFA9c9Ae18ccC4525c20F698a13D464515Bf03`
  - MultiRewarderPerSec_V3_Asset_USDPlus_Pool_USDCe => `0x72b46b8bfF10B0A48d97C47Ed53d03Ca9EeCB2Ef`

#### MIM Pool
  - Pool Proxy (HighCovRatioFeePoolV2) => `0x29eeB257a2A6eCDE2984aCeDF80A1B687f18eC91`
  - Asset_MIM_Pool_MIM (LP-MIM) => `0x7A8ce23c361a6A93AD8f443a31b20a8617d1A59a`
  - Asset_MIM_Pool_USDT (LP-USDT) => `0x4552E884da00BacEB30D86458460C24957e65C1F`
  - Bribe_Asset_MIM_Pool_MIM => `0xD58d5E0bB8E669d9F9127CaBb39bAF309aB163BA`
  - Bribe_Asset_MIM_Pool_USDT => `0xDC82b78423fB816a5fAA4357AF21cFd8Fa419D5f`

#### BOB Pool
  - Pool Proxy (HighCovRatioFeePoolV2) => `0x917caF2b4D6040a9D67A5F8CEfC4F89d1b214c1A`
  - Asset_BOB_Pool_BOB (LP-BOB) => `0x06228b709Ed3c8344ae61e64b48204174d2e48B5`
  - Asset_USDC_Pool_USDCe (LP-USDCe) => `0x75Eaa804518a66196946598317Aed57Ef86235Fe`
  - Bribe_Asset_BOB_Pool_BOB => `0xe933e227315FeA19A4130F65EFfF7A12F50f762E`
  - Bribe_Asset_BOB_Pool_USDCe => `0xA1fdb8D04C2950D163017B990230bD1784692979`

#### mWom Pool
  - Pool Proxy (HighCovRatioFeePoolV2) => `0x90eCddEC4E4116E30769A4e1EA52c319aca338B6`
  - Asset_mWOM_Pool_mWOM (LP-mWOM) => `0xDdDC78F940E012CfC1Ad04DE2Ca089eb94900145`
  - Asset_mWOM_Pool_WOM (LP-WOM) => `0x59d8DCA660b71Ba97a16f781A40809a0fC350769`
  - Bribe_Asset_mWOM_Pool_mWOM => `0x259ccd824d4162f41D8BB52e56B15445a21a33Ee`
  - Bribe_Asset_mWOM_Pool_WOM => `0x096f99AF43B96e87659668A5f9397FeC724D7B24`
  - MultiRewarderPerSec_V3_Asset_mWOM_Pool_WOM => `0xF01d86db93674E37d90A702499f962Aa505ff081`
  - MultiRewarderPerSec_V3_Asset_mWOM_Pool_mWOM => `0xf9cDC1cc73bA10eCC138948E140aF64F958CFCF6`

#### wmxWom Pool
  - Pool Proxy (HighCovRatioFeePoolV2) => `0xEE9b42b40852a53c7361F527e638B485D49750cD`
  - Asset_wmxWOM_Pool_wmxWOM (LP-wmxWOM) => `0xB9e272ff4BfEf5D18d83bc63b845E83e9df5612B`
  - Asset_wmxWOM_Pool_WOM (LP-WOM) => `0xB1Ad5C2573867E8157deD08d065fc761d606C3D9`
  - Bribe_Asset_wmxWOM_Pool_wmxWOM => `0x3324303607b0Fbc2f59E045612eE34C08C7AE41e`
  - Bribe_Asset_wmxWOM_Pool_WOM => `0x6f70C8832a8661113b935453835f20b0C46ae695`
  - MultiRewarderPerSec_V3_Asset_wmxWOM_Pool_WOM => `0x6569DDC1Cc2648c89BC8025046A7dd65EB8940F3`
  - MultiRewarderPerSec_V3_Asset_wmxWOM_Pool_wmxWOM => `0xeB87bF23030F2390E8822249e962cdfBFC8Bc480`

#### qWom Pool
  - Pool Proxy (HighCovRatioFeePoolV2) => `0x12Fa5AB079CFf564d599466d39715D35d90Af978`
  - Asset_qWOM_Pool_qWOM => `0xeF9187a5f03b988326a79eBd21569A2319DF2486`
  - Asset_qWOM_Pool_WOM => `0x6B7C9dB425951543aA556b984869C50e6a18C7B2`
  - Bribe_Asset_qWOM_Pool_qWOM => `0x5A65Cb65C601A396e79Ff9e03650Bdc97Ed2dE8B`
  - Bribe_Asset_qWOM_Pool_WOM => `0x38169243f4743De770B64acd987d89E8BD58B54C`
  - MultiRewarderPerSec_V3_Asset_qWOM_Pool_qWOM => `0x6001f4726F11155533630cb9936436CdB7631bb9`
  - MultiRewarderPerSec_V3_Asset_qWOM_Pool_WOM => `0xF1dB5B1f92dbe4A34B9FC0CF629E6b013d7dE18d`

#### frxETH Pool
  - Pool Proxy (DynamicPoolV2) => `0x20D7ee728900848752FA280fAD51aF40c47302f1`
  - Asset_frxETH_Pool_frxETH (LP-frxETH) => `0x6966553568634F4225330D559a8783DE7649C7D3`
  - Asset_frxETH_Pool_WETH (LP-WETH) => `0xe62880CC6872c9E9Fb1DDd73f400850fdaBE798D`
  - Asset_frxETH_Pool_sfrxETH => `0x2a20202A6F740200BA188F6D72fa72a08a346Aaa`
  - PriceFeed_GovernedPriceFeed_Asset_frxETH_Pool_sfrxETH => `0x1d15c46e75CC006490c356D29FF357a647918797`
  - Bribe_Asset_frxETH_Pool_frxETH => `0x96412caB79c3A4c5cACD8b6fbFbEa36F4cA3791a`
  - Bribe_Asset_frxETH_Pool_WETH => `0x4f7f9B195eAE3Bd3D933fA9708c9B7ADbFb52ac2`
  - Bribe_Asset_frxETH_Pool_sfrxETH => `0x765fDA4B8f57587B9A6d525b81a2130679075543`

#### FRAX Pool
  - Pool Proxy (HighCovRatioFeePoolV2) => `0x4a8686df475D4c44324210FFA3Fc1DEA705296e0`
  - Asset_FRAX_Pool_FRAX => `0xf4B72e9a18E4b7C65165E437c57ff6b6202E4505`
  - Asset_FRAX_Pool_MAI => `0x51880CEE87bF2F5ffb1AbC84E20889771b025D0A`
  - Asset_FRAX_Pool_USD+ => `0xF9C2356a21B60c0c4DDF2397f828dd158f82a274`
  - Asset_FRAX_Pool_USDCe => `0x502a88FFCeb9363BEFD1B1c78265FC3ac8ABd3a2`
  - Bribe_Asset_FRAX_Pool_FRAX => `0xe3c747896C76aEE3f4c18F34A36eE58b425B8E17`
  - Bribe_Asset_FRAX_Pool_MAI => `0x7b604147a84b5968815347c1D73fCDA2235b7C64`
  - Bribe_Asset_FRAX_Pool_USD+ => `0x5Fb5225FeA83440B8f764639D9b6309E56562F54`
  - MultiRewarderPerSec_V3_Asset_FRAX_Pool_USDCe => `0xa9a08133af8241e36193b57E4dFE43D147Cd23cC`

#### jUSDC Pool
  - Pool Proxy (DynamicV2) => ` 0xc7a6bA5F28993BaDb566007bD2E0CB253c431974`
  - Asset_jUSDC_Pool_jUSDC => ` 0xde509fE1555ab907E5C29f987ba0BE1AC0626dAe`
  - Asset_jUSDC_Pool_USDCe => ` 0x4688300D46eF400C3506a165d5bDCa6A51350978`
  - Bribe_Asset_jUSDC_Pool_jUSDC => ` 0xF760094A46bC456a1e3fd0A00ccf98108f9B35D0`
  - Bribe_Asset_jUSDC_Pool_USDCe => ` 0x19f477e5864Fec9Cc8f91Fd9F6eD71F6ce13d3b3`

#### ankrETH Pool
  - DynamicPools_ankrETH_Pool_Proxy => `0xB9bdfE449Da096256Fe7954Ef61A18eE195Db77B`
  - Asset_ankrETH_Pool_ankrETH => `0x2290281060F2cE6BB73DcCF9b1735bC366f3f2C4`
  - Asset_ankrETH_Pool_WETH => `0x35c462B3396359CAe6c5b40c24e0859B1f1Bc6aC`
  - Bribe_Asset_ankrETH_Pool_WETH => `0x4ce537d187c97B7a5696B38f5de41aA4e57a08BA`
  - Bribe_Asset_ankrETH_Pool_ankrETH => `0x9f3F1e89831391214fAA57ee7e27667156140655`

#### wstETH Pool
  - DynamicPools_WstETH_Pool_Proxy => `0xe14302040c0A1eb6fB5A4A79EfA46D60029358d9`
  - Asset_WstETH_Pool_wstETH => `0xEB7e2f8Efac7Ab8079837417b65cD927f05F7465`
  - Asset_WstETH_Pool_WETH => `0x90971596f486521F496dC05fAEb90837a5F19108`
  - Bribe_Asset_WstETH_Pool_wstETH => `0xcE2bb46e4121819d5Bf77e28480393083738549A`
  - Bribe_Asset_WstETH_Pool_WETH => `0x8e16b6c0C6121c58733Af331B07F1C2fda7F8561`
  - MultiRewarderPerSec_V3_Asset_WstETH_Pool_wstETH => `0x1C18Aa903f8DEA0d237EDe4cf0413668b9bA7Dfe`
  - MultiRewarderPerSec_V3_Asset_WstETH_Pool_WETH => `0x0e2D70ac977E3435403efB46159315E8aBa78278`

#### mPendle Pool
  - FactoryPools_mPendle_Pool_Proxy => `0xe7159f15e7b1d6045506B228A1ed2136dcc56F48`
  - Asset_mPendle_Pool_PENDLE => `0xb4bEb0fDf0163a39D39b175942E7973da2c336Fb`
  - Asset_mPendle_Pool_mPendle => `0x5aD0b68c8544D475ee73ffd4c8dfe7E273b01266`
  - MultiRewarderPerSec_V3_Asset_mPendle_Pool_PENDLE => `0x7cB260008891F8D5dF230F20758C6be46C17E154`
  - MultiRewarderPerSec_V3_Asset_mPendle_Pool_mPendle => `0x4e811C2Cf56F63f1762bcB70110FA6FB83dCa968`

#### fUSDC Pool
  - FactoryPools_fUSDC_Pool_Proxy => `0x956454C7BE9318863297309183C79b793D370401`
  - Asset_fUSDC_Pool_fUSDC => `0xc74a9d15037886Ea357F0ef243C50010B11133cB`
  - Asset_fUSDC_Pool_USDCe => `0xB75eD91d1654e586015d72cAbBc8F4B8B9AA0fD9`
  - MultiRewarderPerSec_V3_Asset_fUSDC_Pool_fUSDC => `0xF37F7835f2C214AC678F2f3C5147026907d88836`
  - MultiRewarderPerSec_V3_Asset_fUSDC_Pool_USDCe => `0x2201EAFcbE5f4bddf14206A319C51B86E8E0c138`

#### ePendle Pool
  - PendleSidePools_ePendle_Pool_Proxy => `0x3257EaA9C919fe01EF628fe9031BA2Cd8927A3b1`
  - Asset_ePendle_Pool_PENDLE => `0x625b37bbBb725d168Fdc94FE1e73b200dD01F08b`
  - Asset_ePendle_Pool_ePendle => `0x1Bd8cE3BA10F7C299793da3A146917da5eA18EeB`
  - MultiRewarderPerSec_V3_Asset_ePendle_Pool_PENDLE => `0x1242FB2bDc110b0F228E6348220aB6c3fd4837d0`
  - MultiRewarderPerSec_V3_Asset_ePendle_Pool_ePendle => `0x49Ea553c102b595E798689af2b4663A8d33Eac51`

### Optimism mainnet deployed contracts:

#### Wombat Governance
  - DefaultProxyAdmin => `0x85cEBD962861be410a777755dFa06914de6af003`
  - Wombat Token => `0xd2612b256f6f76fea8c6fbca0bf3166d0d13a668`
  - WombatRouter => `0x9A65781bFff8E43E4345D6B1b5157B2657F2735D`
  - MasterWombatV3_Proxy => `0x34E2F923bBa206358EcE221af73E8d121837F873`
  - TimelockController => `0xD119d81cD05c010C10e40FaE8478b36b59FAcA20`

#### Main Pool
  - Main_Pool_Proxy => `0x6f8Ad371FDD422c0abE21352525f58b5E3bB266b`
  - Asset_Main_Pool_USDC => `0xd05CF2BCaaee3a221E9effF58bF2874b9F11E47b`
  - Asset_Main_Pool_USDT => `0x375883a1F801138B6f5EE953a7A11072129Ac624`

### Ethereum mainnet deployed contracts:

#### Wombat Governance
  - Wombat Token => `0xc0B314a8c08637685Fc3daFC477b92028c540CFB`
  - DefaultProxyAdmin => `0xc6bc781E20f9323012F6e422bdf552Ff06bA6CD1`
  - MasterWombatV3_Proxy => `0xC9bFC3eFeFe4CF96877009F75a61F5c1937e5d1a`

### BSC testnet deployed contracts:

#### BSC Wallet Accounts
  - Deployer (owner) => `0xDB9f9Be4D6A033d622f6785BA6F8c3680dEC2452`
  - User 1 => `0x1d39a90dAC4596b36D60682B6cec147Eb758AF90`
  - User 2 => `0x67F6e6EEB3e61e23Ee765905F5a04a2Bbd0E3a73`

#### Wombat Proxy Admin
  - Default Proxy Admin (Proxy Admin) => `0x5961699Bf708A804e5ED528bDAcb9d4bA16c4F6a`

#### Wombat Main Pool
  - Pool Proxy (Main entry) => `0x76F3378F13c6e9c5F477d1D9dE2A21151E883D71`
  - Asset V2 (LP-BUSD) => `0xA1a8d6688A2DEF14d6bD3A76E3AA2bdB5670C567`
  - Asset V2 (LP-USDC) => `0x61ABD791773a7E583aD439F558C6c0F157707e7b`
  - Asset V2 (LP-USDT) => `0x2C89105ce90f8C3aE13e01b268eAe57B95e1e5a6`
  - Asset V2 (LP-TUSD) => `0xe52E4510cBff4712e46499ce6e87Ead760542fD5`
  - Asset V2 (LP-DAI) => `0x9f6163070fBCa0a61F49F37e0123fCE3d28B8e21`
  - Asset V2 (LP-vUSDC) => `0x36c99D7D330F37Ac8f22C261242033957fcC6c24`

#### Wombat Mega Pool
  - Mega Pool Proxy (Main entry) => `0x28215D4CD27E985b8C4a6b29888B3E61D0eE5A07`
  - Wormhole Adaptor Proxy (Main entry) => `0xf8221A7fd1F1Dad577295ee4D9c3495B9D4e02dB`
  - CoreV3 => `0xB807880f87C68A132B3F8AC6F09872df0E4731C7`
  - BUSD (6 d.p.) => `0x39A800Dd250D11BC543829De82ad384fA62A089f`
  - vUSDC (6 d.p.) => `0xB342efA326a7F3475FDcC35e4aF236ED46fc310a`
  - Asset (LP-BUSD) => `0x14caa782145Ad3381040BEF3606a4c2900Cd2dcC`
  - Asset (LP-vUSDC) => `0xbb225C3CB08Adc582cE52CAd4Ef7d4CB0D9D2a7E`

#### Wombat Side Pool
  - Pool Proxy (Main entry) => `0x32997A613FBabE911887e296c27f55d735D55084`
  - Asset_SP01_BUSD (LP-BUSD) => `0x0d3dBc403d121eB53d14E2FE2a98e78CA3E17c44`
  - Asset_SP01_FRAX (LP-FRAX) => `0xc5f2B1df25B9Bfc61444b002121330bEa9460F3e`
  - Asset_SP01_HAY (LP-HAY) => `0xF52289Fd9eAFC94e35868F0D5e23140EBCa03ef4`
  - Asset_SP01_MIM (LP-MIM) => `0x0aF70A8aA5707Fd6407F9a583b69Ce071Ab58FE0`
  - Asset_SP01_TUSD (LP-TUSD) => `0x3F8e976aef5719F18e03aC9A2407Df1d0c601242`

#### Factory Pool Stables 01

  - Pool Proxy (Main entry) => `0x9817A92bd6B79B64974275730adBEc7462D42E2F`
  - Asset_stables_01_BUSD (LP-BUSD) => `0x3cBcC2a75d54f9746EC18302a1367Bb9eE0C3575`
  - Asset_stables_01_FRAX (LP-FRAX) => `0xAf605D0De1b4654b31b8918587aBc45572e22CEd`
  - Asset_stables_01_TUSD (LP-TUSD) => `0x80050Ff8E1C7284025A3669C30f2CD46b735a7Eb`

#### iUSD Pool
  - Pool Proxy (Main entry) => `0xE2a60C52C4abB9fbc3f711da3cb9E633269DBC67`
  - Asset_IUSDPool_iUSD (LP-iUSD) => `0x5f38B59905F5Fe9161EFF4730f035032eb830241`
  - Asset_IUSDPool_BUSD (LP-BUSD) => `0x0e2D70ac977E3435403efB46159315E8aBa78278`

#### CUSD Pool
  - Pool Proxy (Main entry) => `0x7F95D391e5F1A4B0a265e40Bf588739BEa2202c4`
  - Asset_CUSDPool_CUSD (LP-CUSD) => `0x8e16b6c0C6121c58733Af331B07F1C2fda7F8561`
  - Asset_CUSDPool_HAY (LP-HAY) => `0xcE2bb46e4121819d5Bf77e28480393083738549A`

#### axlUSDC Pool
  - Pool Proxy (Main entry) => `0xB0219A90EF6A24a237bC038f7B7a6eAc5e01edB0`
  - Asset_AxlUsdcPool_axlUSDC (LP-axlUSDC) => `0xb826313c8B122757e617c0Ea963a4310c14a8Cc8`
  - Asset_AxlUsdcPool_BUSD (LP-BUSD) => `0x148cB0c89bD3fC0F89c81cDfDC2cB6Cd6D790317`

#### USDD Pool
  - Pool Proxy (Main entry) => `0xb1583D73898E5F24311a1457dd4BCff051E2D427`
  - Asset_USDDPool_USDD (LP-USDD) => `0xAB8D5b703edBed5733271d1Af5134e1C667dda0D`
  - Asset_USDDPool_USDC (LP-USDC) => `0x3c64D9870632E12036888D5fc0CFA5dEb261B453`

#### mWOM Side Pool
  - Pool Proxy (Main entry) => `0xd3c8392B86DB591FF95b4B8472C5344f9b237525`
  - Asset_mWOMPool_WOM (LP-BUSD) => `0x704C122E59C8cD20CD89DeB9E00e6f499794dfD4`
  - Asset_mWOMPool_mWOM (LP-BUSD) => `0x505b0159871F86Ae0F4512BB52dB5030E31E2459`

#### wmxWOM Side Pool
  - Pool Proxy (Main entry) => `0x46da9508026B45AD44bE42bF5A3ff60f0Ed3CbCB`
  - Asset_wmxWOMPool_WOM (LP-WOM) => `0xF738a9E44be4a595529b61Af180e2027E71c9AE9`
  - Asset_wmxWOMPool_wmxWOM (LP-wmxWOM) => `0x0c53D31de26FB198278db8213D5238f6316c6338`

#### qWOM Side Pool
  - Pool Proxy (Main entry) => `0xcCEA75F57044df96a5CBC1dC9BcedA48efa22E1e`
  - Asset_qWOMPool_WOM (LP-WOM) => `0x82e5314DfdA9aD1a7F594B7D0b5D6b13459f4826`
  - Asset_qWOMPool_qWOM (LP-qWOM) => `0x22056C9F7e8033BBea9F32b903a0ECF8a7Ea0bC7`

#### Wombat BNBx Dynamic Pool
  - Pool Proxy (Main entry) => `0x7749C4737424bdaA69755e20e46eC53053dfA921`
  - Asset_BnbxPool_WBNB => `0xC0aFB4E0f2A11E2a74F168904F47178865b728ba`
  - Asset_BnbxPool_BNBx => `0xB9207cc7bEaFb74773Cd08C869d6F6f890105564`

#### Wombat Governance
  - MasterWombatV2 Proxy => `0x78BAEc04D81fCF87551a8495d87035911a7875C6`
  - MasterWombatV3 Proxy => `0x8C0e9334DBFAC1b9184bC01Ef638BA705cc13EaF`
  - VeWom Proxy => `0x3868B84D4cea3110694d07A2d222418F7B401fE8`
  - Voter Proxy => `0x23c8D0437b74CE912850B89a42F28e4037cA7849`
  - Bribe_BUSD => `0x3aEA5139441318A951e11aB38392c8C75F1a7522`
  - Bribe_FRAX_BUSD => `0xcF7640E12b4aB4F5a4Fe35b231541DF9a83351Ea`
  - Bribe_BNBx => `0xf496a50aE1663942a0D0ee23b914DDDea1FC4A10`

#### Wombat Rewarders
  - MultiRewarderPerSec_V3_BUSD => `0x175A26Ee230744e3FDcde5a101519a0682410a7F`
  - MultiRewarderPerSec_V3_FRAX => `0x6002E1e8B2d532C68e3Fe5caF2eDF527dFd63683`
  - MultiRewarderPerSec_V3_FRAX_BUSD => `0xeCfe20544a7CD580CA12DA7390b111898C6f7d1c`
  - MultiRewarderPerSec_V3_qWOM => `0x4ad04CfB697604f02c282a9c187dEE05abB23E1c`
  - MultiRewarderPerSec_V3_qWOMPool_WOM => `0xdA385297E58A7e7db4D88e3B1e4581B103C6f232`
  - MultiRewarderPerSec_V3_USDC => `0xa2644c7EB99DE997516378B269f09C2fce067fd8`
  - MultiRewarderPerSec_V3_wWOM => `0x6Ad9E25a49319E316137E938cC74c31F4D0C0fca`
  - MultiRewarderPerSec_V3_BNBx => `0xfA3392662153eC17dc176158F38f7DA67aefa08b`
  - MultiRewarderPerSec_V3_BnbxPool_WBNB => `0xd9F39e6F2a958a35Eff368adC5C39362326C5B36`

#### Wombat Token
  - WOM (ERC20) => `0x7BFC90abeEB4138e583bfC46aBC69De34c9ABb8B`
  - Token Vesting => `0x8D1696d63507d59E0bab03801D74F78fA76671D0` (v2)

#### Wombat Router
  - WombatRouter => `0xED430B9b729260DA55006A49E06aFc451F958f1E`

#### Mock ERC20 Stablecoins
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
  - axlUSDC => `0x9624f6868807A44fCe6c52c2b9Ca28E07c3fBb59`
  - CUSD => `0x27Ec2901fb369B5C7d34fCabD8f03833F0741ef8`
  - iUSD => `0xe07829c8B7F934e03C83B0dC1fd2cCC9b62036D8`
  - USDD => `0x5cf1c3F9c0EaBCd0EFF825C0d5c8A8B16b11626a`

### Fuji testnet deployed contracts:

#### Wombat Proxy Admin
  - Default Proxy Admin (Proxy Admin) => `0x6ad9C3C1670CEE303309bC82e7a5754dCb831205`

#### Wombat Mega Pool
  - Mega Pool Proxy (Main entry) => `0x4dF91022B08C4bD9B2cE54D0799E7a9Db801df2c`
  - Wormhole Adaptor Proxy (Main entry) => `0x2e6C1DcfCE442DCD7B55e36580519E1cf75d936D`
  - CoreV3 => `0xDa01302C86ECcd5bc94c1086777acF3c3Af7EF63`
  - BUSD (6 d.p.) => `0x39946D6d1107FcE169245Da07af292F1DBF90f8E`
  - vUSDC (6 d.p.) => `0x2c5bdB54A5A2C899D7a8BAA091EEcd0bCB2Bdd31`
  - Asset (LP-BUSD) => `0x326335BA4e70cb838Ee55dEB18027A6570E5144d`
  - Asset (LP-vUSDC) => `0x2c5bdB54A5A2C899D7a8BAA091EEcd0bCB2Bdd31`

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
