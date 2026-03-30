'use client'

import React from 'react'
import { AdvancedProgram } from '@/types/program'
import { PaperResponse } from '@/types/paper'
import { Calendar, Clock, MapPin } from 'lucide-react'

// Pixels per minute at scale
const PX_PER_MIN = 2.0

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatTime12(t: string): string {
  if (!t) return ''
  const [hStr, mStr] = t.split(':')
  let h = parseInt(hStr, 10)
  const ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${mStr}${ampm}`
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

interface ProgramViewerProps {
  program: AdvancedProgram
  allPapers: PaperResponse[]
}

export function ProgramViewer({ program, allPapers }: ProgramViewerProps) {
  const days: any[] = (program.schedule as any)?.days || []

  // Assign columns purely for read-only visualization
  const assignColumns = (sessions: any[]) => {
    const list = [...sessions].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    const cols: any[][] = []
    list.forEach(s => {
      let placed = false
      for (const col of cols) {
        const last = col[col.length - 1]
        if (timeToMinutes(s.startTime) >= timeToMinutes(last.endTime)) {
          col.push(s)
          placed = true
          break
        }
      }
      if (!placed) cols.push([s])
    })
    const result: { session: any, col: number, totalCols: number }[] = []
    cols.forEach((col, cIdx) => {
      col.forEach(s => result.push({ session: s, col: cIdx, totalCols: cols.length }))
    })
    return result
  }

  const allSess = days.flatMap(d => d.sessions || [])
  const allStartMins = allSess.map((s: any) => timeToMinutes(s.startTime))
  const allEndMins = allSess.map((s: any) => timeToMinutes(s.endTime))
  const globalStart = allStartMins.length > 0 ? Math.max(0, Math.min(...allStartMins) - 30) : 8 * 60
  const globalEnd = allEndMins.length > 0 ? Math.max(...allEndMins) : 18 * 60
  const gridHeight = (globalEnd - globalStart) * PX_PER_MIN

  const hourMarkers: { hour: number; offset: number }[] = []
  for (let h = Math.floor(globalStart / 60); h <= Math.ceil(globalEnd / 60); h++) {
    const mins = h * 60
    if (mins >= globalStart && mins <= globalEnd) {
      hourMarkers.push({ hour: h, offset: (mins - globalStart) * PX_PER_MIN })
    }
  }

  if (days.length === 0) {
    return <div className="text-center text-gray-500 py-16">The detailed schedule has not been populated yet.</div>
  }

  // Session Details
  const allDetailedSessions = days.flatMap((day: any) =>
    (day.sessions || [])
      .filter((s: any) => !s.isGlobal && s.papers?.length > 0)
      .map((s: any) => ({ ...s, date: day.date }))
  ).sort((a: any, b: any) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))

  return (
    <div className="space-y-12">
      <div className="rounded-xl overflow-hidden shadow border border-gray-200 bg-white">
        <div className="flex bg-[#1e2a4a] border-b border-gray-200">
          <div className="w-[70px] shrink-0 border-r border-white/10 flex flex-col justify-center items-center py-2">
            <span className="text-white/60 text-xs font-semibold uppercase tracking-widest">Time</span>
          </div>
          {days.map(day => {
            const dateObj = new Date(day.date)
            return (
              <div key={day.date} className="flex-1 border-l border-white/10 py-2.5 px-3 text-center">
                <div className="text-white font-bold text-sm">{dateObj.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                <div className="text-white/80 text-xs">{dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            )
          })}
        </div>

        <div className="flex relative pb-5" style={{ height: `${gridHeight + 20}px` }}>
          <div className="w-[70px] shrink-0 relative border-r bg-gray-50">
            {hourMarkers.map(({ hour, offset }) => (
              <div key={hour} className="absolute right-0 pr-3 flex items-center" style={{ top: `${offset}px`, transform: 'translateY(-50%)' }}>
                <span className="text-sm font-bold text-red-600 font-mono">
                  {formatTime12(`${hour.toString().padStart(2, '0')}:00`)}
                </span>
              </div>
            ))}
          </div>

          {days.map((day: any) => {
            const sessions: any[] = day.sessions || []
            const normalSessions = sessions.filter((s: any) => !s.isGlobal)
            const globalSessions = sessions.filter((s: any) => s.isGlobal)
            const placed = assignColumns(normalSessions)

            return (
              <div key={day.date} className="flex-1 relative border-l border-gray-100">
                {hourMarkers.map(({ hour, offset }) => (
                  <div key={`line-${day.date}-${hour}`} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: `${offset}px` }} />
                ))}

                {placed.map(({ session: s, col, totalCols }) => {
                  const top = (timeToMinutes(s.startTime) - globalStart) * PX_PER_MIN
                  const height = Math.max((timeToMinutes(s.endTime) - timeToMinutes(s.startTime)) * PX_PER_MIN, 36)
                  return (
                    <div key={s.id}
                      className="absolute"
                      style={{ top: `${top + 2}px`, height: `${height - 4}px`, left: `${(col / totalCols) * 100}%`, width: `${(1 / totalCols) * 100}%` }}
                    >
                      <div className="mx-0.5 h-full rounded-md overflow-hidden relative" style={{ backgroundColor: s.color || '#6366f1' }}>
                        <div className="px-2 py-1.5 h-full flex flex-col justify-start">
                          <div className="text-white font-bold text-base leading-tight break-words mb-1">{s.title}</div>
                          {s.location && <div className="text-white/90 text-sm mt-0.5">(Room: {s.location})</div>}
                          {s.chairNames && <div className="text-white/90 text-xs mt-0.5">Chair: {s.chairNames}</div>}
                          {s.papers?.length > 0 && <div className="text-white/80 text-xs mt-1 font-medium">{s.papers.length} paper(s)</div>}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {globalSessions.map((s: any) => {
                  const top = (timeToMinutes(s.startTime) - globalStart) * PX_PER_MIN
                  const height = Math.max((timeToMinutes(s.endTime) - timeToMinutes(s.startTime)) * PX_PER_MIN, 30)
                  return (
                    <div key={s.id}
                      className="absolute left-0 right-0"
                      style={{ top: `${top + 2}px`, height: `${height - 4}px`, zIndex: 10 }}
                    >
                      <div className="mx-1 h-full rounded-md flex items-center justify-center px-4 shadow-sm border border-black/10" style={{ backgroundColor: s.color || '#1e2a4a' }}>
                        <div className="text-white font-bold text-base text-center leading-tight py-1">{s.title}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Session Details */}
      {allDetailedSessions.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold border-b pb-2">Session Details</h3>
          {allDetailedSessions.map((s: any) => {
            const dateLabel = new Date(s.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
            return (
              <div key={s.id} className="border rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 text-center" style={{ backgroundColor: s.color || '#1e2a4a' }}>
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
                      .sort((a: any, b: any) => (a.order || 999) - (b.order || 999))
                      .map((p: any, pIdx: number) => {
                        const sStartMin = timeToMin(s.startTime)
                        const totalMins = timeToMin(s.endTime) - sStartMin
                        const minsPerPaper = s.papers.length > 0 ? totalMins / s.papers.length : 0
                        const paperStart = sStartMin + pIdx * minsPerPaper
                        const paperEnd = sStartMin + (pIdx + 1) * minsPerPaper
                        
                        const fullPaper = allPapers.find(ap => ap.id === p.paperId)

                        return (
                          <tr key={p.paperId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2 text-center text-gray-500 text-xs font-mono">{p.paperId}</td>
                            <td className="px-3 py-2 text-gray-800 text-xs leading-tight">
                              {(fullPaper as any)?.authorNames && (fullPaper as any).authorNames.length > 0 
                                ? (fullPaper as any).authorNames.join(', ') 
                                : 'TBA'}
                            </td>
                            <td className="px-3 py-2 font-medium text-gray-900 leading-tight">
                              {p.title}
                            </td>
                            <td className="px-3 py-2">
                              {(fullPaper as any)?.trackName ? (
                                <div className="text-[10px] leading-tight text-center bg-gray-100 text-gray-600 px-2 py-1 rounded-md mx-auto max-w-[120px]">
                                  {(fullPaper as any).trackName}
                                </div>
                              ) : <span className="text-gray-400 text-xs text-center block">—</span>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {(() => {
                                const pMode = p.presentationType
                                if (!pMode || pMode === 'None' || pMode === '') return <span className="text-gray-400 text-xs">—</span>
                                return (
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                    pMode === 'Oral Presentation' ? 'bg-blue-100 text-blue-700' :
                                    pMode === 'Poster' ? 'bg-amber-100 text-amber-700' :
                                    pMode === 'Tutorial' ? 'bg-purple-100 text-purple-700' :
                                    pMode === 'Workshop' ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {pMode}
                                  </span>
                                )
                              })()}
                            </td>
                            <td className="px-3 py-2 text-center text-indigo-700 font-bold text-xs tabular-nums font-mono bg-indigo-50/30">
                              {formatTime12(`${Math.floor(paperStart / 60)}:${Math.floor(paperStart % 60).toString().padStart(2, '0')}`)}
                              <span className="text-indigo-300 font-normal mx-1">-</span>
                              {formatTime12(`${Math.floor(paperEnd / 60)}:${Math.floor(paperEnd % 60).toString().padStart(2, '0')}`)}
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
      )}
    </div>
  )
}
