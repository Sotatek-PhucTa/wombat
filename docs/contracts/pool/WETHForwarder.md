# WETHForwarder

contracts/pool/WETHForwarder.sol

> Title: WETHForwarder

> Notice: Temporary WETH holder and is responsible to unwrap and forward actual ETH to user

> Details: Allows transfer of WETH avoiding out-of-gas error (in case pool is ever deployed through proxy).

## *constructor*

***constructor(weth)***

Arguments

| **name** | **type** | **description** |
|-|-|-|
| weth | address |  |



## *event* OwnershipTransferred

***WETHForwarder.OwnershipTransferred(previousOwner, newOwner) ***

Arguments

| **name** | **type** | **description** |
|-|-|-|
| previousOwner | address | indexed |
| newOwner | address | indexed |



## *function* owner

***WETHForwarder.owner() view***

> Details: Returns the address of the current owner.

Outputs

| **name** | **type** | **description** |
|-|-|-|
|  | address |  |



## *function* renounceOwnership

***WETHForwarder.renounceOwnership() ***

> Details: Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.



## *function* setPool

***WETHForwarder.setPool(pool) ***

> Notice: Changes the pool. Can only be set by the contract owner.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| pool | address | new contract pool address |



## *function* transferOwnership

***WETHForwarder.transferOwnership(newOwner) ***

> Details: Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| newOwner | address |  |



## *function* unwrapAndTransfer

***WETHForwarder.unwrapAndTransfer(to, amount) ***

> Notice: Unwrap and transfer eth. Can only be called by pool

Arguments

| **name** | **type** | **description** |
|-|-|-|
| to | address | address receiving |
| amount | uint256 | total amount to be transferred |


