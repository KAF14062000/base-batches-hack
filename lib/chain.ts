"use client"

import { BrowserProvider } from "ethers"

const BASE_SEPOLIA_PARAMS = {
  chainId: "0x14a74",
  chainName: "Base Sepolia",
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
} as const

export async function getProvider() {
  if (typeof window === "undefined") {
    throw new Error("Provider is only available in the browser")
  }

  const { ethereum } = window as unknown as { ethereum?: unknown }
  if (!ethereum) {
    throw new Error("Wallet not detected. Install a Web3 wallet like Coinbase Wallet or MetaMask.")
  }

  return new BrowserProvider(ethereum)
}

export async function ensureBaseSepolia() {
  if (typeof window === "undefined") {
    throw new Error("Cannot switch networks on the server")
  }

  const { ethereum } = window as unknown as {
    ethereum?: {
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }

  if (!ethereum?.request) {
    throw new Error("Wallet not detected. Install a Web3 wallet like Coinbase Wallet or MetaMask.")
  }

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_SEPOLIA_PARAMS.chainId }],
    })
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? (error as { code: number }).code : undefined
    if (code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [BASE_SEPOLIA_PARAMS],
      })
      return
    }
    throw new Error("Failed to switch to Base Sepolia network")
  }
}

export const baseSepoliaConfig = BASE_SEPOLIA_PARAMS
