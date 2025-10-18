"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { useExpenseHistory } from "@/hooks/use-expense-history"
import { formatCurrency } from "@/lib/format"
import { roundCurrency } from "@/lib/math"
import {
  type ExpenseSnapshot,
  type Group,
  type GroupMember,
  type OCRDoc,
  invitePayloadSchema,
  receiptCategorySchema,
} from "@/lib/schemas"

const categories = receiptCategorySchema.options

type EditableItem = OCRDoc["items"][number] & { id?: string }

type EditableDoc = Omit<OCRDoc, "items"> & {
  items: EditableItem[]
  notes?: string
}

function createMember(): GroupMember {
  return { id: crypto.randomUUID(), name: "", wallet: "" }
}

function createInitialGroup(): Group {
  const first = createMember()
  return {
    id: crypto.randomUUID(),
    name: "",
    members: [first],
    payerId: first.id,
  }
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:${file.type};base64,${btoa(binary)}`
}

function recalc(doc: EditableDoc): EditableDoc {
  const subtotal = roundCurrency(
    doc.items.reduce((total, item) => total + (item.price || 0) * (item.qty ?? 1), 0),
  )
  return {
    ...doc,
    subtotal,
    total: roundCurrency(subtotal + doc.tax),
  }
}

export default function UploadPage() {
  const [receipt, setReceipt] = useState<EditableDoc | null>(null)
  const [group, setGroup] = useState<Group>(() => createInitialGroup())
  const [imagePreview, setImagePreview] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [inviteLink, setInviteLink] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expenseId, setExpenseId] = useState<string>("")
  const [progress, setProgress] = useState(0)
  const progressTimer = useRef<number | null>(null)
  const params = useSearchParams()
  const loadedExpenseId = useRef<string | null>(null)
  const { history, addExpense, upsertExpense } = useExpenseHistory()
  const busy = uploading || creatingInvite

  useEffect(() => {
    return () => {
      if (progressTimer.current) {
        window.clearInterval(progressTimer.current)
        progressTimer.current = null
      }
    }
  }, [])

  useEffect(() => {
    const id = params.get("expenseId")
    if (!id || loadedExpenseId.current === id) {
      return
    }
    const existing = history.find((expense) => expense.id === id)
    if (!existing) {
      return
    }
    loadedExpenseId.current = id
    setExpenseId(existing.id)
    setGroup({
      id: existing.groupId,
      name: existing.groupName,
      members: existing.members,
      payerId: existing.payerId,
    })
    setReceipt(
      recalc({
        ...existing.expense,
        notes: existing.expense.notes ?? "",
        items: existing.expense.items.map((item) => ({ ...item })),
      }),
    )
    setImagePreview("")
  }, [history, params])

  const startProgress = () => {
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current)
    }
    setProgress(10)
    progressTimer.current = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 90) return value
        return value + 8
      })
    }, 250)
  }

  const finishProgress = () => {
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current)
      progressTimer.current = null
    }
    setProgress(100)
    window.setTimeout(() => setProgress(0), 400)
  }

  const resetProgress = () => {
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current)
      progressTimer.current = null
    }
    setProgress(0)
  }

  const totals = useMemo(() => {
    if (!receipt) return null
    return {
      subtotal: formatCurrency(receipt.subtotal, receipt.currency),
      tax: formatCurrency(receipt.tax, receipt.currency),
      total: formatCurrency(receipt.total, receipt.currency),
    }
  }, [receipt])

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    startProgress()
    try {
      const base64 = await fileToBase64(file)
      setImagePreview(base64)
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "OCR failed" }))
        throw new Error(error.message ?? "OCR failed")
      }
      const data = (await response.json()) as OCRDoc
      const enriched: EditableDoc = {
        ...data,
        notes: "",
        items: data.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
      }
      const parsed = recalc(enriched)
      setReceipt(parsed)
      const newExpenseId = crypto.randomUUID()
      setExpenseId(newExpenseId)
      loadedExpenseId.current = newExpenseId
      toast({ title: "Receipt parsed", description: "Review the items before inviting." })
      finishProgress()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process receipt"
      toast({ title: "OCR error", description: message, variant: "destructive" })
      resetProgress()
    } finally {
      setUploading(false)
    }
  }

  const updateReceipt = (updater: (draft: EditableDoc) => EditableDoc) => {
    setReceipt((current) => (current ? recalc(updater({ ...current })) : current))
  }

  const updateMember = (memberId: string, patch: Partial<GroupMember>) => {
    setGroup((current) => ({
      ...current,
      members: current.members.map((member) => (member.id === memberId ? { ...member, ...patch } : member)),
    }))
  }

  const handleSaveBill = () => {
    if (!receipt) {
      toast({ title: "Upload a receipt first", variant: "destructive" })
      return
    }

    const itemsWithIds = receipt.items.map((item, index) => ({
      ...item,
      id: item.id ?? `${index}-${crypto.randomUUID()}`,
    }))

    const normalized = recalc({ ...receipt, items: itemsWithIds })
    setReceipt(normalized)

    const snapshotId = expenseId || crypto.randomUUID()
    const existing = history.find((entry) => entry.id === snapshotId)

    const snapshot: ExpenseSnapshot = {
      id: snapshotId,
      groupId: group.id,
      groupName: group.name.trim() || "Untitled bill",
      payerId: group.payerId,
      members: group.members,
      expense: {
        ...normalized,
        items: itemsWithIds,
      },
      shares: existing?.shares ?? [],
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }

    upsertExpense(snapshot)
    if (!expenseId) {
      setExpenseId(snapshotId)
    }
    loadedExpenseId.current = snapshotId
    toast({ title: "Bill saved", description: "Find it anytime on the Bills page." })
  }

  const addMemberField = () => {
    setGroup((current) => {
      const nextMembers = [...current.members, createMember()]
      return { ...current, members: nextMembers }
    })
  }

  const removeMember = (memberId: string) => {
    setGroup((current) => {
      if (current.members.length === 1) return current
      const filtered = current.members.filter((member) => member.id !== memberId)
      const payerId = filtered.find((member) => member.id === current.payerId)?.id ?? filtered[0].id
      return { ...current, members: filtered, payerId }
    })
  }

  const handleCreateInvite = async () => {
    if (!receipt) {
      toast({ title: "Add a receipt first", variant: "destructive" })
      return
    }
    if (!group.name.trim()) {
      toast({ title: "Group needs a name", variant: "destructive" })
      return
    }
    const emptyMember = group.members.find((member) => !member.name.trim() || !member.wallet.trim())
    if (emptyMember) {
      toast({ title: "All members need names and wallets", variant: "destructive" })
      return
    }

    setCreatingInvite(true)
    try {
      const response = await fetch("/api/invite/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, expense: receipt, expenseId }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Invite failed" }))
        throw new Error(error.message ?? "Invite failed")
      }

      const { inviteUrl, token } = (await response.json()) as { inviteUrl: string; token: string }
      setInviteLink(inviteUrl)
      setDialogOpen(true)

      const verifyResponse = await fetch(`/api/invite/verify?token=${encodeURIComponent(token)}`)
      if (!verifyResponse.ok) {
        throw new Error("Failed to verify invite payload")
      }
      const parsed = invitePayloadSchema.parse(await verifyResponse.json())
      addExpense({
        id: parsed.expenseId,
        groupId: parsed.groupId,
        groupName: parsed.groupName,
        payerId: parsed.payerId,
        members: parsed.members,
        expense: parsed.expense,
        shares: [],
        createdAt: parsed.createdAt,
      })

      toast({ title: "Invite ready", description: "Share the link or copy the token." })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invite creation failed"
      toast({ title: "Invite error", description: message, variant: "destructive" })
    } finally {
      setCreatingInvite(false)
    }
  }

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      toast({ title: "Invite copied" })
    } catch {
      toast({ title: "Copy failed", variant: "destructive" })
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12" aria-busy={busy}>
      {uploading ? (
        <div className="pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-2 px-6">
            <p className="text-center text-sm font-medium">Processing receipt…</p>
            <Progress value={progress} className="h-2 w-full" />
          </div>
        </div>
      ) : null}
      <header className="grid gap-2">
        <Badge variant="outline" className="w-fit">
          Step 1 · Upload &amp; review
        </Badge>
        <h1 className="text-3xl font-semibold">Receipt OCR &amp; group setup</h1>
        <p className="text-muted-foreground">
          Drop a receipt image, tweak the parsed items, and prepare your Base Sepolia split in minutes.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Receipt</CardTitle>
            <CardDescription>Upload a photo or PDF. We send a single request to Qwen3-VL via Ollama Cloud.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Input type="file" accept="image/*,.pdf" onChange={handleFile} disabled={busy} />
            {imagePreview ? (
              <Image
                src={imagePreview}
                alt="Receipt preview"
                width={400}
                height={400}
                className="h-auto max-h-64 w-auto rounded-md border object-cover"
              />
            ) : null}
            {receipt ? (
              <div className="grid gap-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    value={receipt.merchant}
                    placeholder="Merchant"
                    onChange={(event) => updateReceipt((draft) => ({ ...draft, merchant: event.target.value }))}
                  />
                  <Input
                    value={receipt.date}
                    placeholder="Date"
                    onChange={(event) => updateReceipt((draft) => ({ ...draft, date: event.target.value }))}
                  />
                  <Input
                    value={receipt.currency}
                    placeholder="Currency"
                    onChange={(event) => updateReceipt((draft) => ({ ...draft, currency: event.target.value }))}
                  />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead className="w-24">Price</TableHead>
                      <TableHead className="w-44">Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipt.items.map((item, index) => (
                      <TableRow key={`${item.name}-${index}`}>
                        <TableCell>
                          <Input
                            value={item.name}
                            onChange={(event) =>
                              updateReceipt((draft) => {
                                draft.items[index] = { ...draft.items[index], name: event.target.value }
                                return draft
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.qty ?? ""}
                            onChange={(event) =>
                              updateReceipt((draft) => {
                                const qty = Number.parseFloat(event.target.value)
                                draft.items[index] = {
                                  ...draft.items[index],
                                  qty: Number.isNaN(qty) ? undefined : qty,
                                }
                                return draft
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(event) =>
                              updateReceipt((draft) => {
                                const price = Number.parseFloat(event.target.value) || 0
                                draft.items[index] = { ...draft.items[index], price }
                                return draft
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            value={item.category}
                            onChange={(event) =>
                              updateReceipt((draft) => {
                                draft.items[index] = {
                                  ...draft.items[index],
                                  category: event.target.value as (typeof categories)[number],
                                }
                                return draft
                              })
                            }
                            className="w-full rounded-md border border-input px-3 py-2 text-sm"
                          >
                            {categories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    type="number"
                    step="0.01"
                    value={receipt.tax}
                    onChange={(event) =>
                      updateReceipt((draft) => ({ ...draft, tax: Number.parseFloat(event.target.value) || 0 }))
                    }
                    placeholder="Tax"
                  />
                  <Input value={totals?.subtotal ?? ""} readOnly placeholder="Subtotal" />
                  <Input value={totals?.total ?? ""} readOnly placeholder="Total" />
                </div>

                <Textarea
                  placeholder="Notes (optional)"
                  value={receipt.notes ?? ""}
                  onChange={(event) => updateReceipt((draft) => ({ ...draft, notes: event.target.value }))}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Group setup</CardTitle>
            <CardDescription>Define who joined the expense and who fronted the payment.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Input
              placeholder="Trip or group name"
              value={group.name}
              onChange={(event) => setGroup((current) => ({ ...current, name: event.target.value }))}
              disabled={busy}
            />
            <div className="grid gap-2">
              <label className="text-sm font-medium">Who paid upfront?</label>
              <select
                value={group.payerId}
                onChange={(event) => setGroup((current) => ({ ...current, payerId: event.target.value }))}
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
                disabled={busy}
              >
                {group.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || "Unnamed member"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4">
              {group.members.map((member) => (
                <div key={member.id} className="grid gap-2 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Member</span>
                    {group.members.length > 1 ? (
                      <Button variant="ghost" size="sm" onClick={() => removeMember(member.id)} disabled={busy}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <Input
                    placeholder="Name"
                    value={member.name}
                    onChange={(event) => updateMember(member.id, { name: event.target.value })}
                    disabled={busy}
                  />
                  <Input
                    placeholder="Wallet or Basename"
                    value={member.wallet}
                    onChange={(event) => updateMember(member.id, { wallet: event.target.value })}
                    disabled={busy}
                  />
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={addMemberField} disabled={busy}>
              Add member
            </Button>

            <Button variant="secondary" onClick={handleSaveBill} disabled={!receipt || busy}>
              Save bill
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleCreateInvite} disabled={busy || !receipt}>
                  Create invite link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite ready</DialogTitle>
                  <DialogDescription>Share this link with your friends so they can self-select their items.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                  <Input value={inviteLink} readOnly />
                  <Button onClick={copyInvite} variant="outline" disabled={creatingInvite}>
                    Copy invite link
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
