'use client'

import React, { useState, useMemo } from 'react'
import { AdvancedProgram, ProgramSession } from '@/types/program'
import { PaperResponse } from '@/types/paper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2, Calendar, Eye, Copy, Edit2 } from 'lucide-react'
import { toast } from 'sonner'

// Pixels per minute at scale
const PX_PER_MIN = 1.4

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
  initialData?: Partial<ProgramSession & { startTime: string; endTime: string; isGlobal?: boolean; globalTitle?: string }>
  onSave: (data: any) => void
  onDelete?: () => void
}

function SessionForm({ open, onClose, program, allPapers, initialData, onSave, onDelete }: SessionFormProps) {
  const [title, setTitle] = useState(initialData?.title || initialData?.globalTitle || '')
  const [isGlobal, setIsGlobal] = useState(initialData?.isGlobal ?? false)
  const [locationId, setLocationId] = useState(initialData?.locationId || program.settings.locations[0]?.id || '')
  const [typeId, setTypeId] = useState(initialData?.typeId || '')
  const [chairNames, setChairNames] = useState(initialData?.chairNames || '')
  const [startTime, setStartTime] = useState(initialData?.startTime || '09:00')
  const [endTime, setEndTime] = useState(initialData?.endTime || '10:00')
  const [selectedPapers, setSelectedPapers] = useState<number[]>(initialData?.papers?.map((p: any) => p.paperId) || [])

  const handleSave = () => {
    if (!title.trim()) { toast.error('Title is required'); return }
    if (startTime >= endTime) { toast.error('End time must be after start time'); return }
    onSave({ title, isGlobal, locationId: isGlobal ? null : locationId, typeId: isGlobal ? undefined : typeId || undefined, chairNames: chairNames.trim() || undefined, startTime, endTime, selectedPapers })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initialData?.id ? 'Edit Session' : 'Add Session'}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-1">
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
          {!isGlobal && (
            <>
              <div>
                <Label>Room / Location</Label>
                <select value={locationId} onChange={e => setLocationId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-1 text-sm mt-1 bg-white">
                  {program.settings.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Presentation Type</Label>
                <select value={typeId} onChange={e => setTypeId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-1 text-sm mt-1 bg-white">
                  <option value="">— None —</option>
                  {program.settings.presentationTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div><Label>Chair(s)</Label>
                <Input value={chairNames} onChange={e => setChairNames(e.target.value)} placeholder="e.g. Dr. Nguyen Van A, Prof. Smith" className="mt-1" />
              </div>
              <div>
                <Label>Assign Papers</Label>
                <div className="mt-1 max-h-40 overflow-y-auto border rounded-xl divide-y">
                  {allPapers.length === 0
                    ? <p className="p-3 text-sm text-gray-400 italic">No accepted papers</p>
                    : allPapers.map(p => (
                      <label key={p.id} className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" checked={selectedPapers.includes(p.id)}
                          onChange={e => setSelectedPapers(prev => e.target.checked ? [...prev, p.id] : prev.filter(x => x !== p.id))}
                          className="mt-0.5 rounded text-indigo-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-800 leading-tight">{p.title}</p>
                          <p className="text-xs text-gray-500">Paper #{p.id}</p>
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            </>
          )}
          <div className="flex gap-2 pt-1">
            {onDelete && (
              <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { onDelete(); onClose() }}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            )}
            <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleSave}>
              {initialData?.id ? 'Save Changes' : 'Add Session'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Day Grid ────────────────────────────────────────────────────────────────
interface DayGridProps {
  day: any
  program: AdvancedProgram
  allPapers: PaperResponse[]
  onAddSession: (dayDate: string, data: any) => void
  onEditSession: (dayDate: string, sessionId: string, data: any) => void
  onDeleteSession: (dayDate: string, sessionId: string) => void
  onDeleteDay: (date: string) => void
}

function DayGrid({ day, program, allPapers, onAddSession, onEditSession, onDeleteSession, onDeleteDay }: DayGridProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)

  const locations = program.settings.locations
  const types = program.settings.presentationTypes

  // Compute min/max time for the day from sessions
  const sessions: any[] = day.sessions || []
  const allStartMins = sessions.map((s: any) => timeToMinutes(s.startTime))
  const allEndMins = sessions.map((s: any) => timeToMinutes(s.endTime))
  const dayStart = allStartMins.length > 0 ? Math.max(0, Math.min(...allStartMins) - 30) : 8 * 60
  const dayEnd = allEndMins.length > 0 ? Math.max(...allEndMins) + 30 : 18 * 60
  const totalMins = dayEnd - dayStart
  const gridHeight = totalMins * PX_PER_MIN

  // Hour markers
  const hourMarkers = []
  const startHour = Math.floor(dayStart / 60)
  const endHour = Math.ceil(dayEnd / 60)
  for (let h = startHour; h <= endHour; h++) {
    const mins = h * 60
    if (mins >= dayStart && mins <= dayEnd) {
      hourMarkers.push({ hour: h, offset: (mins - dayStart) * PX_PER_MIN })
    }
  }

  const dateObj = new Date(day.date)
  const dateLabel = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Day date header */}
      <div className="bg-[#1e2a4a] text-white flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-indigo-300" />
          <span className="font-bold text-base">{dateLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAddOpen(true)}
            className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs rounded-lg h-8 px-3">
            <Plus className="w-3.5 h-3.5 mr-1" /> ADD SESSION
          </Button>
          <button onClick={() => onDeleteDay(day.date)} className="text-indigo-300 hover:text-red-400 transition-colors ml-1">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="bg-white border-b border-gray-200 flex" style={{ paddingLeft: '72px' }}>
        {locations.map(loc => (
          <div key={loc.id} className="flex-1 text-center text-sm font-semibold text-gray-600 py-2.5 border-l border-gray-100 first:border-l-0">
            {loc.name}
          </div>
        ))}
        {locations.length === 0 && (
          <div className="flex-1 py-2.5 text-center text-sm text-gray-400 italic">Add locations in Configuration</div>
        )}
      </div>

      {/* Grid body */}
      <div className="relative bg-white flex" style={{ height: `${gridHeight}px` }}>
        {/* Time axis */}
        <div className="w-[72px] shrink-0 relative border-r border-gray-100 bg-gray-50">
          {hourMarkers.map(({ hour, offset }) => (
            <div key={hour} className="absolute right-0 pr-2 flex items-center" style={{ top: `${offset}px`, transform: 'translateY(-50%)' }}>
              <span className="text-[11px] font-bold text-red-600 whitespace-nowrap">
                {formatTime12(`${hour.toString().padStart(2, '0')}:00`)}
              </span>
            </div>
          ))}
          {/* Horizontal hour lines across full grid — rendered via border-top dashes */}
          {hourMarkers.map(({ hour, offset }) => (
            <div key={`line-${hour}`} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: `${offset}px`, width: '10000px' }} />
          ))}
        </div>

        {/* Session columns */}
        {locations.length > 0 ? (
          <div className="flex flex-1 relative">
            {locations.map(loc => (
              <div key={loc.id} className="flex-1 relative border-l border-gray-100">
                {sessions
                  .filter((s: any) => !s.isGlobal && s.locationId === loc.id)
                  .map((s: any) => {
                    const top = (timeToMinutes(s.startTime) - dayStart) * PX_PER_MIN
                    const height = Math.max((timeToMinutes(s.endTime) - timeToMinutes(s.startTime)) * PX_PER_MIN, 40)
                    const type = types.find(t => t.id === s.typeId)
                    const bgColor = type?.color || '#6366f1'
                    return (
                      <div key={s.id} className="absolute left-1 right-1 rounded-lg overflow-hidden cursor-pointer group/card"
                        style={{ top: `${top}px`, height: `${height}px`, backgroundColor: bgColor }}
                        onClick={() => setEditTarget(s)}>
                        <div className="px-3 py-2 h-full flex flex-col justify-start relative">
                          {/* Action icons */}
                          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                            <button className="p-1 bg-black/20 rounded text-white hover:bg-black/40" onClick={e => { e.stopPropagation(); setEditTarget(s) }}><Edit2 className="w-3 h-3" /></button>
                            <button className="p-1 bg-black/20 rounded text-white hover:bg-red-500/80" onClick={e => { e.stopPropagation(); onDeleteSession(day.date, s.id) }}><Trash2 className="w-3 h-3" /></button>
                          </div>
                          <div className="text-white/80 text-[10px] font-medium mb-0.5">{formatTime12(s.startTime)} BST / {formatTime12(s.endTime)} BST</div>
                          <div className="text-white font-bold text-sm leading-tight line-clamp-2">{s.title}</div>
                          {type && <div className="text-white/80 text-[11px] mt-1">Presentation type: {type.name}</div>}
                          {s.chairNames && <div className="text-white/80 text-[11px]">Chair(s): {s.chairNames}</div>}
                          {s.papers?.length > 0 && <div className="text-white/70 text-[10px] mt-0.5">{s.papers.length} paper(s)</div>}
                        </div>
                      </div>
                    )
                  })}
              </div>
            ))}

            {/* Global (full-width) sessions overlay */}
            {sessions.filter((s: any) => s.isGlobal).map((s: any) => {
              const top = (timeToMinutes(s.startTime) - dayStart) * PX_PER_MIN
              const height = Math.max((timeToMinutes(s.endTime) - timeToMinutes(s.startTime)) * PX_PER_MIN, 36)
              return (
                <div key={s.id}
                  className="absolute left-0 right-0 cursor-pointer group/global"
                  style={{ top: `${top}px`, height: `${height}px`, zIndex: 10 }}>
                  <div className="mx-1 h-full bg-[#1e2a4a] rounded-lg flex items-center px-4 relative">
                    <div className="flex-1">
                      <div className="text-white/70 text-[10px] font-medium">{formatTime12(s.startTime)} – {formatTime12(s.endTime)}</div>
                      <div className="text-white font-bold text-sm">{s.title}</div>
                      {s.chairNames && <div className="text-white/70 text-[11px]">Chair(s): {s.chairNames}</div>}
                    </div>
                    <div className="absolute top-1.5 right-2 flex gap-1 opacity-0 group-hover/global:opacity-100 transition-opacity">
                      <button className="p-1 bg-white/20 rounded text-white hover:bg-white/30" onClick={() => setEditTarget(s)}><Edit2 className="w-3 h-3" /></button>
                      <button className="p-1 bg-white/20 rounded text-white hover:bg-red-500/80" onClick={() => onDeleteSession(day.date, s.id)}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
            Add locations in Configuration tab first
          </div>
        )}
      </div>

      {/* Add/Edit dialogs */}
      {addOpen && (
        <SessionForm open={addOpen} onClose={() => setAddOpen(false)}
          program={program} allPapers={allPapers}
          onSave={(data) => onAddSession(day.date, data)} />
      )}
      {editTarget && (
        <SessionForm open={!!editTarget} onClose={() => setEditTarget(null)}
          program={program} allPapers={allPapers}
          initialData={{ ...editTarget }}
          onSave={(data) => { onEditSession(day.date, editTarget.id, data); setEditTarget(null) }}
          onDelete={() => { onDeleteSession(day.date, editTarget.id); setEditTarget(null) }} />
      )}
    </div>
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
    const { title, isGlobal, locationId, typeId, chairNames, startTime, endTime, selectedPapers } = data
    const papers = allPapers.filter(p => (selectedPapers || []).includes(p.id)).map((p, i) => ({ paperId: p.id, title: p.title, authors: '', order: i + 1 }))
    const newSession = { id: crypto.randomUUID(), title, isGlobal, locationId: isGlobal ? null : locationId, typeId, chairNames, startTime, endTime, papers }
    const newDays = days.map(d => d.date === dayDate ? { ...d, sessions: [...(d.sessions || []), newSession] } : d)
    onProgramChange({ ...program, schedule: { days: newDays } as any })
  }

  const editSession = (dayDate: string, sessionId: string, data: any) => {
    const { title, isGlobal, locationId, typeId, chairNames, startTime, endTime, selectedPapers } = data
    const papers = allPapers.filter(p => (selectedPapers || []).includes(p.id)).map((p, i) => ({ paperId: p.id, title: p.title, authors: '', order: i + 1 }))
    const newDays = days.map(d => d.date !== dayDate ? d : {
      ...d, sessions: d.sessions.map((s: any) => s.id === sessionId ? { ...s, title, isGlobal, locationId: isGlobal ? null : locationId, typeId, chairNames, startTime, endTime, papers } : s)
    })
    onProgramChange({ ...program, schedule: { days: newDays } as any })
  }

  const deleteSession = (dayDate: string, sessionId: string) => {
    const newDays = days.map(d => d.date !== dayDate ? d : { ...d, sessions: d.sessions.filter((s: any) => s.id !== sessionId) })
    onProgramChange({ ...program, schedule: { days: newDays } as any })
  }

  return (
    <div className="space-y-6">
      {/* Add Day Row */}
      <div className="flex items-center gap-3 p-4 bg-white border rounded-2xl shadow-sm">
        <Input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)}
          className="rounded-xl max-w-[220px]" />
        <Button onClick={addDay} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
          <Plus className="w-4 h-4 mr-1" /> Add Day
        </Button>
        {days.length === 0 && <span className="text-sm text-gray-400 italic">No days yet — pick a date and add</span>}
      </div>

      {/* Day grids */}
      {days.map(day => (
        <DayGrid key={day.date} day={day} program={program} allPapers={allPapers}
          onAddSession={addSession} onEditSession={editSession} onDeleteSession={deleteSession} onDeleteDay={removeDay} />
      ))}
    </div>
  )
}

export default GridBuilderPanel
