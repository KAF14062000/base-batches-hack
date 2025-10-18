import { Contract, Signer } from "ethers"

import { GROUP_SPLIT_ABI } from "./abi"

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS

function assertAddress() {
  if (!contractAddress) {
    throw new Error("Missing NEXT_PUBLIC_CONTRACT_ADDRESS environment variable")
  }
  return contractAddress
}

export function getGroupSplitContract(signer: Signer) {
  return new Contract(assertAddress(), GROUP_SPLIT_ABI, signer)
}
