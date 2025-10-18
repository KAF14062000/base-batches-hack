"use client"

import { useCallback, useState } from "react"
import { BrowserProvider } from "ethers"

import { ensureBaseSepolia, getProvider } from "@/lib/chain"

export function useWallet() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [address, setAddress] = useState<string>("")
  const [connecting, setConnecting] = useState(false)

  const connect = useCallback(async () => {
    if (connecting) return
    setConnecting(true)
    try {
      const browserProvider = await getProvider()
      await ensureBaseSepolia()
      const accounts = await browserProvider.send("eth_requestAccounts", [])
      const account = Array.isArray(accounts) ? accounts[0] : ""
      setProvider(browserProvider)
      setAddress(account ?? "")
      return account ?? ""
    } finally {
      setConnecting(false)
    }
  }, [connecting])

  return {
    provider,
    address,
    connecting,
    connect,
    isConnected: Boolean(address),
  }
}
