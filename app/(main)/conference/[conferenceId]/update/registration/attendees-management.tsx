'use client'

// app/(main)/conference/[conferenceId]/update/attendees-management.tsx

import { useState, useEffect, useCallback } from 'react'
import { getAttendees, refundTicket, TicketResponse } from '@/app/api/registration.api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Search, Users, Download, QrCode, MailCheck, CheckCircle2, XCircle, Clock, RefreshCcw } from 'lucide-react'
import { StandardPagination } from '@/components/ui/standard-pagination'
import { FilterPanel } from '@/components/ui/filter-panel'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { EmptyState } from '@/components/ui/empty-state'

const PAGE_SIZE = 20

const STATUS_CONFIG: Record<string, { label: string; badge: React.ReactNode }> = {
  COMPLETED: {
    label: 'Paid',
    badge: <Badge className="bg-green-100 text-green-700 border-green-200 border">Paid ✓</Badge>,
  },
  PENDING: {
    label: 'Pending',
    badge: <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 border">Pending</Badge>,
  },
  FAILED: {
    label: 'Failed',
    badge: <Badge className="bg-red-100 text-red-700 border-red-200 border">Failed</Badge>,
  },
  REFUNDED: {
    label: 'Refunded',
    badge: <Badge className="bg-gray-100 text-gray-600 border">Refunded</Badge>,
  },
}

interface Props {
  conferenceId: number
  /** Increment this to force a re-fetch from the parent (e.g., after a check-in) */
  refreshKey?: number
}

export default function AttendeesManagement({ conferenceId, refreshKey = 0 }: Props) {
  const [attendees, setAttendees] = useState<TicketResponse[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input by 400ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  // Stats: derived from current page but approximated from totals
  const [statsPaid, setStatsPaid] = useState(0)
  const [statsCheckedIn, setStatsCheckedIn] = useState(0)

  const activeFilterCount = statusFilter !== 'ALL' ? 1 : 0

  const fetchAttendees = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAttendees(conferenceId, {
        page: currentPage,
        size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      })
      setAttendees(result.content)
      setTotalElements(result.totalElements)
      setTotalPages(result.totalPages)

      // Compute stats from full unfiltered fetch for the summary cards on first load
      if (currentPage === 0 && !debouncedSearch && statusFilter === 'ALL') {
        const paid = result.content.filter((a) => a.paymentStatus === 'COMPLETED').length
        const checkedIn = result.content.filter((a) => a.isCheckedIn).length
        setStatsPaid(paid)
        setStatsCheckedIn(checkedIn)
      }
    } catch {
      setAttendees([])
    } finally {
      setLoading(false)
    }
  }, [conferenceId, currentPage, debouncedSearch, statusFilter, refreshKey])

  // Fetch stats independently (all, no filter) — re-runs when refreshKey changes
  useEffect(() => {
    getAttendees(conferenceId, { page: 0, size: 100 }).then((res) => {
      setStatsPaid(res.content.filter((a) => a.paymentStatus === 'COMPLETED').length)
      setStatsCheckedIn(res.content.filter((a) => a.isCheckedIn).length)
    })
  }, [conferenceId, refreshKey])

  useEffect(() => {
    setCurrentPage(0)
  }, [debouncedSearch, statusFilter])

  useEffect(() => {
    fetchAttendees()
  }, [fetchAttendees])

  const exportCsv = async () => {
    try {
      const { exportAttendeesCsv } = await import('@/app/api/conference.api')
      const blob = await exportAttendeesCsv(conferenceId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendees-conf-${conferenceId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: client-side CSV export
      try {
        const allData = await getAttendees(conferenceId, {
          page: 0,
          size: 1000,
          search: debouncedSearch || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        })
        const headers = ['Reg #', 'Name', 'Email', 'Ticket Type', 'Amount', 'Status', 'Checked In']
        const rows = allData.content.map((a) => [
          a.registrationNumber,
          a.userName,
          a.userEmail,
          a.ticketTypeName,
          a.price,
          a.paymentStatus,
          a.isCheckedIn ? 'Yes' : 'No',
        ])
        const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `attendees-conf-${conferenceId}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        toast.error('Failed to export attendees CSV')
      }
    }
  }


  const handleRefund = async (ticketId: number, name: string) => {
    if (!window.confirm(`Are you sure you want to refund the ticket for ${name}?`)) return
    try {
      await refundTicket(conferenceId, ticketId)
      toast.success('Ticket refunded successfully')
      fetchAttendees()
    } catch {
      toast.error('Failed to refund ticket')
    }
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Registered', value: totalElements || 0, icon: <Users className="w-5 h-5 text-indigo-500" /> },
          { label: 'Paid', value: statsPaid, icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
          { label: 'Checked In', value: statsCheckedIn, icon: <Clock className="w-5 h-5 text-indigo-500" /> },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4 flex items-center gap-3">
            {s.icon}
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, or reg #..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterPanel
          groups={[
            {
              label: 'Payment Status',
              type: 'pills',
              options: [
                { value: 'ALL', label: 'All' },
                { value: 'COMPLETED', label: 'Paid' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'FAILED', label: 'Failed' },
                { value: 'REFUNDED', label: 'Refunded' },
              ],
              value: statusFilter,
              onChange: (v) => { setStatusFilter(v); setCurrentPage(0) },
            },
          ]}
        />
        <Button variant="outline" size="sm" className="gap-2 text-xs h-9" onClick={fetchAttendees} disabled={loading} title="Refresh attendee list">
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
        <Button variant="outline" size="sm" className="gap-2 text-xs h-9" onClick={exportCsv} disabled={loading || totalElements === 0}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton
          rows={8}
          headers={['#', 'Reg #', 'Name', 'Email', 'Ticket Type', 'Amount', 'Payment', 'Check-in', 'Actions']}
          className="rounded-lg border overflow-hidden"
        />
      ) : attendees.length === 0 ? (
        <EmptyState
          emoji={search || statusFilter !== 'ALL' ? '🔍' : '🎟️'}
          title={search || statusFilter !== 'ALL' ? 'No attendees match the current filter' : 'No attendees yet'}
          description={search || statusFilter !== 'ALL' ? 'Try adjusting your search or filter settings.' : 'Attendees will appear here once they register and complete payment.'}
        />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Reg #</TableHead>
                <TableHead className="min-w-[120px]">Name</TableHead>
                <TableHead className="min-w-[160px] max-w-[220px]">Email</TableHead>
                <TableHead>Ticket Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-28 text-center">Payment</TableHead>
                <TableHead className="w-24 text-center">Check-in</TableHead>
                <TableHead className="w-24 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendees.map((a, idx) => (
                <TableRow key={a.id}>
                  <TableCell className="text-center text-xs text-muted-foreground font-medium">
                    {currentPage * PAGE_SIZE + idx + 1}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{a.registrationNumber}</TableCell>
                  <TableCell className="font-medium text-sm max-w-[140px]">
                    <span className="truncate block" title={a.userName}>{a.userName}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[220px]">
                    <span className="truncate block" title={a.userEmail}>{a.userEmail}</span>
                  </TableCell>
                  <TableCell className="text-sm">{a.ticketTypeName}</TableCell>
                  <TableCell className="font-medium text-sm">
                    {a.price === 0 ? 'Free' : `${a.price.toLocaleString()} ${a.currency}`}
                  </TableCell>
                  <TableCell className="text-center">{STATUS_CONFIG[a.paymentStatus]?.badge}</TableCell>
                  <TableCell className="text-center">
                    {a.isCheckedIn ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 border">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Yes
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-500 border">
                        <XCircle className="w-3 h-3 mr-1" /> No
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {a.paymentStatus === 'COMPLETED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleRefund(a.id, a.userName)}
                      >
                        Refund
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <StandardPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          entityName="attendees"
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}
