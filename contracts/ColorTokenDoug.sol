// https://docs.openzeppelin.com/contracts/3.x/
// https://docs.openzeppelin.com/contracts/3.x/erc721
// https://docs.openzeppelin.com/contracts/3.x/access-control
// max value of uint256: 115792089237316195423570985008687907853269984665640564039457584007913129639935

// Goal: Implement a basic NFT that allows ownership of a color

pragma solidity ^0.6.0;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol";

contract ColorToken is ERC721 {
    constructor() public ERC721("ColorToken", "COLR") {}
    function awardItem(address player, uint256 tokenId) public returns (uint256){
        uint256 newItemId = tokenId;
        _mint(player, newItemId);
        return newItemId;
    }
}



