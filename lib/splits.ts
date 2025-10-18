import { fromCents, toCents } from "./math"
import type { ExpenseShare, InviteItem } from "./schemas"

export type AllocationMap = Record<string, string[]>

export function computeShares(items: InviteItem[], ownership: AllocationMap): ExpenseShare[] {
  const totals = new Map<string, number>()

  for (const item of items) {
    const participants = ownership[item.id] ?? []
    if (participants.length === 0) {
      continue
    }

    const itemTotalCents = toCents((item.qty ?? 1) * item.price)
    const baseShare = Math.floor(itemTotalCents / participants.length)
    let remainder = itemTotalCents - baseShare * participants.length

    participants.forEach((memberId) => {
      const extra = remainder > 0 ? 1 : 0
      remainder -= extra
      const existing = totals.get(memberId) ?? 0
      totals.set(memberId, existing + baseShare + extra)
    })
  }

  return Array.from(totals.entries()).map(([memberId, cents]) => ({
    memberId,
    amount: fromCents(cents),
  }))
}
