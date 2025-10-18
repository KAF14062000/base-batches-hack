import { roundCurrency } from "./math"
import type { ExpenseSnapshot } from "./schemas"

function monthKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function groupByMonth(history: ExpenseSnapshot[]) {
  const map = new Map<string, number>()
  history.forEach((expense) => {
    const key = monthKey(expense.createdAt || expense.expense.date)
    map.set(key, roundCurrency((map.get(key) ?? 0) + expense.expense.total))
  })
  return Array.from(map.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => (a.month < b.month ? 1 : -1))
}

export function totalsByCategory(history: ExpenseSnapshot[], withinDays: number) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - withinDays)
  const totals = new Map<string, number>()

  history.forEach((expense) => {
    const date = new Date(expense.createdAt || expense.expense.date)
    if (Number.isNaN(date.getTime()) || date < cutoff) return
    expense.expense.items.forEach((item) => {
      const amount = roundCurrency((item.price || 0) * (item.qty ?? 1))
      totals.set(item.category, roundCurrency((totals.get(item.category) ?? 0) + amount))
    })
  })

  return Array.from(totals.entries()).map(([category, total]) => ({ category, total }))
}
