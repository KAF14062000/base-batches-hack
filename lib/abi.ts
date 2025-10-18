export const GROUP_SPLIT_ABI = [
  "event SplitCreated(uint256 indexed id, address indexed creator, string memo, address[] people, uint256[] shares)",
  "event Settled(uint256 indexed id, address indexed payer, address indexed to, uint256 amount)",
  "function nextId() view returns (uint256)",
  "function createSplit(string memo, address[] people, uint256[] shares) returns (uint256 id)",
  "function settle(uint256 id, address to) payable",
] as const
