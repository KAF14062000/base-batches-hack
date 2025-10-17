const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const GroupSplit = await hre.ethers.getContractFactory("GroupSplit");
  const contract = await GroupSplit.deploy();
  await contract.waitForDeployment();
  console.log(`GroupSplit deployed to ${await contract.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
