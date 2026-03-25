'use client'

import { useState, useEffect } from 'react'
import { getAttendees, TicketResponse } from '@/app/api/registration.api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Users, CheckCircle2, Clock, Download, Search, Filter, ChevronLeft, ChevronRight, Check } from 'lucide-react'

const PAGE_SIZE = 20

const STATUS_BADGE: Record<string, React.ReactNode> = {
  COMPLETED: <Badge className="bg-green-100 text-green-700 border-green-200">Paid ✓</Badge>,
  PENDING: <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>,
  FAILED: <Badge className="bg-red-100 text-red-700 border-red-200">Failed</Badge>,
  REFUNDED: <Badge className="bg-gray-100 text-gray-600">Refunded</Badge>,
}

interface Props {
  conferenceId: number
}

export default function AttendeesManagement({ conferenceId }: Props) {
  const [attendees, setAttendees] = useState<TicketResponse[]>([])
  const [filtered, setFiltered] = useState<TicketResponse[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)

  // Derived state
  const activeFilterCount = statusFilter !== 'ALL' ? 1 : 0

  useEffect(() => {
    getAttendees(conferenceId)
      .then((data) => { setAttendees(data); setFiltered(data) })
      .finally(() => setLoading(false))
  }, [conferenceId])

  useEffect(() => {
    let result = attendees
    if (statusFilter !== 'ALL') result = result.filter((a) => a.paymentStatus === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (a) =>
          a.userName.toLowerCase().includes(q) ||
          a.userEmail.toLowerCase().includes(q) ||
          a.registrationNumber?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
    setCurrentPage(0)
  }, [search, statusFilter, attendees])

  const paid = attendees.filter((a) => a.paymentStatus === 'COMPLETED').length
  const checkedIn = attendees.filter((a) => a.isCheckedIn).length
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginatedAttendees = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  const exportCsv = () => {
    const headers = ['Reg #', 'Name', 'Email', 'Ticket Type', 'Amount', 'Status', 'Checked In']
    const rows = filtered.map((a) => [
      a.registrationNumber, a.userName, a.userEmail, a.ticketTypeName,
      a.price, a.paymentStatus, a.isCheckedIn ? 'Yes' : 'No',
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendees-conf-${conferenceId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Registered', value: attendees.length, icon: <Users className="w-5 h-5 text-indigo-500" /> },
          { label: 'Paid', value: paid, icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
          { label: 'Checked In', value: checkedIn, icon: <Clock className="w-5 h-5 text-purple-500" /> },
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
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 gap-2 text-sm px-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs font-normal">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Payment Status</h4>
                <div className="grid gap-1">
                  {['ALL', 'COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'].map(status => (
                    <div
                      key={status}
                      className="flex items-center justify-between px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-muted"
                      onClick={() => { setStatusFilter(status); setCurrentPage(0); }}
                    >
                      <span className={statusFilter === status ? 'font-medium' : ''}>
                        {status === 'ALL' ? 'All Status' : status === 'COMPLETED' ? 'Paid' : status.charAt(0) + status.slice(1).toLowerCase()}
                      </span>
                      {statusFilter === status && <Check className="h-4 w-4" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <div className="p-3 border-t bg-muted/50">
                <Button
                  variant="ghost"
                  className="w-full text-xs h-8"
                  onClick={() => { setStatusFilter('ALL'); setCurrentPage(0); }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="sm" className="gap-2 text-xs h-9" onClick={exportCsv} disabled={loading || attendees.length === 0}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : attendees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No attendees registered yet.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No attendees match the current filter.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Reg #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ticket Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-28 text-center">Payment</TableHead>
                <TableHead className="w-24 text-center">Check-in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAttendees.map((a, idx) => (
                <TableRow key={a.id}>
                  <TableCell className="text-center text-xs text-muted-foreground font-medium">
                    {currentPage * PAGE_SIZE + idx + 1}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{a.registrationNumber}</TableCell>
                  <TableCell className="font-medium text-sm">{a.userName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{a.userEmail}</TableCell>
                  <TableCell className="text-sm">{a.ticketTypeName}</TableCell>
                  <TableCell className="font-medium text-sm">
                    {a.price === 0 ? 'Free' : `${a.price.toLocaleString()} ${a.currency}`}
                  </TableCell>
                  <TableCell className="text-center">{STATUS_BADGE[a.paymentStatus]}</TableCell>
                  <TableCell className="text-center">
                    {a.isCheckedIn ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Yes
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-500">No</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <p className="text-xs text-muted-foreground">
            Page {currentPage + 1} of {totalPages} · {filtered.length} attendees
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
