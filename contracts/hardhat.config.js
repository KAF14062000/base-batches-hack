require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { RPC_URL, DEPLOYER_KEY } = process.env;

module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {},
    baseSepolia: {
      url: RPC_URL || "https://sepolia.base.org",
      accounts: DEPLOYER_KEY ? [DEPLOYER_KEY] : [],
    },
  },
};
