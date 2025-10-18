"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useExpenseHistory } from "@/hooks/use-expense-history"
import { useWallet } from "@/hooks/use-wallet"
import { formatCurrency } from "@/lib/format"
import { ensureBaseSepolia, getProvider } from "@/lib/chain"
import { getGroupSplitContract } from "@/lib/contract"
import type { ExpenseSnapshot } from "@/lib/schemas"
import { parseEther } from "ethers"

type OwedRow = {
  expense: ExpenseSnapshot
  memberId: string
  memberName: string
  memberWallet: string
  amount: number
}

function deriveSettlementId(expenseId: string) {
  return expenseId.split("").reduce((acc, char, index) => acc + (char.charCodeAt(0) * (index + 1)), 0)
}

export default function SettlePage() {
  const { history, updateShares } = useExpenseHistory()
  const { address, connect, provider, connecting, isConnected } = useWallet()
  const [payingKey, setPayingKey] = useState<string>("")
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const owedRows = useMemo(() => {
    if (!address) return []
    return history.flatMap((expense) => {
      const payer = expense.members.find((member) => member.id === expense.payerId)
      if (!payer) return []
      const matchingMember = expense.members.find((member) => member.wallet.toLowerCase() === address.toLowerCase())
      if (!matchingMember) return []
      const rows: OwedRow[] = []
      expense.shares?.forEach((share) => {
        if (share.memberId === payer.id) return
        if (share.memberId !== matchingMember.id) return
        if (share.amount <= 0) return
        rows.push({
          expense,
          memberId: share.memberId,
          memberName: matchingMember.name || matchingMember.wallet,
          memberWallet: payer.wallet,
          amount: share.amount,
        })
      })
      return rows
    })
  }, [address, history])

  const handleConnect = async () => {
    try {
      await connect()
      toast({ title: "Wallet ready" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect"
      toast({ title: "Wallet error", description: message, variant: "destructive" })
    }
  }

  const handlePay = async (row: OwedRow) => {
    const key = `${row.expense.id}-${row.memberId}`
    const amountString = overrides[key] ?? row.amount.toFixed(4)
    try {
      if (!amountString || Number.parseFloat(amountString) <= 0) {
        throw new Error("Enter a positive amount")
      }
      if (!isConnected) {
        await connect()
      }
      await ensureBaseSepolia()
      const browserProvider = provider ?? (await getProvider())
      const signer = await browserProvider.getSigner()
      const contract = getGroupSplitContract(signer)
      setPayingKey(key)
      const tx = await contract.settle(BigInt(deriveSettlementId(row.expense.id)), row.memberWallet, {
        value: parseEther(amountString),
      })
      const receipt = await tx.wait()
      setPayingKey("")
      toast({
        title: "Payment sent",
        description: (
          <a
            href={`https://sepolia.basescan.org/tx/${receipt.hash}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            View on Basescan
          </a>
        ),
      })
      updateShares(row.expense.id, (row.expense.shares ?? []).filter((share) => share.memberId !== row.memberId))
      setOverrides((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    } catch (error) {
      setPayingKey("")
      const message = error instanceof Error ? error.message : "Failed to settle"
      toast({ title: "Settlement error", description: message, variant: "destructive" })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="grid gap-2">
        <Badge variant="outline" className="w-fit">
          Step 3 · Send ETH on Base
        </Badge>
        <h1 className="text-3xl font-semibold">Settle your splits</h1>
        <p className="text-muted-foreground">
          Review what you owe and settle directly through the GroupSplit contract on Base Sepolia.
        </p>
        <div>
          <Button onClick={handleConnect} disabled={connecting || isConnected}>
            {isConnected ? "Wallet connected" : connecting ? "Connecting…" : "Connect wallet"}
          </Button>
        </div>
      </header>

      {address ? (
        <Card>
          <CardHeader>
            <CardTitle>Outstanding payments</CardTitle>
            <CardDescription>Amounts default to local currency values. Adjust if you want to settle a different amount.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {owedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending payments for this wallet.</p>
            ) : (
              owedRows.map((row) => {
                const key = `${row.expense.id}-${row.memberId}`
                return (
                  <div key={key} className="grid gap-2 rounded-md border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{row.expense.groupName}</p>
                        <p className="text-xs text-muted-foreground">
                          Paying {row.memberWallet} — default {formatCurrency(row.amount, row.expense.expense.currency)}
                        </p>
                      </div>
                      <Input
                        className="max-w-[160px]"
                        value={overrides[key] ?? row.amount.toFixed(4)}
                        onChange={(event) =>
                          setOverrides((current) => ({ ...current, [key]: event.target.value }))
                        }
                        placeholder="Amount in ETH"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => handlePay(row)} disabled={payingKey === key}>
                        {payingKey === key ? "Paying…" : "Pay"}
                      </Button>
                      <a
                        className="text-sm text-primary hover:underline"
                        href="https://sepolia.basescan.org" target="_blank" rel="noreferrer"
                      >
                        View on Basescan
                      </a>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Connect your wallet to load owed payments.</p>
      )}
    </div>
  )
}
