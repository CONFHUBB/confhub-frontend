import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parse a date value that may be:
 *  - ISO string "2026-04-06"
 *  - Java LocalDate array [2026, 4, 6]
 *  - Java LocalDateTime array [2026, 4, 6, 10, 30]
 *  - Already a Date object
 * Returns a proper Date with 4-digit year, or null if invalid.
 */
export function safeDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (Array.isArray(value)) {
    // Java array: [year, month, day, hour?, min?, sec?]
    const [y, m, d, h = 0, min = 0, s = 0] = value
    return new Date(y, m - 1, d, h, min, s)
  }
  if (typeof value === 'string') {
    // Handle "+002026-04-06" extended ISO format
    const cleaned = value.replace(/^\+0*/, '')
    const date = new Date(cleaned)
    if (!isNaN(date.getTime())) return date
  }
  const date = new Date(value as string)
  if (!isNaN(date.getTime())) return date
  return null
}

/**
 * Format a date value safely with 4-digit year guarantee.
 * Falls back to '-' for null/undefined/invalid values.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const d = safeDate(dateStr)
    if (!d) return dateStr
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d)
  } catch {
    return dateStr ?? '-'
  }
}

/**
 * Format date for display: "Apr 6, 2026"
 */
export function fmtDate(value: unknown): string {
  const d = safeDate(value)
  if (!d) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
