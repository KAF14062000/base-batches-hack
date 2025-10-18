"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useExpenseHistory } from "@/hooks/use-expense-history"
import { toast } from "@/hooks/use-toast"
import { formatCurrency, formatDate } from "@/lib/format"

export default function BillsPage() {
  const { history, removeExpense } = useExpenseHistory()
  const sorted = [...history].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  const handleDelete = (id: string, name: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Delete bill "${name || "Untitled"}"? This cannot be undone.`)
      if (!confirmed) return
    }
    removeExpense(id)
    toast({ title: "Bill deleted" })
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="grid gap-2">
        <Badge variant="outline" className="w-fit">
          Saved bills
        </Badge>
        <h1 className="text-3xl font-semibold">Manage receipts</h1>
        <p className="text-muted-foreground">
          Every saved bill lives here. Jump back into Upload to edit, invite friends, or settle up later.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Stored bills</CardTitle>
          <CardDescription>Saved locally on this device. Edit routes stay private to you.</CardDescription>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              <p>No bills saved just yet.</p>
              <Button asChild size="sm">
                <Link href="/upload">Upload a receipt</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Total</TableHead>
                  <TableHead className="w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{expense.groupName}</span>
                        <span className="text-xs text-muted-foreground">{expense.expense.merchant}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(expense.createdAt)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatCurrency(expense.expense.total, expense.expense.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/upload?expenseId=${expense.id}`}>Edit</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(expense.id, expense.groupName)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
