/** Formats rupees using the Indian lakh/crore convention, e.g. 1245000 -> "₹12.45 Lakhs". */
export function formatRupeesShort(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} Lakhs`
  return `₹${amount.toLocaleString('en-IN')}`
}

export function formatCount(value: number): string {
  return value.toLocaleString('en-IN')
}

/** e.g. 2026-01-12T00:00:00Z -> "Jan 12, 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

/** e.g. 2026-02-22T18:00:00Z -> "Feb 22, 06:00 PM" */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
