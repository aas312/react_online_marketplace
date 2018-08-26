pragma solidity ^0.4.18;

import "zeppelin/contracts/ownership/Ownable.sol";

contract SimpleStorage is Ownable {
  uint storedData;

  function set(uint x) public {
    storedData = x;
  }

  function get() public view returns (uint) {
    return storedData;
  }
}
