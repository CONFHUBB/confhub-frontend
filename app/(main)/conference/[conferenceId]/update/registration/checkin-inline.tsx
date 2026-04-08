'use client'

import { useState } from 'react'
import { checkIn, CheckInResponse } from '@/app/api/registration.api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, ScanLine, Loader2, AlertCircle } from 'lucide-react'

// ─────────────────────────────────────────────
// CHECK-IN INLINE (for Chair sidebar)
// ─────────────────────────────────────────────
export interface CheckInHistoryEntry {
  code: string
  response: CheckInResponse
}

interface CheckInInlineProps {
  conferenceId: number
  /** Persisted history from parent — survives tab switches */
  checkInHistory: CheckInHistoryEntry[]
  /** Called after each successful check-in so parent can persist history */
  onCheckInSuccess: (entry: CheckInHistoryEntry) => void
}

export function CheckInInline({ conferenceId, checkInHistory, onCheckInSuccess }: CheckInInlineProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CheckInResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheckIn = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await checkIn(code.trim())
      setResult(res)
      onCheckInSuccess({ code: code.trim(), response: res })
      setCode('')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Check-in failed. Please verify the code.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit on full QR scan (UUID or reg number format)
  const handleCodeChange = (val: string) => {
    setCode(val)
    if (val.length === 36 || /^CONF\d{4}-\d{5}$/.test(val)) {
      setTimeout(() => handleCheckIn(), 100)
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
        <ScanLine className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-700">Focus the input field and scan the attendee's QR code, or type the registration number manually.</p>
      </div>

      <form onSubmit={handleCheckIn} className="flex gap-3">
        <Input
          value={code}
          onChange={e => handleCodeChange(e.target.value)}
          placeholder="Scan QR or enter CONF2026-XXXXX..."
          className="flex-1 font-mono"
          autoFocus
        />
        <Button type="submit" disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check In'}
        </Button>
      </form>

      {result && (
        <div className={`rounded-xl border p-5 ${result.isCheckedIn ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-center gap-3">
            {result.isCheckedIn
              ? <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
              : <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
            }
            <div>
              <p className="font-bold text-gray-900 text-lg">{result.attendeeName}</p>
              <p className="text-sm text-gray-500">{result.attendeeEmail} · {result.ticketTypeName}</p>
              <p className="text-xs font-mono text-gray-400 mt-0.5">{result.registrationNumber}</p>
            </div>
          </div>
          <p className={`mt-3 text-sm font-semibold ${result.isCheckedIn ? 'text-green-700' : 'text-yellow-700'}`}>
            {result.message}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {checkInHistory.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent Check-ins ({checkInHistory.length})</p>
          <div className="space-y-2">
            {checkInHistory.map((h, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg border px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{h.response.attendeeName}</p>
                  <p className="text-xs text-gray-400 font-mono">{h.response.registrationNumber}</p>
                </div>
                <Badge className={h.response.isCheckedIn ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                  {h.response.isCheckedIn ? '✓ Checked In' : 'Issue'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
