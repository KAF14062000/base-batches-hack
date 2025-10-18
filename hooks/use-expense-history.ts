"use client"

import { useCallback, useEffect, useState } from "react"

import type { ExpenseShare, ExpenseSnapshot } from "@/lib/schemas"

const STORAGE_KEY = "better-splitwise-history-v1"

function readStorage(): ExpenseSnapshot[] {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ExpenseSnapshot[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function writeStorage(data: ExpenseSnapshot[]) {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function useExpenseHistory() {
  const [history, setHistory] = useState<ExpenseSnapshot[]>([])

  useEffect(() => {
    setHistory(readStorage())
  }, [])

  const addExpense = useCallback((expense: ExpenseSnapshot) => {
    setHistory((previous) => {
      const next = [expense, ...previous]
      writeStorage(next)
      return next
    })
  }, [])

  const updateShares = useCallback((expenseId: string, shares: ExpenseShare[]) => {
    setHistory((previous) => {
      const next = previous.map((expense) => (expense.id === expenseId ? { ...expense, shares } : expense))
      writeStorage(next)
      return next
    })
  }, [])

  const upsertExpense = useCallback((expense: ExpenseSnapshot) => {
    setHistory((previous) => {
      const exists = previous.some((item) => item.id === expense.id)
      const next = exists ? previous.map((item) => (item.id === expense.id ? expense : item)) : [expense, ...previous]
      writeStorage(next)
      return next
    })
  }, [])

  const removeExpense = useCallback((expenseId: string) => {
    setHistory((previous) => {
      const next = previous.filter((expense) => expense.id !== expenseId)
      writeStorage(next)
      return next
    })
  }, [])

  return {
    history,
    addExpense,
    updateShares,
    upsertExpense,
    removeExpense,
  }
}
