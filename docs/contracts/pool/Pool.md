# Pool

contracts/pool/Pool.sol

> Title: Pool

> Notice: Manages deposits, withdrawals and swaps. Holds a mapping of assets and parameters.

> Details: The main entry-point of Wombat protocol

## *event* AssetAdded

***Pool.AssetAdded(token, asset) ***

> Notice: An event thats emitted when an asset is added to Pool

Arguments

| **name** | **type** | **description** |
|-|-|-|
| token | address | indexed |
| asset | address | indexed |



## *event* Deposit

***Pool.Deposit(sender, token, amount, liquidity, to) ***

> Notice: An event thats emitted when a deposit is made to Pool

Arguments

| **name** | **type** | **description** |
|-|-|-|
| sender | address | indexed |
| token | address | not indexed |
| amount | uint256 | not indexed |
| liquidity | uint256 | not indexed |
| to | address | indexed |



## *event* OwnershipTransferred

***Pool.OwnershipTransferred(previousOwner, newOwner) ***

Arguments

| **name** | **type** | **description** |
|-|-|-|
| previousOwner | address | indexed |
| newOwner | address | indexed |



## *event* Paused

***Pool.Paused(account) ***

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address | not indexed |



## *event* Swap

***Pool.Swap(sender, fromToken, toToken, fromAmount, toAmount, to) ***

> Notice: An event thats emitted when a swap is made in Pool

Arguments

| **name** | **type** | **description** |
|-|-|-|
| sender | address | indexed |
| fromToken | address | not indexed |
| toToken | address | not indexed |
| fromAmount | uint256 | not indexed |
| toAmount | uint256 | not indexed |
| to | address | indexed |



## *event* Unpaused

***Pool.Unpaused(account) ***

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address | not indexed |



## *event* Withdraw

***Pool.Withdraw(sender, token, amount, liquidity, to) ***

> Notice: An event thats emitted when a withdrawal is made from Pool

Arguments

| **name** | **type** | **description** |
|-|-|-|
| sender | address | indexed |
| token | address | not indexed |
| amount | uint256 | not indexed |
| liquidity | uint256 | not indexed |
| to | address | indexed |



## *function* WAD

***Pool.WAD() view***

Outputs

| **name** | **type** | **description** |
|-|-|-|
|  | uint256 |  |



## *function* WAD_i

***Pool.WAD_i() view***

Outputs

| **name** | **type** | **description** |
|-|-|-|
|  | int256 |  |



## *function* addAsset

***Pool.addAsset(token, asset) ***

> Notice: Adds asset to pool, reverts if asset already exists in pool

Arguments

| **name** | **type** | **description** |
|-|-|-|
| token | address | The address of token |
| asset | address | The address of the Wombat Asset contract |



## *function* assetOf

***Pool.assetOf(token) view***

> Notice: Gets Asset corresponding to ERC20 token. Reverts if asset does not exists in Pool.

> Details: to be used externally

Arguments

| **name** | **type** | **description** |
|-|-|-|
| token | address | The address of ERC20 token |

Outputs

| **name** | **type** | **description** |
|-|-|-|
|  | address |  |



## *function* deposit

***Pool.deposit(token, amount, to, deadline) ***

> Notice: Deposits amount of tokens into pool ensuring deadline

> Details: Asset needs to be created and added to pool before any operation

Arguments

| **name** | **type** | **description** |
|-|-|-|
| token | address | The token address to be deposited |
| amount | uint256 | The amount to be deposited |
| to | address | The user accountable for deposit, receiving the Wombat assets (lp) |
| deadline | uint256 | The deadline to be respected |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| liquidity | uint256 | Total asset liquidity minted |



## *function* getAmpFactor

***Pool.getAmpFactor() view***

> Notice: Gets current amplification factor parameter

Outputs

| **name** | **type** | **description** |
|-|-|-|
|  | uint256 | The current amplification factor parameter in Pool |



## *function* getDev

***Pool.getDev() view***

> Notice: Gets current Dev address

Outputs

| **name** | **type** | **description** |
|-|-|-|
|  | address | The current Dev address for Pool |



## *function* getHaircutRate

***Pool.getHaircutRate() view***

> Notice: Gets current haircut parameter

Outputs

| **name** | **type** | **description** |
|-|-|-|
|  | uint256 | The current haircut parameter in Pool |



## *function* getRetentionRatio

***Pool.getRetentionRatio() view***

> Notice: Gets current retention ratio parameter

Outputs

| **name** | **type** | **description** |
|-|-|-|
|  | uint256 | The current retention ratio parameter in Pool |



## *function* initialize

***Pool.initialize() ***

> Notice: Initializes pool. Dev is set to be the account calling this function.



## *function* owner

***Pool.owner() view***

> Details: Returns the address of the current owner.

Outputs

| **name** | **type** | **description** |
|-|-|-|
|  | address |  |



## *function* pause

***Pool.pause() ***

> Details: pause pool, restricting certain operations



## *function* paused

***Pool.paused() view***

> Details: Returns true if the contract is paused, and false otherwise.

Outputs

| **name** | **type** | **description** |
|-|-|-|
|  | bool |  |



## *function* quotePotentialSwap

***Pool.quotePotentialSwap(fromToken, toToken, fromAmount) view***

> Notice: Quotes potential outcome of a swap given current state, taking in account slippage and haircut

> Details: To be used by frontend

Arguments

| **name** | **type** | **description** |
|-|-|-|
| fromToken | address | The initial ERC20 token |
| toToken | address | The token wanted by user |
| fromAmount | uint256 | The amount to quote |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| potentialOutcome | uint256 | The potential amount user would receive |
| haircut | uint256 | The haircut that would be applied |



## *function* quotePotentialWithdraw

***Pool.quotePotentialWithdraw(token, liquidity) view***

> Notice: Quotes potential withdrawal from pool

> Details: To be used by frontend

Arguments

| **name** | **type** | **description** |
|-|-|-|
| token | address | The token to be withdrawn by user |
| liquidity | uint256 | The liquidity (amount of lp assets) to be withdrawn |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| amount | uint256 | The potential amount user would receive |
| fee | uint256 | The fee that would be applied |
| enoughCash | bool | does the pool have enough cash? (cash >= liabilityToBurn - fee) |



## *function* renounceOwnership

***Pool.renounceOwnership() ***

> Details: Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.



## *function* setAmpFactor

***Pool.setAmpFactor(ampFactor_) ***

> Notice: Changes the pools amplification factor. Can only be set by the contract owner.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| ampFactor_ | uint256 | new pool's amplification factor |



## *function* setDev

***Pool.setDev(dev) ***

> Notice: Changes the contract dev. Can only be set by the contract owner.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| dev | address | new contract dev address |



## *function* setHaircutRate

***Pool.setHaircutRate(haircutRate_) ***

> Notice: Changes the pools haircutRate. Can only be set by the contract owner.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| haircutRate_ | uint256 | new pool's haircutRate_ |



## *function* setRetentionRatio

***Pool.setRetentionRatio(retentionRatio_) ***

> Notice: Changes the pools retentionRatio. Can only be set by the contract owner.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| retentionRatio_ | uint256 | new pool's retentionRatio |



## *function* swap

***Pool.swap(fromToken, toToken, fromAmount, minimumToAmount, to, deadline) ***

> Notice: Swap fromToken for toToken, ensures deadline and minimumToAmount and sends quoted amount to `to` address

Arguments

| **name** | **type** | **description** |
|-|-|-|
| fromToken | address | The token being inserted into Pool by user for swap |
| toToken | address | The token wanted by user, leaving the Pool |
| fromAmount | uint256 | The amount of from token inserted |
| minimumToAmount | uint256 | The minimum amount that will be accepted by user as result |
| to | address | The user receiving the result of swap |
| deadline | uint256 | The deadline to be respected |



## *function* transferOwnership

***Pool.transferOwnership(newOwner) ***

> Details: Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| newOwner | address |  |



## *function* unpause

***Pool.unpause() ***

> Details: unpause pool, enabling certain operations



## *function* withdraw

***Pool.withdraw(token, liquidity, minimumAmount, to, deadline) ***

> Notice: Withdraws liquidity amount of asset to `to` address ensuring minimum amount required

Arguments

| **name** | **type** | **description** |
|-|-|-|
| token | address | The token to be withdrawn |
| liquidity | uint256 | The liquidity to be withdrawn |
| minimumAmount | uint256 | The minimum amount that will be accepted by user |
| to | address | The user receiving the withdrawal |
| deadline | uint256 | The deadline to be respected |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| amount | uint256 | The total amount withdrawn |


