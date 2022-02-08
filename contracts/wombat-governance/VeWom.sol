// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;

import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './VeERC20Upgradeable.sol';
import './interfaces/IWhitelist.sol';
import './interfaces/IMasterWombat.sol';
import './libraries/DSMath.sol';
import './interfaces/IVeWom.sol';
import './interfaces/IWombatNFT.sol';

/// @title VeWom
/// @notice Wombat Waddle: the staking contract for WOM, as well as the token used for governance.
/// Note Waddling does not seem to slow the Wombat, it only makes it sturdier.
/// Allows depositing/withdraw of wom and staking/unstaking ERC721.
/// Here are the rules of the game:
/// If you stake wom, you generate veWom at the current `generationRate` until you reach `maxCap`
/// If you unstake any amount of wom, you loose all of your veWom.
/// ERC721 staking does not affect generation nor cap for the moment, but it will in a future upgrade.
/// Note that it's ownable and the owner wields tremendous power. The ownership
/// will be transferred to a governance smart contract once Wombat is sufficiently
/// distributed and the community can show to govern itself.
contract VeWom is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    VeERC20Upgradeable,
    IVeWom
{
    using SafeERC20 for IERC20;

    struct Breeding {
        uint48 unlockTime;
        uint104 WomAmount;
        uint104 veWomAmount;
    }

    struct UserInfo {
        // uint256 amount;
        // uint256 lastRelease; // time of last veWom claim or first deposit if user has not claimed yet
        // the id of the currently staked nft
        // important: the id is offset by +1 to handle tokenID = 0
        // uint256 stakedNftId;
        Breeding[] breedings;
    }

    /// @notice the wom token
    IERC20 public wom;

    /// @notice the masterWombat contract
    IMasterWombat public masterWombat;

    /// @notice the NFT contract
    IWombatNFT public nft;

    /// @dev Magic value for onERC721Received
    /// Equals to bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))
    bytes4 private constant ERC721_RECEIVED = 0x150b7a02;

    /// @notice max veWom to staked wom ratio
    /// Note if user has 10 wom staked, they can only have a max of 10 * maxCap veWom in balance
    uint256 public maxCap;

    /// @notice the rate of veWom generated per second, per wom staked
    uint256 public generationRate;

    /// @notice invVvoteThreshold threshold.
    /// @notice voteThreshold is the tercentage of cap from which votes starts to count for governance proposals.
    /// @dev inverse of the threshold to apply.
    /// Example: th = 5% => (1/5) * 100 => invVoteThreshold = 20
    /// Example 2: th = 3.03% => (1/3.03) * 100 => invVoteThreshold = 33
    /// Formula is invVoteThreshold = (1 / th) * 100
    uint256 public invVoteThreshold;

    /// @notice whitelist wallet checker
    /// @dev contract addresses are by default unable to stake wom, they must be previously whitelisted to stake wom
    IWhitelist public whitelist;

    uint32 maxBreedingLength = 10;
    uint32 minLockDays = 7;
    uint32 maxLockDays = 1461;

    /// @notice user info mapping
    mapping(address => UserInfo) internal users;

    /// @notice events describing staking, unstaking and claiming
    event Staked(address indexed user, uint256 indexed amount);
    event Unstaked(address indexed user, uint256 indexed amount);
    event Claimed(address indexed user, uint256 indexed amount);

    /// @notice events describing NFT staking and unstaking
    event StakedNft(address indexed user, uint256 indexed nftId);
    event UnstakedNft(address indexed user, uint256 indexed nftId);

    function initialize(
        IERC20 _wom,
        IMasterWombat _masterWombat,
        IWombatNFT _nft
    ) public initializer {
        require(address(_masterWombat) != address(0), 'zero address');
        require(address(_wom) != address(0), 'zero address');

        // Initialize veWOM
        __ERC20_init('Wombat Waddle', 'veWOM');
        __Ownable_init();
        __ReentrancyGuard_init_unchained();
        __Pausable_init_unchained();

        // set generationRate (veWom per sec per wom staked)
        generationRate = 3888888888888;

        // set maxCap
        maxCap = 100;

        // set inv vote threshold
        // invVoteThreshold = 20 => th = 5
        invVoteThreshold = 20;

        // set master wombat
        masterWombat = _masterWombat;

        // set wom
        wom = _wom;

        // set nft, can be zero address at first
        nft = _nft;
    }

    /**
     * @dev pause pool, restricting certain operations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev unpause pool, enabling certain operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice sets masterWombat address
    /// @param _masterWombat the new masterWombat address
    function setMasterWombat(IMasterWombat _masterWombat) external onlyOwner {
        require(address(_masterWombat) != address(0), 'zero address');
        masterWombat = _masterWombat;
    }

    /// @notice sets NFT contract address
    /// @param _nft the new NFT contract address
    function setNftAddress(IWombatNFT _nft) external onlyOwner {
        require(address(_nft) != address(0), 'zero address');
        nft = _nft;
    }

    /// @notice sets whitelist address
    /// @param _whitelist the new whitelist address
    function setWhitelist(IWhitelist _whitelist) external onlyOwner {
        require(address(_whitelist) != address(0), 'zero address');
        whitelist = _whitelist;
    }

    /// @notice sets maxCap
    /// @param _maxCap the new max ratio
    function setMaxCap(uint256 _maxCap) external onlyOwner {
        require(_maxCap != 0, 'max cap cannot be zero');
        maxCap = _maxCap;
    }

    /// @notice sets generation rate
    /// @param _generationRate the new max ratio
    function setGenerationRate(uint256 _generationRate) external onlyOwner {
        require(_generationRate != 0, 'generation rate cannot be zero');
        generationRate = _generationRate;
    }

    /// @notice sets invVoteThreshold
    /// @param _invVoteThreshold the new var
    /// Formula is invVoteThreshold = (1 / th) * 100
    function setInvVoteThreshold(uint256 _invVoteThreshold) external onlyOwner {
        // onwner should set a high value if we do not want to implement an important threshold
        require(_invVoteThreshold != 0, 'invVoteThreshold cannot be zero');
        invVoteThreshold = _invVoteThreshold;
    }

    /// @notice checks wether user _addr has wom staked
    /// @param _addr the user address to check
    /// @return true if the user has wom in stake, false otherwise
    function isUser(address _addr) public view override returns (bool) {
        return balanceOf(_addr) > 0;
    }

    /// @dev explicity override multiple inheritance
    function totalSupply() public view override(VeERC20Upgradeable, IVeWom) returns (uint256) {
        return super.totalSupply();
    }

    /// @dev explicity override multiple inheritance
    function balanceOf(address account) public view override(VeERC20Upgradeable, IVeWom) returns (uint256) {
        return super.balanceOf(account);
    }

    function _expectedVeWomAmount(uint256 amount, uint256 lockDays) internal returns (uint256) {
        // TODO: implement;
        return amount * lockDays;
    }

    /// @notice lock WOM into contract and mint veWOM
    function mint(uint256 amount, uint256 lockDays) external override nonReentrant whenNotPaused {
        require(amount > 0, 'amount to deposit cannot be zero');

        // assert call is not coming from a smart contract
        // unless it is whitelisted
        _assertNotContract(msg.sender);

        uint256 maxBreedingLength_ = maxBreedingLength;
        uint256 minLockDays_ = minLockDays;
        uint256 maxLockdays_ = maxLockDays;

        require(lockDays >= minLockDays_ && lockDays <= maxLockdays_, 'lock days is invalid');
        require(users[msg.sender].breedings.length < maxBreedingLength_, 'breed too much');

        uint256 unlockTime = block.timestamp + 86400 * lockDays;
        uint256 veWomAmount = _expectedVeWomAmount(amount, lockDays);

        require(unlockTime <= uint256(type(uint48).max), "SafeCast: value doesn't fit");
        require(amount <= uint256(type(uint104).max), "SafeCast: value doesn't fit");
        require(veWomAmount <= uint256(type(uint104).max), "SafeCast: value doesn't fit");

        users[msg.sender].breedings.push(Breeding(uint48(unlockTime), uint104(amount), uint104(veWomAmount)));

        _mint(msg.sender, veWomAmount);

        // Request Wom from user
        wom.safeTransferFrom(msg.sender, address(this), amount);
    }

    function burn(uint256 slot) external override nonReentrant whenNotPaused {
        require(slot < users[msg.sender].breedings.length, 'wut?');
        // TODO: implement
    }

    /// @notice asserts addres in param is not a smart contract.
    /// @notice if it is a smart contract, check that it is whitelisted
    /// @param _addr the address to check
    function _assertNotContract(address _addr) private view {
        if (_addr != tx.origin) {
            require(
                address(whitelist) != address(0) && whitelist.check(_addr),
                'Smart contract depositors not allowed'
            );
        }
    }

    /// @notice hook called after token operation mint/burn
    /// @dev updates masterWombat
    /// @param _account the account being affected
    /// @param _newBalance the newVeWomBalance of the user
    function _afterTokenOperation(address _account, uint256 _newBalance) internal override {
        masterWombat.updateFactor(_account, _newBalance);
    }

    // /// @notice This function is called when users stake NFTs
    // /// When Wombat NFT sent via safeTransferFrom(), we regard this action as staking the NFT
    // /// Note that transferFrom() is ignored by this function
    // function onERC721Received(
    //     address,
    //     address _from,
    //     uint256 _tokenId,
    //     bytes calldata
    // ) external override nonReentrant whenNotPaused returns (bytes4) {
    //     require(msg.sender == address(nft), 'only wombat NFT can be received');
    //     require(isUser(_from), 'user has no stake');

    //     // User has previously staked some NFT, try to unstake it first
    //     if (users[_from].stakedNftId != 0) {
    //         _unstakeNft(_from);
    //     }

    //     users[_from].stakedNftId = _tokenId + 1;

    //     emit StakedNft(_from, _tokenId);

    //     return ERC721_RECEIVED;
    // }

    // /// @notice unstakes current user nft
    // function unstakeNft() external override nonReentrant whenNotPaused {
    //     _unstakeNft(msg.sender);
    // }

    // /// @notice private function used to unstake nft
    // /// @param _addr the address of the nft owner
    // function _unstakeNft(address _addr) private {
    //     uint256 stakedNftId = users[_addr].stakedNftId;
    //     require(stakedNftId > 0, 'No NFT is staked');
    //     uint256 nftId = stakedNftId - 1;

    //     nft.safeTransferFrom(address(this), _addr, nftId, '');

    //     users[_addr].stakedNftId = 0;
    //     emit UnstakedNft(_addr, nftId);
    // }

    // /// @notice gets id of the staked nft
    // /// @param _addr the addres of the nft staker
    // /// @return id of the staked nft by _addr user
    // /// if the user haven't stake any nft, tx reverts
    // function getStakedNft(address _addr) external view override(IVeWom) returns (uint256) {
    //     uint256 stakedNftId = users[_addr].stakedNftId;
    //     require(stakedNftId > 0, 'not staking');
    //     return stakedNftId - 1;
    // }

    // /// @notice get votes for veWOM
    // /// @dev votes should only count if account has > threshold% of current cap reached
    // /// @dev invVoteThreshold = (1/threshold%)*100
    // /// @return the valid votes
    // function getVotes(address _account) external view virtual override returns (uint256) {
    //     uint256 veWomBalance = balanceOf(_account);

    //     // check that user has more than voting treshold of maxCap and has wom in stake
    //     if (veWomBalance * invVoteThreshold > users[_account].amount * maxCap && isUser(_account)) {
    //         return veWomBalance;
    //     } else {
    //         return 0;
    //     }
    // }
}
