// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '../interfaces/IAsset.sol';
import '../interfaces/IVolatileAsset.sol';
import '../libraries/AssetLibrary.sol';

struct PoolV4Data {
    // For Pool
    /// @notice Amplification factor
    uint256 ampFactor;
    /// @notice Haircut rate
    uint256 haircutRate;
    /// @notice Retention ratio: the ratio of haircut that should stay in the pool
    uint256 retentionRatio;
    /// @notice LP dividend ratio : the ratio of haircut that should distribute to LP
    uint256 lpDividendRatio;
    /// @notice The threshold to mint fee (unit: WAD)
    uint256 mintFeeThreshold;
    /// @notice dev address
    address dev;
    address feeTo;
    address masterWombat;
    /// @notice Dividend collected by each asset (unit: WAD)
    mapping(IAsset => FeeAndReserve) feeAndReserve;
    /// @notice A record of assets inside Pool
    AssetLibrary.AssetMap assets;
    // Slots reserved for future use
    uint128 _used1; // Remember to initialize before use.
    uint128 _used2; // Remember to initialize before use.
    /// @notice Withdrawal haircut rate charged at the time of withdrawal
    uint256 withdrawalHaircutRate;
    uint256[48] __gap1;
    // For HighCovRatioFeePool
    uint128 startCovRatio; // 1.5
    uint128 endCovRatio; // 1.8
    uint256[50] __gap2;
    // For DynamicPool
    uint256[50] __gap3;
}

struct FeeAndReserve {
    uint128 feeCollected; // 18 decimals
    uint128 reserveForRepegging; // 18 decimals
}
