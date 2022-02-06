// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;

import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../interfaces/IWombatNFT.sol';

/// @notice "mock" ERC721URIStorage implementation
/// Simple example to allow us to test with veWOM staking contract.
contract MockNFT is Ownable, ERC721URIStorage {
    struct Wombat {
        uint32 power;
        uint16 level;
        uint16 score;
        uint8 eyes;
        uint8 mouth;
        uint8 foot;
        uint8 body;
        uint8 rump;
        uint8 accessories;
        uint8 ability;
    }

    uint256 public mintingLimit = 2000;
    Wombat[] public wombats;

    /// @notice An event emitted when new NFT is minted
    event Mint(uint256 itemId);

    modifier hasStock() {
        require(wombats.length <= mintingLimit, 'no more NFTs');
        _;
    }

    constructor() ERC721('Wombat NFT', 'PNFT') {}

    function setMintingLimit(uint32 newMintingLimit) external onlyOwner {
        mintingLimit = newMintingLimit;
    }

    // mock function that allows everyone to mint an nft with any characteristics
    function mint(
        uint8 ability,
        uint32 power,
        uint8 score,
        uint8 eyes,
        uint8 mouth,
        uint8 foot,
        uint8 body,
        uint8 rump,
        uint8 accessories
    ) external hasStock returns (uint256) {
        uint256 newItemId = wombats.length;
        _safeMint(msg.sender, newItemId);

        wombats.push(
            Wombat(
                power,
                0, //level
                score, // 1 -> 24 = sum of
                eyes, // D = 1 ,  A = 4
                mouth, // D = 1 ,  A = 4
                foot, // D = 1 ,  A = 4
                body, // D = 1 ,  A = 4
                rump, // D = 1 ,  A = 4
                accessories, // D = 1 ,  A = 4
                ability
            )
        );

        emit Mint(newItemId);

        return newItemId;
    }

    function setTokenURI(uint256 tokenId, string memory _tokenURI) public {
        require(_isApprovedOrOwner(_msgSender(), tokenId));
        _setTokenURI(tokenId, _tokenURI);
    }

    function setLevel(uint256 nftId, uint8 _level) public {
        require(nftId < wombats.length, 'Wombat not exist');
        wombats[nftId].level = _level;
    }

    function getWombatDetails(uint256 nftId)
        public
        view
        returns (
            uint16 level,
            uint8 ability,
            uint32 power
        )
    {
        require(nftId < wombats.length, 'Wombat not exist');
        return (wombats[nftId].level, uint8(wombats[nftId].ability), wombats[nftId].power);
    }
}
