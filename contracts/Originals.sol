// SPDX-License-Identifier: None
pragma solidity 0.8.8;

import "@openzeppelin/contracts/access/Ownable.sol";
import "erc721a/contracts/ERC721A.sol";
import "./ERC2981.sol";

error SeedAlreadySet();
error EmptyInput();
error MintNotActive();
error NotTheBatOwner(uint256 batId);
error BatAlreadyClaimed();

contract Originals is ERC721A, Ownable, ERC2981 {
  IERC721 public CryptoBatz;

  bool public mintActive;

  // Keeps track of whether each CryptoBat has been used to claim
  mapping(uint256 => bool) private batClaimed;

  // Token URI for unreveleaed artwork
  string private defaultTokenURI = "ipfs://hash";
  // Token URIs for the 4 Ozzy Originals artworks
  string[] private tokenURIs = ["ipfs://1", "ipfs://2", "ipfs://3", "ipfs://4"];

  // These precalculated vectors are for distributing the 4 artworks randomly according to the following probabilities
  // 1 - 1%, 2 - 15%, 3 - 31%, 4 - 53%
  uint16[] private p_vector = [2712, 40680, 56504, 65535];
  uint256[] private y_vector = [3, 2, 3, 3];

  // Randomized seed for distributing the 4 artworks
  uint256 public randomizedSeed;

  constructor(address cryptoBatzAddress)
    ERC721A("Originals by Ozzy Osbourne", "OZZY")
  {
    CryptoBatz = IERC721(cryptoBatzAddress);
    _setRoyalties(address(this), 750); // 7.5% royalties, TODO replace address with actual royalty payout address for Ozzy TBD
  }

  /// @dev Each CryptoBatz Id can only be claimed once, and must be owned by the tx sender
  /// @param tokenIds an array of CryptoBatz Ids to use for claiming an Originals artwork
  function mint(uint256[] calldata tokenIds) external {
    if (!mintActive) revert MintNotActive();
    if (tokenIds.length == 0) revert EmptyInput();

    for (uint256 i = 0; i < tokenIds.length; i++) {
      if (CryptoBatz.ownerOf(tokenIds[i]) != msg.sender)
        revert NotTheBatOwner(tokenIds[i]);
      if (batClaimed[tokenIds[i]]) revert BatAlreadyClaimed();

      batClaimed[tokenIds[i]] = true;
    }

    _safeMint(msg.sender, tokenIds.length);
  }

  /// @notice Check if the list of CryptoBatz can are eligible to claim an Ozzy Original
  /// @param tokenIds an array of tokenIds to check
  /// @return an array of bool, true = bat can still claim
  function canBatsClaim(uint256[] calldata tokenIds)
    external
    view
    returns (bool[] memory)
  {
    require(tokenIds.length > 0, "Empty array");

    bool[] memory canClaim = new bool[](tokenIds.length);

    for (uint256 i = 0; i < tokenIds.length; i++) {
      canClaim[i] = !batClaimed[tokenIds[i]];
    }

    return canClaim;
  }

  function tokenURI(uint256 tokenId)
    public
    view
    override
    returns (string memory)
  {
    if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

    if (randomizedSeed == 0) return defaultTokenURI;

    return tokenURIs[getArtworkId(tokenId)];
  }

  /// @dev Allows the contract owner to enable/disable minting
  function toggleMintActive() external onlyOwner {
    mintActive = !mintActive;
  }

  /// @dev Allows the contract owner to set a randomized seed, can only be called only once
  function setRandomizedSeed() external onlyOwner {
    if (randomizedSeed > 0) revert SeedAlreadySet();

    randomizedSeed = uint256(
      keccak256(
        abi.encodePacked(
          block.coinbase,
          blockhash(block.number - 1),
          block.timestamp,
          block.difficulty
        )
      )
    );
  }

  /// @dev Picks 1 of the 4 artworks for a given tokenId, based on the randomized seed,
  /// and according to the preset probabilities
  function getArtworkId(uint256 tokenId) internal view returns (uint256) {
    uint256 seed = uint256(
      keccak256(abi.encodePacked(randomizedSeed, tokenId))
    );

    uint256 bucket = uint16(seed) % 4;

    if (uint16(seed >> 16) < p_vector[bucket]) return bucket;

    return y_vector[bucket];
  }

  function _startTokenId() internal pure override returns (uint256) {
    return 1;
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC2981, ERC721A)
    returns (bool)
  {}
}
