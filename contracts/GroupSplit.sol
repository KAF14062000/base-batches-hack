// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract GroupSplit {
  event SplitCreated(uint256 id, address creator, string memo, address[] people, uint256[] shares);
  event Settled(uint256 id, address payer, address to, uint256 amount);

  uint256 public nextId;

  function createSplit(string calldata memo, address[] calldata people, uint256[] calldata shares) external returns (uint256 id) {
    require(people.length == shares.length && people.length > 0, "bad input");
    id = ++nextId;
    emit SplitCreated(id, msg.sender, memo, people, shares);
  }

  function settle(uint256 id, address to) external payable {
    require(msg.value > 0, "amount=0");
    (bool ok, ) = to.call{value: msg.value}("");
    require(ok, "transfer failed");
    emit Settled(id, msg.sender, to, msg.value);
  }
}
