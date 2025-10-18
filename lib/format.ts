export function formatCurrency(amount: number, currency: string) {
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.length === 3 ? currency.toUpperCase() : "USD",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })
    return formatter.format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString()
}
