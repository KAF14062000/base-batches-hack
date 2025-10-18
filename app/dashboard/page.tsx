"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { useExpenseHistory } from "@/hooks/use-expense-history"
import { groupByMonth, totalsByCategory } from "@/lib/analytics"
import { formatCurrency } from "@/lib/format"
import type { Insights } from "@/lib/schemas"

export default function DashboardPage() {
  const { history } = useExpenseHistory()
  const [insights, setInsights] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(false)

  const currency = history[0]?.expense.currency ?? "USD"
  const monthly = useMemo(() => groupByMonth(history), [history])
  const recentCategories = useMemo(() => totalsByCategory(history, 30), [history])

  const fetchInsights = async () => {
    if (!history.length) {
      toast({ title: "Add an expense first", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Insights failed" }))
        throw new Error(error.message ?? "Insights failed")
      }
      const data = (await response.json()) as Insights
      setInsights(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch insights"
      toast({ title: "Insights error", description: message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="grid gap-2">
        <Badge variant="outline" className="w-fit">
          Step 4 · Stay on top
        </Badge>
        <h1 className="text-3xl font-semibold">Dashboard overview</h1>
        <p className="text-muted-foreground">
          Track how your Base splits evolve month to month and surface personalized tips within seconds.
        </p>
        <div>
          <Button onClick={fetchInsights} disabled={loading}>
            {loading ? "Loading insights…" : "Refresh insights"}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly totals</CardTitle>
            <CardDescription>Your complete expense history stored locally.</CardDescription>
          </CardHeader>
          <CardContent>
            {monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses yet. Upload a receipt to get started.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthly.map((entry) => (
                    <TableRow key={entry.month}>
                      <TableCell>{entry.month}</TableCell>
                      <TableCell>{formatCurrency(entry.total, currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last 30 days</CardTitle>
            <CardDescription>Category heat map based on recent activity.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent expenses to analyze.</p>
            ) : (
              <div className="grid gap-3">
                {recentCategories.map((entry) => (
                  <div key={entry.category} className="flex items-center justify-between rounded-md border p-3">
                    <span className="text-sm font-medium">{entry.category}</span>
                    <span className="text-sm">{formatCurrency(entry.total, currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {insights ? (
        <Card>
          <CardHeader>
            <CardTitle>AI insights</CardTitle>
            <CardDescription>Powered by Qwen3-VL via Ollama Cloud, validated with Zod.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <p className="text-sm font-semibold">Findings</p>
              <ul className="list-disc space-y-2 pl-4 text-sm">
                {insights.findings.map((finding) => (
                  <li key={finding}>{finding}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">Tips</p>
              <ul className="list-disc space-y-2 pl-4 text-sm">
                {insights.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
