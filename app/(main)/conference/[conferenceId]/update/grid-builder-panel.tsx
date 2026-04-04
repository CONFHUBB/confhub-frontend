'use client'

import React, { useState, useMemo } from 'react'
import { AdvancedProgram, ProgramSession } from '@/types/program'
import { PaperResponse } from '@/types/paper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2, Calendar, Eye, Copy, Edit2, ChevronUp, ChevronDown, Download, LayoutGrid, FileText } from 'lucide-react'
import { toast } from 'sonner'

// Pixels per minute at scale
const PX_PER_MIN = 2.0

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')}${ampm}`
}

// ─── Session Form Dialog ─────────────────────────────────────────────────────
interface SessionFormProps {
  open: boolean
  onClose: () => void
  program: AdvancedProgram
  allPapers: PaperResponse[]
  initialData?: Partial<ProgramSession & { startTime: string; endTime: string; isGlobal?: boolean; globalTitle?: string; color?: string; location?: string }>
  onSave: (data: any) => void
  onDelete?: () => void
}

interface PaperDraft {
  paperId: number
  title: string
  order: number
  presentationType: string
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

const SESSION_COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Orange', value: '#f97316' },
]

const PRESENTATION_PRESETS = ['Oral Presentation', 'Poster', 'Keynote', 'Workshop', 'Tutorial', 'Demo']

function SessionForm({ open, onClose, program, allPapers, initialData, onSave, onDelete }: SessionFormProps) {
  const [title, setTitle] = useState(initialData?.title || initialData?.globalTitle || '')
  const [isGlobal, setIsGlobal] = useState(initialData?.isGlobal ?? false)
  const [location, setLocation] = useState(initialData?.location || initialData?.locationId || '')
  const [chairNames, setChairNames] = useState(initialData?.chairNames || '')
  const [startTime, setStartTime] = useState(initialData?.startTime || '09:00')
  const [endTime, setEndTime] = useState(initialData?.endTime || '10:00')
  const [color, setColor] = useState(initialData?.color || '#6366f1')

  // Build ordered paper list from initialData
  const buildInitialPapers = (): PaperDraft[] => {
    if (!initialData?.papers || initialData.papers.length === 0) return []
    return [...initialData.papers]
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      .map((p: any, i: number) => ({
        paperId: p.paperId,
        title: p.title,
        order: i + 1,
        presentationType: p.presentationType || p.presentationTypeId || '',
      }))
  }
  const [orderedPapers, setOrderedPapers] = useState<PaperDraft[]>(buildInitialPapers)

  // Selected paper IDs (for the checkbox list)
  const selectedPaperIds = new Set(orderedPapers.map(p => p.paperId))

  const togglePaper = (paper: PaperResponse, checked: boolean) => {
    if (checked) {
      setOrderedPapers(prev => [...prev, {
        paperId: paper.id,
        title: paper.title,
        order: prev.length + 1,
        presentationType: '',
      }])
    } else {
      setOrderedPapers(prev => prev.filter(p => p.paperId !== paper.id).map((p, i) => ({ ...p, order: i + 1 })))
    }
  }

  const movePaper = (index: number, direction: 'up' | 'down') => {
    setOrderedPapers(prev => {
      const next = [...prev]
      const swapIdx = direction === 'up' ? index - 1 : index + 1
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[index], next[swapIdx]] = [next[swapIdx], next[index]]
      return next.map((p, i) => ({ ...p, order: i + 1 }))
    })
  }

  const updatePaperType = (paperId: number, pType: string) => {
    setOrderedPapers(prev => prev.map(p => p.paperId === paperId ? { ...p, presentationType: pType } : p))
  }

  // Auto-calculate time per paper
  const totalSessionMinutes = Math.max(timeToMin(endTime) - timeToMin(startTime), 0)
  const minutesPerPaper = orderedPapers.length > 0 ? totalSessionMinutes / orderedPapers.length : 0
  const sessionStartMin = timeToMin(startTime)

  const handleSave = () => {
    if (!title.trim()) { toast.error('Title is required'); return }
    if (startTime >= endTime) { toast.error('End time must be after start time'); return }
    onSave({
      title,
      isGlobal,
      color,
      location: isGlobal ? undefined : location.trim() || undefined,
      chairNames: chairNames.trim() || undefined,
      startTime,
      endTime,
      selectedPapers: orderedPapers.map(p => p.paperId),
      papersWithMeta: orderedPapers.map((p, i) => ({
        ...p,
        allocatedMinutes: Math.round(minutesPerPaper),
      })),
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0"><DialogTitle>{initialData?.id ? 'Edit Session' : 'Add Session'}</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Time</Label><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1" /></div>
            <div><Label>End Time</Label><Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
            <input type="checkbox" checked={isGlobal} onChange={e => setIsGlobal(e.target.checked)} className="rounded" />
            Full-width row (e.g. Lunch Break, Opening Ceremony)
          </label>
          <div><Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={isGlobal ? 'e.g. Lunch Break' : 'e.g. Machine Learning Track I'} className="mt-1" />
          </div>

          {/* ── Session Color ── */}
          <div>
            <Label>Session Color</Label>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {SESSION_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                    color === c.value ? 'border-gray-800 scale-110 ring-2 ring-offset-1 ring-gray-300' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                  title="Custom color"
                />
                <span className="text-[10px] text-gray-400 font-mono">{color}</span>
              </div>
            </div>
          </div>

          {!isGlobal && (
            <>
              <div>
                <Label>Room / Location</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Hall A, Seminar Room 2, LB24" className="mt-1" />
              </div>
              <div><Label>Chair(s)</Label>
                <Input value={chairNames} onChange={e => setChairNames(e.target.value)} placeholder="e.g. Dr. Nguyen Van A, Prof. Smith" className="mt-1" />
              </div>

              {/* ── Paper Selection ── */}
              <div>
                <Label>Assign Papers</Label>
                <div className="mt-1 max-h-40 overflow-y-auto border rounded-xl divide-y">
                  {allPapers.length === 0
                    ? <p className="p-3 text-sm text-gray-400 italic">No accepted papers</p>
                    : allPapers.map(p => (
                      <label key={p.id} className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" checked={selectedPaperIds.has(p.id)}
                          onChange={e => togglePaper(p, e.target.checked)}
                          className="mt-0.5 rounded text-indigo-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-800 leading-tight">{p.title}</p>
                          <p className="text-xs text-gray-500">Paper #{p.id}</p>
                        </div>
                      </label>
                    ))}
                </div>
              </div>

              {/* ── Ordered Papers: per-paper type + reorder + time allocation ── */}
              {orderedPapers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">Presentation Order & Type</Label>
                    <span className="text-xs text-gray-500">
                      {totalSessionMinutes > 0 ? `~${Math.floor(minutesPerPaper)} min/paper` : '—'}
                    </span>
                  </div>
                  <div className="border rounded-xl overflow-hidden divide-y bg-white">
                    {orderedPapers.map((p, idx) => {
                      const paperStart = sessionStartMin + idx * minutesPerPaper
                      const paperEnd = sessionStartMin + (idx + 1) * minutesPerPaper
                      return (
                        <div key={p.paperId} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors">
                          {/* Order badge */}
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {p.order}
                          </span>

                          {/* Move arrows */}
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button type="button" disabled={idx === 0}
                              onClick={() => movePaper(idx, 'up')}
                              className="text-gray-400 hover:text-indigo-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors p-0.5">
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" disabled={idx === orderedPapers.length - 1}
                              onClick={() => movePaper(idx, 'down')}
                              className="text-gray-400 hover:text-indigo-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors p-0.5">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Paper info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 leading-tight truncate">{p.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-400 font-mono">Paper #{p.paperId}</span>
                              {totalSessionMinutes > 0 && (
                                <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  {minToTime(Math.round(paperStart))} – {minToTime(Math.round(paperEnd))}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Per-paper presentation type */}
                          <div className="shrink-0 flex items-center gap-1.5">
                            <select
                              value={p.presentationType || ''}
                              onChange={e => updatePaperType(p.paperId, e.target.value)}
                              className="h-7 text-xs rounded border border-gray-200 bg-white px-1.5 min-w-[120px]"
                            >
                              <option value="">— Type —</option>
                              {PRESENTATION_PRESETS.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                            </select>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Time summary bar */}
                  {totalSessionMinutes > 0 && orderedPapers.length > 0 && (
                    <div className="mt-2 rounded-lg bg-gray-50 border p-2.5">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                        <span className="font-medium">Time Allocation</span>
                        <span>{orderedPapers.length} papers × ~{Math.floor(minutesPerPaper)} min = {totalSessionMinutes} min total</span>
                      </div>
                      <div className="flex h-3 rounded-full overflow-hidden">
                        {orderedPapers.map((p, i) => {
                          const pColor = '#c7d2fe'
                          return (
                            <div
                              key={p.paperId}
                              className="h-full transition-all"
                              style={{
                                width: `${100 / orderedPapers.length}%`,
                                backgroundColor: pColor,
                                opacity: 0.8 + (i % 2) * 0.2,
                                borderRight: i < orderedPapers.length - 1 ? '1px solid white' : 'none'
                              }}
                              title={`#${p.order}: ${p.title}`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {/* Sticky footer */}
        <div className="shrink-0 border-t px-6 py-3 flex gap-2 bg-white">
          {onDelete && (
            <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { onDelete(); onClose() }}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          )}
          <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleSave}>
            {initialData?.id ? 'Save Changes' : 'Add Session'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Overlap detection: assign sub-columns to overlapping sessions ───────────
function assignColumns(sessions: any[]): { session: any; col: number; totalCols: number }[] {
  if (sessions.length === 0) return []
  const sorted = [...sessions].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  const columns: any[][] = []

  for (const s of sorted) {
    const sStart = timeToMinutes(s.startTime)
    let placed = false
    for (let c = 0; c < columns.length; c++) {
      const lastInCol = columns[c][columns[c].length - 1]
      if (timeToMinutes(lastInCol.endTime) <= sStart) {
        columns[c].push(s)
        placed = true
        break
      }
    }
    if (!placed) columns.push([s])
  }

  const totalCols = columns.length
  const result: { session: any; col: number; totalCols: number }[] = []
  columns.forEach((col, colIdx) => {
    col.forEach(s => result.push({ session: s, col: colIdx, totalCols }))
  })
  return result
}

// ─── Unified Grid (days as columns) ──────────────────────────────────────────
interface UnifiedGridProps {
  days: any[]
  program: AdvancedProgram
  allPapers: PaperResponse[]
  onAddSession: (dayDate: string, data: any) => void
  onEditSession: (dayDate: string, sessionId: string, data: any) => void
  onDeleteSession: (dayDate: string, sessionId: string) => void
  onDeleteDay: (date: string) => void
}

function UnifiedGrid({ days, program, allPapers, onAddSession, onEditSession, onDeleteSession, onDeleteDay }: UnifiedGridProps) {
  const [addDayDate, setAddDayDate] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<{ dayDate: string; session: any } | null>(null)

  // Compute global time range across all days
  const allSess = days.flatMap(d => d.sessions || [])
  const allStartMins = allSess.map((s: any) => timeToMinutes(s.startTime))
  const allEndMins = allSess.map((s: any) => timeToMinutes(s.endTime))
  const globalStart = allStartMins.length > 0 ? Math.max(0, Math.min(...allStartMins) - 30) : 8 * 60
  const globalEnd = allEndMins.length > 0 ? Math.max(...allEndMins) : 18 * 60
  const gridHeight = (globalEnd - globalStart) * PX_PER_MIN

  // Time markers
  const hourMarkers: { hour: number; offset: number }[] = []
  for (let h = Math.floor(globalStart / 60); h <= Math.ceil(globalEnd / 60); h++) {
    const mins = h * 60
    if (mins >= globalStart && mins <= globalEnd) {
      hourMarkers.push({ hour: h, offset: (mins - globalStart) * PX_PER_MIN })
    }
  }

  if (days.length === 0) {
    return <div className="text-center text-gray-400 py-16 italic">No days yet — add a day above to get started.</div>
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
      {/* Header row: Time | Day1 | Day2 | Day3 ... */}
      <div className="flex border-b border-gray-200 bg-[#1e2a4a]">
        <div className="w-[80px] shrink-0 py-3 text-center text-white/60 text-xs font-semibold">Time</div>
        {days.map((day: any) => {
          const dateObj = new Date(day.date)
          const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
          const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          return (
            <div key={day.date} className="flex-1 border-l border-white/10 py-2 px-3 text-center">
              <div className="text-white font-bold text-sm">{weekday}</div>
              <div className="text-white/60 text-xs">{dateStr}</div>
              <div className="flex items-center justify-center gap-1.5 mt-1 no-print">
                <button onClick={() => setAddDayDate(day.date)}
                  className="text-[10px] bg-indigo-500 hover:bg-indigo-400 text-white px-2 py-0.5 rounded">
                  + Session
                </button>
                <button onClick={() => onDeleteDay(day.date)}
                  className="text-indigo-300 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Grid body */}
      <div className="flex relative pb-5" style={{ height: `${gridHeight + 20}px` }}>
        {/* Time axis */}
        <div className="w-[80px] shrink-0 relative border-r border-gray-200 bg-gray-50">
          {hourMarkers.map(({ hour, offset }) => (
            <div key={hour} className="absolute right-0 pr-3 flex items-center" style={{ top: `${offset}px`, transform: 'translateY(-50%)' }}>
              <span className="text-sm font-bold text-red-600 whitespace-nowrap font-mono">
                {formatTime12(`${hour.toString().padStart(2, '0')}:00`)}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day: any) => {
          const sessions: any[] = day.sessions || []
          const normalSessions = sessions.filter((s: any) => !s.isGlobal)
          const globalSessions = sessions.filter((s: any) => s.isGlobal)
          const placed = assignColumns(normalSessions)

          return (
            <div key={day.date} className="flex-1 relative border-l border-gray-200">
              {/* Horizontal hour lines */}
              {hourMarkers.map(({ hour, offset }) => (
                <div key={`line-${day.date}-${hour}`} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: `${offset}px` }} />
              ))}

              {/* Normal sessions with overlap handling */}
              {placed.map(({ session: s, col, totalCols }) => {
                const top = (timeToMinutes(s.startTime) - globalStart) * PX_PER_MIN
                const height = Math.max((timeToMinutes(s.endTime) - timeToMinutes(s.startTime)) * PX_PER_MIN, 36)
                const bgColor = s.color || '#6366f1'
                const left = `${(col / totalCols) * 100}%`
                const width = `${(1 / totalCols) * 100}%`

                return (
                  <div key={s.id}
                    className="absolute cursor-pointer group/card"
                    style={{ top: `${top + 2}px`, height: `${height - 4}px`, left, width }}
                    onClick={() => setEditTarget({ dayDate: day.date, session: s })}
                  >
                    <div className="mx-0.5 h-full rounded-md overflow-hidden relative hover:overflow-y-auto no-scrollbar" style={{ backgroundColor: bgColor }}>
                      <div className="px-2 py-1.5 h-full flex flex-col justify-start">
                        {/* Action icons */}
                        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 no-print">
                          <button className="p-0.5 bg-black/20 rounded text-white hover:bg-black/40"
                            onClick={e => { e.stopPropagation(); setEditTarget({ dayDate: day.date, session: s }) }}>
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                          <button className="p-0.5 bg-black/20 rounded text-white hover:bg-red-500/80"
                            onClick={e => { e.stopPropagation(); onDeleteSession(day.date, s.id) }}>
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <div className="text-white font-bold text-base leading-tight break-words mb-1">{s.title}</div>
                        {s.location && <div className="text-white/90 text-sm mt-0.5">(Room: {s.location})</div>}
                        {s.chairNames && <div className="text-white/90 text-xs mt-0.5">Chair: {s.chairNames}</div>}
                        {s.papers?.length > 0 && <div className="text-white/80 text-xs mt-1 font-medium">{s.papers.length} paper(s)</div>}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Global sessions — full width of day column */}
              {globalSessions.map((s: any) => {
                const top = (timeToMinutes(s.startTime) - globalStart) * PX_PER_MIN
                const height = Math.max((timeToMinutes(s.endTime) - timeToMinutes(s.startTime)) * PX_PER_MIN, 30)
                const bgColor = s.color || '#1e2a4a'
                return (
                  <div key={s.id}
                    className="absolute left-0 right-0 cursor-pointer group/global"
                    style={{ top: `${top + 2}px`, height: `${height - 4}px`, zIndex: 10 }}
                    onClick={() => setEditTarget({ dayDate: day.date, session: s })}
                  >
                    <div className="mx-1 h-full rounded-md flex items-center justify-center px-4 relative shadow-sm border border-black/10" style={{ backgroundColor: bgColor }}>
                      <div className="text-white font-bold text-base text-center leading-tight py-1">{s.title}</div>
                      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover/global:opacity-100 transition-opacity no-print">
                        <button className="p-0.5 bg-white/20 rounded text-white hover:bg-white/30"
                          onClick={e => { e.stopPropagation(); setEditTarget({ dayDate: day.date, session: s }) }}>
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        <button className="p-0.5 bg-white/20 rounded text-white hover:bg-red-500/80"
                          onClick={e => { e.stopPropagation(); onDeleteSession(day.date, s.id) }}>
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Add/Edit dialogs */}
      {addDayDate && (
        <SessionForm open={!!addDayDate} onClose={() => setAddDayDate(null)}
          program={program} allPapers={allPapers}
          onSave={(data) => { onAddSession(addDayDate, data); setAddDayDate(null) }} />
      )}
      {editTarget && (
        <SessionForm open={!!editTarget} onClose={() => setEditTarget(null)}
          program={program} allPapers={allPapers}
          initialData={{ ...editTarget.session }}
          onSave={(data) => { onEditSession(editTarget.dayDate, editTarget.session.id, data); setEditTarget(null) }}
          onDelete={() => { onDeleteSession(editTarget.dayDate, editTarget.session.id); setEditTarget(null) }} />
      )}
    </div>
  )
}

// ─── Session Details Panel (separate tab) ─────────────────────────────────────
interface SessionDetailsPanelProps {
  program: AdvancedProgram
  allPapers: PaperResponse[]
}

function SessionDetailsPanel({ program, allPapers }: SessionDetailsPanelProps) {
  const days: any[] = (program.schedule as any)?.days || []
  const allSessions = days.flatMap((day: any) =>
    (day.sessions || [])
      .filter((s: any) => !s.isGlobal && s.papers?.length > 0)
      .map((s: any) => ({ ...s, date: day.date }))
  ).sort((a: any, b: any) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))

  if (allSessions.length === 0) {
    return (
      <div className="text-center text-gray-400 py-16 italic">
        No sessions with papers yet. Add sessions with papers in the Schedule Grid tab first.
      </div>
    )
  }

  return (
    <>
      {/* ── SCREEN VIEW (Modern Cards) ── */}
      <div className="space-y-6">
        {allSessions.map((s: any) => {
          const totalMins = timeToMin(s.endTime) - timeToMin(s.startTime)
          const minsPerPaper = s.papers.length > 0 ? totalMins / s.papers.length : 0
          const sStartMin = timeToMin(s.startTime)
          const dateLabel = new Date(s.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

          return (
            <div key={`detail-${s.id}`} className="border rounded-xl overflow-hidden shadow-sm">
              <div className="session-header px-4 py-3 text-center" style={{ backgroundColor: s.color || '#1e2a4a' }}>
                <h3 className="text-white font-bold text-base">{s.title}</h3>
                <div className="text-white/70 text-xs mt-1 flex items-center justify-center gap-2 flex-wrap">
                  <span>{dateLabel}</span>
                  <span>•</span>
                  <span>{formatTime12(s.startTime)} – {formatTime12(s.endTime)}</span>
                  {s.location && <><span>•</span><span>{s.location}</span></>}
                </div>
                {s.chairNames && (
                  <div className="text-white/60 text-xs mt-1">Chair(s): {s.chairNames}</div>
                )}
              </div>

              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600" style={{ width: '7%' }}>Paper ID</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600" style={{ width: '18%' }}>Authors</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600" style={{ width: '33%' }}>Paper Title</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600" style={{ width: '14%' }}>Track</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600" style={{ width: '15%' }}>Presentation Mode</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600" style={{ width: '13%' }}>Time Slot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...(s.papers || [])]
                    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                    .map((sp: any, idx: number) => {
                      const fullPaper = allPapers.find(p => p.id === sp.paperId)
                      const paperPType = sp.presentationType || null
                      const slotStart = sStartMin + idx * minsPerPaper
                      const slotEnd = sStartMin + (idx + 1) * minsPerPaper
                      return (
                        <tr key={sp.paperId} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2.5 text-center font-mono text-xs text-gray-500 font-medium">
                            {sp.paperId}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-700 break-words">
                            {fullPaper?.authorNames && fullPaper.authorNames.length > 0
                              ? fullPaper.authorNames.join(', ')
                              : <span className="text-gray-400 italic">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-800 font-medium leading-snug break-words">
                            {sp.title || fullPaper?.title || '—'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {fullPaper?.trackName ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium inline-block">
                                {fullPaper.trackName}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {paperPType ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 inline-block font-mono">
                                {paperPType}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center text-[11px] font-mono text-indigo-600 font-medium">
                            {minsPerPaper > 0
                              ? `${minToTime(Math.round(slotStart))} – ${minToTime(Math.round(slotEnd))}`
                              : '—'
                            }
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      {/* ── PRINT VIEW (Single Table Format, matching export requirements) ── */}
      <div id="session-details-print" className="hidden">
        <table className="w-full text-sm border-collapse border border-gray-400 bg-white min-w-[800px]">
          <thead>
            <tr className="bg-gray-200 border-b border-gray-400">
              <th className="p-2 text-center text-xs font-semibold text-gray-800 border-r border-gray-300" style={{ width: '8%' }}>Paper ID</th>
              <th className="p-2 text-center text-xs font-semibold text-gray-800 border-r border-gray-300" style={{ width: '22%' }}>Authors</th>
              <th className="p-2 text-center text-xs font-semibold text-gray-800 border-r border-gray-300" style={{ width: '36%' }}>Paper Title</th>
              <th className="p-2 text-center text-xs font-semibold text-gray-800 border-r border-gray-300" style={{ width: '12%' }}>Track</th>
              <th className="p-2 text-center text-xs font-semibold text-gray-800 border-r border-gray-300" style={{ width: '12%' }}>Mode</th>
              <th className="p-2 text-center text-xs font-semibold text-gray-800" style={{ width: '10%' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {allSessions.map((s: any) => {
              const totalMins = timeToMin(s.endTime) - timeToMin(s.startTime)
              const minsPerPaper = s.papers.length > 0 ? totalMins / s.papers.length : 0
              const sStartMin = timeToMin(s.startTime)

              return (
                <React.Fragment key={s.id}>
                  <tr className="border-b border-gray-400">
                    <td colSpan={6} className="p-2 text-center font-bold text-sm border-x border-gray-400"
                      style={{ backgroundColor: s.color || '#e5e7eb', color: '#000' }}>
                      {s.title}
                      {s.location && <span className="font-normal text-xs ml-1">(Room: {s.location})</span>}
                    </td>
                  </tr>
                  {[...(s.papers || [])]
                    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                    .map((sp: any, idx: number) => {
                      const fullPaper = allPapers.find(p => p.id === sp.paperId)
                      const paperPType = sp.presentationType || null
                      const slotStart = sStartMin + idx * minsPerPaper
                      const slotEnd = sStartMin + (idx + 1) * minsPerPaper
                      return (
                        <tr key={sp.paperId} className="border-b border-gray-300">
                          <td className="p-2 text-center font-mono text-xs text-gray-600 border-r border-gray-300 font-medium">{sp.paperId}</td>
                          <td className="p-2 text-xs text-gray-800 border-r border-gray-300">{fullPaper?.authorNames ? fullPaper.authorNames.join(', ') : '—'}</td>
                          <td className="p-2 text-xs text-black border-r border-gray-300 font-medium leading-snug">{sp.title || fullPaper?.title || '—'}</td>
                          <td className="p-2 text-center text-[10px] text-gray-700 border-r border-gray-300">{fullPaper?.trackName || '—'}</td>
                          <td className="p-2 text-center text-[10px] text-gray-700 border-r border-gray-300">{paperPType || '—'}</td>
                          <td className="p-2 text-center text-[10px] font-mono text-gray-600 shrink-0">
                            {minsPerPaper > 0 ? `${minToTime(Math.round(slotStart))} - ${minToTime(Math.round(slotEnd))}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ─── Main Grid Builder ────────────────────────────────────────────────────────
interface GridBuilderPanelProps {
  program: AdvancedProgram
  allPapers: PaperResponse[]
  onProgramChange: (updated: AdvancedProgram) => void
}

export function GridBuilderPanel({ program, allPapers, onProgramChange }: GridBuilderPanelProps) {
  const [dateInput, setDateInput] = useState('')
  const [subTab, setSubTab] = useState<'grid' | 'details'>('grid')

  const days: any[] = (program.schedule as any)?.days || []

  const addDay = () => {
    if (!dateInput) return
    if (days.some(d => d.date === dateInput)) { toast.error('Date already exists'); return }
    const newDays = [...days, { date: dateInput, sessions: [] }].sort((a, b) => a.date.localeCompare(b.date))
    onProgramChange({ ...program, schedule: { days: newDays } as any })
    setDateInput('')
  }

  const removeDay = (date: string) => {
    onProgramChange({ ...program, schedule: { days: days.filter(d => d.date !== date) } as any })
  }

  const addSession = (dayDate: string, data: any) => {
    const { title, isGlobal, color, location, chairNames, startTime, endTime, papersWithMeta } = data
    const papers = (papersWithMeta || []).map((pm: any) => ({
      paperId: pm.paperId,
      title: pm.title,
      authors: '',
      order: pm.order,
      presentationType: pm.presentationType || undefined,
      allocatedMinutes: pm.allocatedMinutes || undefined,
    }))
    const newSession = { id: crypto.randomUUID(), title, isGlobal, color, location, chairNames, startTime, endTime, papers }
    const newDays = days.map(d => d.date === dayDate ? { ...d, sessions: [...(d.sessions || []), newSession] } : d)
    onProgramChange({ ...program, schedule: { days: newDays } as any })
  }

  const editSession = (dayDate: string, sessionId: string, data: any) => {
    const { title, isGlobal, color, location, chairNames, startTime, endTime, papersWithMeta } = data
    const papers = (papersWithMeta || []).map((pm: any) => ({
      paperId: pm.paperId,
      title: pm.title,
      authors: '',
      order: pm.order,
      presentationType: pm.presentationType || undefined,
      allocatedMinutes: pm.allocatedMinutes || undefined,
    }))
    const newDays = days.map(d => d.date !== dayDate ? d : {
      ...d, sessions: d.sessions.map((s: any) => s.id === sessionId ? { ...s, title, isGlobal, color, location, chairNames, startTime, endTime, papers } : s)
    })
    onProgramChange({ ...program, schedule: { days: newDays } as any })
  }

  const deleteSession = (dayDate: string, sessionId: string) => {
    const newDays = days.map(d => d.date !== dayDate ? d : { ...d, sessions: d.sessions.filter((s: any) => s.id !== sessionId) })
    onProgramChange({ ...program, schedule: { days: newDays } as any })
  }

  const handleExportFullProgramPdf = () => {
    const gridHtml = document.getElementById('schedule-grid-print')?.innerHTML || ''
    const detailsHtml = document.getElementById('session-details-print')?.innerHTML || ''
    
    // Extract base tailwind compiled CSS elements to inject in the print window
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('')

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Full Conference Program</title>
      <meta charset="utf-8">
      ${styles}
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 24px; background: white !important; }
        /* Force browser to print background colors and images */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        @media print {
          body { padding: 0; }
          .page-break { page-break-before: always; }
          @page { margin: 1cm; size: auto; }
        }
        .header-title { font-size: 24px; font-weight: bold; text-align: center; color: #1e2a4a; margin-bottom: 24px; text-transform: uppercase; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 12px; margin-top: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
        .no-print { display: none !important; }
      </style>
      </head><body>
        <h1 class="header-title">Conference Program</h1>
        
        <div class="section-title">Schedule Grid</div>
        <div style="width: 100%; overflow: hidden;">
          ${gridHtml}
        </div>
        
        <div class="page-break"></div>
        
        <div class="section-title">Session Details</div>
        <div>
          ${detailsHtml}
        </div>
      </body></html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 700)
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs & Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setSubTab('grid')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              subTab === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutGrid className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Schedule Grid
          </button>
          <button
            onClick={() => setSubTab('details')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              subTab === 'details' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Session Details
          </button>
        </div>

        <Button onClick={handleExportFullProgramPdf} variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm">
          <Download className="w-4 h-4 mr-1.5" /> Export PDF (Grid & Details)
        </Button>
      </div>

      <div className={subTab !== 'grid' ? 'hidden' : 'block'}>
        <div className="space-y-4">
          {/* Add Day Row */}
          <div className="flex items-center gap-3 p-4 bg-white border rounded-2xl shadow-sm">
            <Input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)}
              className="rounded-xl max-w-[220px]" />
            <Button onClick={addDay} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
              <Plus className="w-4 h-4 mr-1" /> Add Day
            </Button>
          </div>

          <div id="schedule-grid-print">
            <UnifiedGrid days={days} program={program} allPapers={allPapers}
              onAddSession={addSession} onEditSession={editSession}
              onDeleteSession={deleteSession} onDeleteDay={removeDay} />
          </div>
        </div>
      </div>

      <div className={subTab !== 'details' ? 'hidden' : 'block'}>
        <div id="session-details-print">
          <SessionDetailsPanel program={program} allPapers={allPapers} />
        </div>
      </div>
    </div>
  )
}

export default GridBuilderPanel
