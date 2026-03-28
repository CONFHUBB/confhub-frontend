'use client'

import { useState, useEffect } from 'react'
import { getConferencePaymentHistory, PaymentHistoryResponse } from '@/app/api/registration.api'
import { Loader2, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronRight, Search, Filter, ChevronLeft, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FilterPanel } from '@/components/ui/filter-panel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'

const PAGE_SIZE = 20

interface PaymentHistoryViewProps { conferenceId: number }

const OUTCOME_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  PAID: { label: 'Paid', className: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  INVALID: { label: 'Invalid', className: 'bg-gray-100 text-gray-600 border-gray-200', icon: <AlertCircle className="w-3.5 h-3.5" /> },
}

export function PaymentHistoryView({ conferenceId }: PaymentHistoryViewProps) {
  const [history, setHistory] = useState<PaymentHistoryResponse[]>([])
  const [filtered, setFiltered] = useState<PaymentHistoryResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('ALL')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [currentPage, setCurrentPage] = useState(0)

  // Derived state
  const activeFilterCount = outcomeFilter !== 'ALL' ? 1 : 0

  useEffect(() => {
    getConferencePaymentHistory(conferenceId)
      .then((data: PaymentHistoryResponse[]) => { setHistory(data); setFiltered(data) })
      .catch(() => setError('Failed to load payment history.'))
      .finally(() => setLoading(false))
  }, [conferenceId])

  useEffect(() => {
    let results = history
    if (outcomeFilter !== 'ALL') results = results.filter(h => h.outcome === outcomeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      results = results.filter(h =>
        h.vnpTxnRef?.toLowerCase().includes(q) ||
        h.registrationNumber?.toLowerCase().includes(q) ||
        h.bankCode?.toLowerCase().includes(q)
      )
    }
    setFiltered(results)
    setCurrentPage(0)
  }, [history, search, outcomeFilter])

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const paid = history.filter(h => h.outcome === 'PAID').length
  const failed = history.filter(h => h.outcome === 'FAILED').length
  const invalid = history.filter(h => h.outcome === 'INVALID').length
  const totalAmount = history.filter(h => h.outcome === 'PAID').reduce((s, h) => s + (h.amount ?? 0), 0)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginatedHistory = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  if (error) return <div className="text-destructive py-8 text-center text-sm">{error}</div>

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Paid', value: paid, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
          { label: 'Failed', value: failed, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
          { label: 'Invalid', value: invalid, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
          { label: 'Total Collected', value: `${totalAmount.toLocaleString()} VND`, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search txn ref, reg number, bank…"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(0); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <FilterPanel
          groups={[
            {
              label: 'Outcome',
              type: 'pills',
              options: [
                { value: 'ALL', label: 'All' },
                { value: 'PAID', label: 'Paid' },
                { value: 'FAILED', label: 'Failed' },
                { value: 'INVALID', label: 'Invalid' },
              ],
              value: outcomeFilter,
              onChange: (v) => { setOutcomeFilter(v); setCurrentPage(0) },
            },
          ]}
        />
      </div>

      {/* Table */}
      {history.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No payment records found.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No records match the current filter.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Recorded</TableHead>
                <TableHead>Reg #</TableHead>
                <TableHead>Txn Ref</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-28 text-center">Outcome</TableHead>
                <TableHead className="w-20 text-center">Bank</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedHistory.map((h, idx) => {
                const cfg = OUTCOME_CONFIG[h.outcome] ?? OUTCOME_CONFIG.INVALID
                const isOpen = expanded.has(h.id)
                return (
                  <>
                    <TableRow
                      key={h.id}
                      className="cursor-pointer"
                      onClick={() => toggleExpand(h.id)}
                    >
                      <TableCell className="text-center text-xs text-muted-foreground font-medium">
                        {currentPage * PAGE_SIZE + idx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{formatDate(h.recordedAt as any)}</TableCell>
                      <TableCell className="font-mono text-xs">{h.registrationNumber || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{h.vnpTxnRef}</TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {h.amount != null ? `${h.amount.toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`flex items-center gap-1 justify-center text-xs px-2 border ${cfg.className}`}>
                          {cfg.icon}{cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{h.bankCode || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow key={`${h.id}-detail`} className="bg-muted/20">
                        <TableCell colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            {[
                              { label: 'Ticket ID', value: h.ticketId },
                              { label: 'VNP Txn No', value: h.vnpTransactionNo || '—' },
                              { label: 'Status Code', value: h.vnpTransactionStatus || '—' },
                              { label: 'Response Code', value: h.vnpResponseCode || '—' },
                              { label: 'Pay Date', value: formatDate(h.payDate as any) },
                              { label: 'Sig Valid', value: h.signatureValid ? '✅ Yes' : '❌ No' },
                            ].map(row => (
                              <div key={row.label}>
                                <p className="text-muted-foreground uppercase font-semibold tracking-wide mb-0.5">{row.label}</p>
                                <p className="font-mono">{String(row.value)}</p>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
          <div className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages} · {filtered.length} records
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
