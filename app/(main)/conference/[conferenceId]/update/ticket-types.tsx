'use client'

import { useState, useEffect } from 'react'
import {
  getTicketTypes, createTicketType, updateTicketType, deleteTicketType,
  TicketTypeResponse, TicketTypeRequest,
} from '@/app/api/registration.api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Loader2, Plus, Pencil, Trash2, Ticket, Download, ToggleRight, ToggleLeft, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { FilterPanel } from '@/components/ui/filter-panel'
import { formatDate } from '@/lib/utils'

const PAGE_SIZE = 10

const CATEGORIES = [
  { value: 'AUTHOR', label: 'Author / Presenter' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'STAFF', label: 'Staff / Organizer' },
  { value: 'VIP', label: 'VIP' },
] as const

type Category = typeof CATEGORIES[number]['value'] | 'ALL'
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

interface Props {
  conferenceId: number
}

const EMPTY_FORM: TicketTypeRequest = {
  name: '',
  description: '',
  price: 0,
  currency: 'VND',
  deadline: null,
  maxQuantity: null,
  category: 'STANDARD',
  isActive: true,
}

export default function TicketTypesConfig({ conferenceId }: Props) {
  const [types, setTypes] = useState<TicketTypeResponse[]>([])
  const [filtered, setFiltered] = useState<TicketTypeResponse[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(0)

  // Derived state
  const activeFilterCount = [categoryFilter !== 'all', statusFilter !== 'all'].filter(Boolean).length

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TicketTypeResponse | null>(null)
  const [form, setForm] = useState<TicketTypeRequest>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    getTicketTypes(conferenceId, false)
      .then((data) => { setTypes(data); setFiltered(data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [conferenceId])

  // Filter logic
  useEffect(() => {
    let result = types
    if (statusFilter === 'ACTIVE') result = result.filter(t => t.isActive)
    if (statusFilter === 'INACTIVE') result = result.filter(t => !t.isActive)
    if (categoryFilter !== 'all') result = result.filter(t => t.category === categoryFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      )
    }
    setFiltered(result)
    setCurrentPage(0)
  }, [search, categoryFilter, statusFilter, types])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setDialogOpen(true)
  }

  const openEdit = (tt: TicketTypeResponse) => {
    setEditing(tt)
    setForm({
      name: tt.name,
      description: tt.description ?? '',
      price: tt.price,
      currency: tt.currency,
      deadline: tt.deadline,
      maxQuantity: tt.maxQuantity,
      category: tt.category,
      isActive: tt.isActive,
    })
    setError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await updateTicketType(editing.id, form)
      } else {
        await createTicketType(conferenceId, form)
      }
      setDialogOpen(false)
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save ticket type.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this ticket type? Existing registrations will not be affected.')) return
    await deleteTicketType(id)
    load()
  }

  const toggleActive = async (tt: TicketTypeResponse) => {
    await updateTicketType(tt.id, {
      name: tt.name, price: tt.price, currency: tt.currency, category: tt.category,
      description: tt.description ?? undefined, deadline: tt.deadline,
      maxQuantity: tt.maxQuantity, isActive: !tt.isActive,
    })
    load()
  }

  const exportCsv = () => {
    const headers = ['Name', 'Category', 'Price', 'Currency', 'Max Qty', 'Sold', 'Deadline', 'Status']
    const rows = filtered.map(t => [
      t.name,
      CATEGORIES.find(c => c.value === t.category)?.label ?? t.category,
      t.price === 0 ? 'Free' : t.price,
      t.currency,
      t.maxQuantity ?? 'Unlimited',
      t.quantitySold ?? 0,
      t.deadline ? formatDate(t.deadline) : '—',
      t.isActive ? 'Active' : 'Inactive',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ticket-types-conf-${conferenceId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const activeCount = types.filter(t => t.isActive).length
  const freeCount = types.filter(t => t.price === 0).length
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginatedTypes = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ticket Types</h2>
          <p className="text-sm text-gray-500 mt-0.5">Configure registration fee tiers for this conference.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Ticket Type
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Types', value: types.length, icon: <Ticket className="w-5 h-5 text-indigo-500" /> },
          { label: 'Active', value: activeCount, icon: <ToggleRight className="w-5 h-5 text-green-500" /> },
          { label: 'Free Tickets', value: freeCount, icon: <ToggleLeft className="w-5 h-5 text-purple-500" /> },
        ].map(s => (
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
            placeholder="Search by name or description..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(0); }}
          />
        </div>
        <FilterPanel
          groups={[
            {
              label: 'Category',
              type: 'radio',
              options: [
                { value: 'all', label: 'All Categories' },
                ...CATEGORIES.map(c => ({ value: c.value, label: c.label })),
              ],
              value: categoryFilter,
              onChange: (v) => { setCategoryFilter(v); setCurrentPage(0) },
            },
            {
              label: 'Status',
              type: 'pills',
              options: [
                { value: 'all', label: 'All' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ],
              value: statusFilter,
              onChange: (v) => { setStatusFilter(v); setCurrentPage(0) },
            },
          ]}
        />
        <Button variant="outline" size="sm" className="gap-2 text-xs h-9" onClick={exportCsv} disabled={loading || types.length === 0}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : types.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No ticket types configured yet. Click "Add Ticket Type" to create the first one.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No ticket types match the current filter.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Max Qty / Sold</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="w-32 text-center">Status</TableHead>
                <TableHead className="w-28 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTypes.map((tt, idx) => (
                <TableRow key={tt.id} className={!tt.isActive ? 'opacity-60' : ''}>
                  <TableCell className="text-center text-xs text-muted-foreground font-medium">
                    {currentPage * PAGE_SIZE + idx + 1}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{tt.name}</p>
                    {tt.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{tt.description}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {CATEGORIES.find(c => c.value === tt.category)?.label ?? tt.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {tt.price === 0 ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Free</Badge>
                    ) : (
                      `${tt.price.toLocaleString()} ${tt.currency}`
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {tt.maxQuantity != null ? (
                      <span>{tt.quantitySold ?? 0} / {tt.maxQuantity} sold</span>
                    ) : (
                      <span className="text-muted-foreground/50">Unlimited</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {tt.deadline ? formatDate(tt.deadline) : <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch checked={tt.isActive} onCheckedChange={() => toggleActive(tt)} />
                      <span className="text-xs text-muted-foreground hidden sm:inline">{tt.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary" onClick={() => openEdit(tt)} title="Edit" aria-label="Edit ticket type">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(tt.id)} title="Delete" aria-label="Delete ticket type">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 mt-4 rounded-b-lg">
          <div className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages} · {filtered.length} types
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

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Ticket Type' : 'Create Ticket Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Early-Bird" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  min={0}
                  value={!editing && form.price === 0 ? '' : form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value === '' ? 0 : Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VND">VND</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Quantity</Label>
                <Input type="number" min={1} value={form.maxQuantity ?? ''} onChange={e => setForm(f => ({ ...f, maxQuantity: e.target.value ? Number(e.target.value) : null }))} placeholder="Unlimited" />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input type="datetime-local" value={form.deadline ? form.deadline.slice(0, 16) : ''} onChange={e => setForm(f => ({ ...f, deadline: e.target.value || null }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              <Label>Active</Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
