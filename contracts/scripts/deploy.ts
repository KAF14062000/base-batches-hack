import { ethers } from "hardhat"

async function main() {
  const groupSplit = await ethers.deployContract("GroupSplit")
  await groupSplit.waitForDeployment()
  console.log("GroupSplit deployed to:", await groupSplit.getAddress())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
