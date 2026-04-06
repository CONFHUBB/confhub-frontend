'use client'

import { useState, useEffect } from 'react'
import { checkIn, CheckInResponse } from '@/app/api/registration.api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, ScanLine, Loader2, AlertCircle } from 'lucide-react'

export default function CheckInPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CheckInResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<{ code: string; response: CheckInResponse }[]>([])

  const handleCheckIn = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await checkIn(code.trim())
      setResult(res)
      setHistory((prev) => [{ code: code.trim(), response: res }, ...prev.slice(0, 19)])
      setCode('')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Check-in failed. Please verify the code.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit if code looks like UUID (36 chars) or reg number scanned via QR reader
  useEffect(() => {
    if (code.length === 36 || code.match(/^CONF\d{4}-\d{5}$/)) {
      handleCheckIn()
    }
  }, [code])

  return (
    <div className="page-narrow">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-primary" />
          On-Site Check-In
        </h1>
        <p className="text-gray-500 text-sm mt-1">Scan QR code or enter registration number to check in attendees.</p>
      </div>

      {/* Input */}
      <form onSubmit={handleCheckIn} className="flex gap-3 mb-6">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Scan QR or enter CONF2026-XXXXX..."
          className="flex-1 font-mono"
          autoFocus
        />
        <Button type="submit" disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check In'}
        </Button>
      </form>

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-5 mb-6 transition-all animate-in fade-in slide-in-from-top-2
          ${result.isCheckedIn ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}
        `}>
          <div className="flex items-center gap-3">
            {result.isCheckedIn ? (
              <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
            )}
            <div>
              <p className="font-bold text-gray-900 text-lg">{result.attendeeName}</p>
              <p className="text-sm text-gray-500">{result.attendeeEmail}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400">Reg #: </span>
              <span className="font-mono font-semibold">{result.registrationNumber}</span>
            </div>
            <div>
              <span className="text-gray-400">Ticket: </span>
              <span>{result.ticketTypeName}</span>
            </div>
          </div>
          <p className={`mt-3 text-sm font-semibold ${result.isCheckedIn ? 'text-green-700' : 'text-yellow-700'}`}>
            {result.message}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-6 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Check-ins</h2>
          <div className="space-y-2">
            {history.map((entry, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg border px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{entry.response.attendeeName}</p>
                  <p className="text-xs text-gray-400 font-mono">{entry.response.registrationNumber}</p>
                </div>
                <Badge className={entry.response.isCheckedIn
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                }>
                  {entry.response.isCheckedIn ? '✓ Checked In' : 'Issue'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
