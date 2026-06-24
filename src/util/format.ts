// Format an ISO date (YYYY-MM-DD) relative to today for compact display.
export function relativeDate(iso: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [y, m, d] = iso.split('-').map(Number)
  const then = new Date(y, m - 1, d)
  const days = Math.round((today.getTime() - then.getTime()) / 86400000)

  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return then.toLocaleDateString(undefined, { weekday: 'long' })
  if (days < 14) return 'last week'
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  })
}

// Trim trailing zeros: 225.0 -> "225", 22.5 -> "22.5"
export function num(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100)
}
