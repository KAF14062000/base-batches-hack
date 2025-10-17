// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GroupSplit {
    struct Split {
        string memo;
        address creator;
        address[] people;
        uint256[] shares;
        bool exists;
    }

    mapping(uint256 => Split) private splits;
    uint256 public splitCount;

    event SplitCreated(
        uint256 indexed id,
        address indexed creator,
        string memo,
        address[] people,
        uint256[] shares
    );

    event Settled(
        uint256 indexed id,
        address indexed payer,
        address indexed to,
        uint256 amount
    );

    function createSplit(
        string memory memo,
        address[] memory people,
        uint256[] memory shares
    ) external returns (uint256 id) {
        require(people.length == shares.length, "length mismatch");
        require(people.length > 0, "no participants");

        uint256 totalShares = 0;
        for (uint256 i = 0; i < shares.length; i++) {
            require(people[i] != address(0), "invalid participant");
            require(shares[i] > 0, "invalid share");
            totalShares += shares[i];
        }
        require(totalShares > 0, "invalid total");

        id = ++splitCount;
        splits[id] = Split({
            memo: memo,
            creator: msg.sender,
            people: people,
            shares: shares,
            exists: true
        });

        emit SplitCreated(id, msg.sender, memo, people, shares);
    }

    function settle(uint256 id, address payable to) external payable {
        require(msg.value > 0, "zero value");
        require(to != address(0), "invalid recipient");
        require(splits[id].exists, "split missing");

        (bool success, ) = to.call{value: msg.value}("");
        require(success, "transfer failed");

        emit Settled(id, msg.sender, to, msg.value);
    }

    function getSplit(uint256 id)
        external
        view
        returns (
            string memory memo,
            address creator,
            address[] memory people,
            uint256[] memory shares
        )
    {
        Split storage split = splits[id];
        require(split.exists, "split missing");
        return (split.memo, split.creator, split.people, split.shares);
    }
}
