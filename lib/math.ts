export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function toCents(value: number) {
  return Math.round(value * 100)
}

export function fromCents(value: number) {
  return roundCurrency(value / 100)
}
