// SPDX-License-Identifier: None
pragma solidity 0.8.8;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./ERC2981.sol";
import "./SutterTreasury.sol";

contract MutantBatz is Ownable, ERC721, ERC2981, SutterTreasury {
  using ECDSA for bytes32;

  // EVENTS *****************************************************

  event MintSignerUpdated(address signer);
  event MutantBatCreated(uint256 indexed tokenId, uint256 cryptoBatId, address victimContract, uint256 victimId);
  event MutantBatIncubating(uint256 indexed tokenId, uint256 cryptoBatId, address victimContract, uint256 victimId);

  // MEMBERS ****************************************************

  uint256 public constant ANCIENT_BATZ_BITE_LIMIT = 99;
  uint256 public constant ANCIENT_BATZ_START_ID = 9667;

  IERC721 public immutable CryptoBatz;

  uint256 public totalSupply = 0;

  // Valid victim NFT contracts
  mapping(address => bool) private _isValidVictim;

  // Keep track of whether each tokenId in each victim contract has been bitten
  mapping(address => mapping(uint256 => bool)) private _victimWasBitten;

  // Keep track of whether each cryptoBat has bitten a victim
  mapping(uint256 => bool) private _cryptoBatHasBitten;

  // Keep track of how many times each ancientBat has bitten a victim
  mapping(uint256 => uint256) private _ancientBatBites;

  // TokenURI for each individual mutant bat metadata
  mapping(uint256 => string) private _mutantBatTokenURI;

  uint256 private _metadataLockedTo;

  string public defaultTokenURI;
  address public mintSigner;

  bytes32 private DOMAIN_SEPARATOR;
  bytes32 private constant TYPEHASH =
    keccak256("bite(address buyer,uint256 batId,address victimContract,uint256 victimId,string tokenURI)");

  address[] private royaltyPayees = [
    0xaDC6A7985036531c394B6dF054666C51dE29b9a9,
    0x76bf7b1e22C773754EBC608d92f71cc0B5D99d4B,
    0xE9E9206B598F6Fc95E006684Fe432f100E876110 
  ];

  uint256[] private royaltyShares = [70, 25, 5];

  // CONSTRUCTOR **************************************************

  constructor(
    string memory defaultTokenUri_,
    address cryptoBatzAddress
  )
    ERC721("MutantBatz by Ozzy Osbourne", "MBATZ")
    SutterTreasury(royaltyPayees, royaltyShares)
  {
    defaultTokenURI = defaultTokenUri_;
    CryptoBatz = IERC721(cryptoBatzAddress);

    _setRoyalties(address(this), 750); // 7.5% royalties

    uint256 chainId;
    assembly {
      chainId := chainid()
    }

    DOMAIN_SEPARATOR = keccak256(
      abi.encode(
        keccak256(
          "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        ),
        keccak256(bytes("MutantBatz")),
        keccak256(bytes("1")),
        chainId,
        address(this)
      )
    );
  }

  // PUBLIC METHODS ****************************************************

  /// @notice 
  /// @param batId tokenId of the CryptoBat used for biting
  /// @param victimContract contract address of the victim NFT collection
  /// @param victimId tokenId of the victim NFT that will be bitten
  /// @param newTokenURI contract address of the victim NFT collection
  /// @param signature signed data authenticating the validity of this transaction
  function bite(
    uint256 batId,
    address victimContract,
    uint256 victimId,
    string calldata newTokenURI,
    bytes calldata signature
  ) external {
    require(CryptoBatz.ownerOf(batId) == msg.sender, "You're not the owner of this bat");
    
    if (batId >= ANCIENT_BATZ_START_ID) {
      require(_ancientBatBites[batId] < ANCIENT_BATZ_BITE_LIMIT, "AncientBat has no more bites left");
      _ancientBatBites[batId]++;
    } else {
      require(!_cryptoBatHasBitten[batId], "CryptoBat has already bitten");
      _cryptoBatHasBitten[batId] = true;
    }
    
    require(_isValidVictim[victimContract], "This NFT cannot be bitten");
    require(IERC721(victimContract).ownerOf(victimId) == msg.sender, "You're not the owner of this victim");
    require(!_victimWasBitten[victimContract][victimId], "This victim has already been bitten");

    _victimWasBitten[victimContract][victimId] = true;

    require(mintSigner != address(0), "Mint signer has not been set");
    bytes32 digest = keccak256(
      abi.encodePacked(
        "\x19\x01",
        DOMAIN_SEPARATOR,
        keccak256(abi.encode(TYPEHASH, msg.sender, batId, victimContract, victimId, keccak256(bytes(newTokenURI))))
      )
    );
    address signer = digest.recover(signature);
    require(signer != address(0) && signer == mintSigner, "Invalid signature");

    uint256 newTokenId = ++totalSupply;

    if (bytes(newTokenURI).length > 0) {
      _mutantBatTokenURI[newTokenId] = newTokenURI;
      emit MutantBatCreated(newTokenId, batId, victimContract, victimId);
    } else {
      emit MutantBatIncubating(newTokenId, batId, victimContract, victimId);
    }

    _safeMint(msg.sender, newTokenId);
  }

  function isTokenMetadataLocked(uint256 tokenId)
    public
    view
    returns (bool)
  {
    require(_exists(tokenId), "URI query for nonexistent token");

    return tokenId <= _metadataLockedTo;
  }

  /// @inheritdoc	ERC165
  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, ERC2981)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  } 

  /// @inheritdoc	ERC721
  function tokenURI(uint256 tokenId) public view override returns (string memory) {
    require(_exists(tokenId), "URI query for nonexistent token");

    string memory _tokenURI = _mutantBatTokenURI[tokenId];

    // If there is no individual URI set, return the default token URI.
    if (bytes(_tokenURI).length == 0) {
      return defaultTokenURI;
    }

    return _tokenURI;
  }

  // OWNER METHODS ********************************************************

  function setDefaultTokenURI(string calldata newTokenURI) external onlyOwner {
    require(bytes(newTokenURI).length > 0, "TokenURI cannot be empty");

    defaultTokenURI = newTokenURI;
  }

  function enableVictim(address contractAddress) external onlyOwner {
    require(contractAddress != address(0), "0 address not accepted");
    require(_isValidVictim[contractAddress] == false, "Victim already enabled");

    _isValidVictim[contractAddress] = true;
  }

  function disableVictim(address contractAddress) external onlyOwner {
    require(_isValidVictim[contractAddress] == true, "Victim not enabled");

    delete _isValidVictim[contractAddress];
  }

  function updateTokenURI(uint256 tokenId, string calldata newTokenURI) external onlyOwner {
    require(_exists(tokenId), "URI query for nonexistent token");
    require(!isTokenMetadataLocked(tokenId), "Token metadata URI has been locked");
    require(bytes(newTokenURI).length > 0, "TokenURI cannot be empty");

    _mutantBatTokenURI[tokenId] = newTokenURI;
  }

  function lockTokenMetadataTo(uint256 tokenId) external onlyOwner {
    require(tokenId <= totalSupply, "Locking beyond current supply");
    require(tokenId > _metadataLockedTo, "Must increase beyond current lock");

    _metadataLockedTo = tokenId;
  }

  function setMintSigner(address newMintSigner) external onlyOwner {
    emit MintSignerUpdated(newMintSigner);
    mintSigner = newMintSigner;
  }
}
