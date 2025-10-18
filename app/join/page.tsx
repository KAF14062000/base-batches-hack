"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { useExpenseHistory } from "@/hooks/use-expense-history"
import { formatCurrency, formatDate } from "@/lib/format"
import { computeShares, type AllocationMap } from "@/lib/splits"
import type { InvitePayload } from "@/lib/schemas"

export default function JoinPage() {
  const params = useSearchParams()
  const token = params.get("token")
  const [data, setData] = useState<InvitePayload | null>(null)
  const [allocation, setAllocation] = useState<AllocationMap>({})
  const [loading, setLoading] = useState(false)
  const storedRef = useRef(false)
  const { history, addExpense, updateShares } = useExpenseHistory()

  useEffect(() => {
    if (!token) {
      toast({ title: "Missing invite token", variant: "destructive" })
      return
    }
    setLoading(true)
    fetch(`/api/invite/verify?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: "Invalid invite" }))
          throw new Error(error.message ?? "Invite verification failed")
        }
        return (await response.json()) as InvitePayload
      })
      .then((payload) => {
        setData(payload)
        const defaultAlloc: AllocationMap = {}
        payload.expense.items.forEach((item) => {
          defaultAlloc[item.id] = [payload.payerId]
        })
        setAllocation(defaultAlloc)
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Invite verification failed"
        toast({ title: "Invite error", description: message, variant: "destructive" })
      })
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (!data || storedRef.current) return
    storedRef.current = true
    const exists = history.some((expense) => expense.id === data.expenseId)
    if (!exists) {
      addExpense({
        id: data.expenseId,
        groupId: data.groupId,
        groupName: data.groupName,
        payerId: data.payerId,
        members: data.members,
        expense: data.expense,
        createdAt: data.createdAt,
        shares: [],
      })
    }
  }, [addExpense, data, history])

  const shares = useMemo(() => {
    if (!data) return []
    return computeShares(data.expense.items, allocation)
  }, [allocation, data])

  const totalByMember = useMemo(() => {
    if (!data) return {}
    const result: Record<string, number> = {}
    shares.forEach((share) => {
      result[share.memberId] = share.amount
    })
    return result
  }, [shares, data])

  const toggleAllocation = (itemId: string, memberId: string) => {
    setAllocation((current) => {
      const currentMembers = new Set(current[itemId] ?? [])
      if (currentMembers.has(memberId)) {
        currentMembers.delete(memberId)
      } else {
        currentMembers.add(memberId)
      }
      return { ...current, [itemId]: Array.from(currentMembers) }
    })
  }

  const toggleAllForMember = (memberId: string, include: boolean) => {
    if (!data) return
    setAllocation((current) => {
      const next: AllocationMap = { ...current }
      data.expense.items.forEach((item) => {
        const entries = new Set(next[item.id] ?? [])
        if (include) {
          entries.add(memberId)
        } else {
          entries.delete(memberId)
        }
        next[item.id] = Array.from(entries)
      })
      return next
    })
  }

  const handleSave = () => {
    if (!data) return
    updateShares(data.expenseId, shares)
    toast({ title: "Selections saved" })
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">Invite token missing</h1>
        <p className="text-muted-foreground">Ask the group owner to share the correct link.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Verifying invite…</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">Invite not found</h1>
        <p className="text-muted-foreground">Double-check the link or reach the person who created the split.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="grid gap-2">
        <Badge variant="outline" className="w-fit">
          Step 2 · Claim your items
        </Badge>
        <h1 className="text-3xl font-semibold">{data.groupName}</h1>
        <p className="text-muted-foreground">
          {formatDate(data.expense.date)} · {data.expense.merchant}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Receipt items</CardTitle>
          <CardDescription>Toggle the boxes for everything you consumed.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Item</TableHead>
                <TableHead className="w-24">Price</TableHead>
                {data.members.map((member) => (
                  <TableHead key={member.id} className="text-center">
                    {member.name || "Friend"}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.expense.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.category}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(item.price * (item.qty ?? 1), data.expense.currency)}</TableCell>
                  {data.members.map((member) => {
                    const checked = allocation[item.id]?.includes(member.id) ?? false
                    return (
                      <TableCell key={`${item.id}-${member.id}`} className="text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={checked}
                          onChange={() => toggleAllocation(item.id, member.id)}
                        />
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Per-member totals</CardTitle>
            <CardDescription>Values update instantly as you toggle items.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{member.name || member.wallet}</p>
                  <p className="text-xs text-muted-foreground">Wallet: {member.wallet}</p>
                </div>
                <span className="text-sm font-semibold">
                  {formatCurrency(totalByMember[member.id] ?? 0, data.expense.currency)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Shortcuts for when you only had your own items.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.members.map((member) => (
              <div key={member.id} className="flex items-center gap-2">
                <Input value={member.name || member.wallet} readOnly />
                <Button onClick={() => toggleAllForMember(member.id, true)} variant="outline" size="sm">
                  Select all
                </Button>
                <Button onClick={() => toggleAllForMember(member.id, false)} variant="ghost" size="sm">
                  Clear
                </Button>
              </div>
            ))}
            <Button onClick={handleSave}>Save selections</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
