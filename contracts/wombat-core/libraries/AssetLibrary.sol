// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '../interfaces/IAsset.sol';

/**
 * @notice An internal library for assets management and utilities
 */
library AssetLibrary {
    using AssetLibrary for AssetMap;

    /// @notice Asset Map struct holds assets
    struct AssetMap {
        IERC20[] keys;
        mapping(IERC20 => IAsset) values;
        mapping(IERC20 => uint256) indexOf;
    }

    //#region Error

    error WOMBAT_ASSET_NOT_EXISTS();
    error WOMBAT_ASSET_ALREADY_EXIST();

    //#endregion Error

    /**
     * @notice Adds asset to pool, reverts if asset already exists in pool
     * @param token The address of token
     * @param asset The address of the Wombat Asset contract
     */
    function addAsset(AssetLibrary.AssetMap storage assets, IERC20 token, IAsset asset) internal {
        if (assets.containsAsset(token)) revert AssetLibrary.WOMBAT_ASSET_ALREADY_EXIST();
        assets.values[token] = IAsset(asset);
        assets.indexOf[token] = assets.keys.length;
        assets.keys.push(token);
    }

    /**
     * @notice Removes asset from asset struct
     * @dev Can only be called by owner
     * @param token The address of token to remove
     */
    function removeAsset(AssetLibrary.AssetMap storage assets, IERC20 token) internal {
        assets.checkAssetExistFor(token);

        delete assets.values[token];

        uint256 index = assets.indexOf[token];
        uint256 lastIndex = assets.keys.length - 1;
        IERC20 lastKey = assets.keys[lastIndex];

        assets.indexOf[lastKey] = index;
        delete assets.indexOf[token];

        assets.keys[index] = lastKey;
        assets.keys.pop();
    }

    /**
     * @notice get length of asset list
     * @return the size of the asset list
     */
    function count(AssetMap storage assets) internal view returns (uint256) {
        return assets.keys.length;
    }

    /**
     * @notice Gets Asset corresponding to ERC20 token. Reverts if asset does not exists in Pool.
     * @param token The address of ERC20 token
     */
    function assetOf(AssetMap storage assets, IERC20 token) internal view returns (IAsset) {
        if (!assets.containsAsset(token)) revert WOMBAT_ASSET_NOT_EXISTS();
        return assets.values[token];
    }

    function getAssetAtIndex(AssetMap storage assets, uint256 index) internal view returns (IAsset) {
        return assets.values[assets.keys[index]];
    }

    function checkAssetExistFor(AssetMap storage assets, IERC20 token) internal view {
        if (!assets.containsAsset(token)) revert WOMBAT_ASSET_NOT_EXISTS();
    }

    /**
     * @notice Looks if the asset is contained by the list
     * @param token The address of token to look for
     * @return bool true if the asset is in asset list, false otherwise
     */
    function containsAsset(AssetMap storage assets, IERC20 token) internal view returns (bool) {
        return assets.values[token] != IAsset(address(0));
    }
}
