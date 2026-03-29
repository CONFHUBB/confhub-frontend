'use client'

import React, { useState, useEffect } from 'react'
import { getProgram } from '@/app/api/program.api'
import { getSessionBookmarks, addSessionBookmark, removeSessionBookmark } from '@/app/api/session-bookmark.api'
import { rateSession as rateSessionApi } from '@/app/api/session.api'
import { AdvancedProgram, ProgramSession } from '@/types/program'
import { Calendar, MapPin, Bookmark, BookmarkCheck, User, Filter, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')}${ampm}`
}

export default function ProgramPage({ params }: { params: { conferenceId: string } }) {
  const conferenceId = Number(params.conferenceId)
  const [program, setProgram] = useState<AdvancedProgram | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [activeDate, setActiveDate] = useState<string>('')
  const [showOnlyBookmarked, setShowOnlyBookmarked] = useState(false)
  const [activeTypes, setActiveTypes] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [ratings, setRatings] = useState<Record<string, number>>({})

  useEffect(() => {
    const loadData = async () => {
      try {
        const progResult = await getProgram(conferenceId)
        const parsed = (typeof progResult === 'string' && progResult.trim() !== '') ? JSON.parse(progResult.trim()) : progResult
        if (parsed?.settings && parsed?.schedule) {
          setProgram(parsed)
          if (parsed.schedule.days?.length > 0) setActiveDate(parsed.schedule.days[0].date)
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    // Task 4: load bookmarks from server instead of localStorage
    getSessionBookmarks(conferenceId)
      .then(bm => setBookmarks(bm))
      .catch(() => {
        // Fallback to localStorage if not authenticated
        const bm = localStorage.getItem(`myBookmarks_${conferenceId}`)
        if (bm) { try { setBookmarks(JSON.parse(bm)) } catch {} }
      })
    // Load ratings from localStorage as cache, will be overridden by server if available
    const rt = localStorage.getItem(`sessionRatings_${conferenceId}`)
    if (rt) { try { setRatings(JSON.parse(rt)) } catch {} }
    loadData()
  }, [conferenceId])

  // Task 4: server-side toggle with optimistic local state update
  const toggleBookmark = async (sessionId: string) => {
    const isCurrently = bookmarks.includes(sessionId)
    // Optimistic update
    const next = isCurrently ? bookmarks.filter(x => x !== sessionId) : [...bookmarks, sessionId]
    setBookmarks(next)
    try {
      if (isCurrently) {
        await removeSessionBookmark(conferenceId, sessionId)
      } else {
        await addSessionBookmark(conferenceId, sessionId)
      }
    } catch {
      // Rollback on failure
      setBookmarks(bookmarks)
    }
  }

  const handleRateSession = async (sessionId: string, rating: number) => {
    // Optimistic update
    const prev = ratings[sessionId] || 0
    setRatings(r => ({ ...r, [sessionId]: rating }))
    // Persist to localStorage as fallback cache
    try {
      localStorage.setItem(`sessionRatings_${conferenceId}`, JSON.stringify({ ...ratings, [sessionId]: rating }))
    } catch {}
    // Sync to backend
    try {
      await rateSessionApi({ sessionId, conferenceId, rating })
    } catch {
      // Rollback if API fails
      setRatings(r => ({ ...r, [sessionId]: prev }))
    }
  }

  const toggleType = (id: string) => setActiveTypes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  if (loading) return <div className="p-12 text-center text-gray-500 font-medium">Loading schedule…</div>

  if (!program || !program.published) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-4xl text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">Conference Program</h1>
        <div className="p-8 bg-indigo-50 border-[3px] border-dashed border-indigo-200 rounded-2xl">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-indigo-300" />
          <h2 className="text-2xl font-bold mb-2">Schedule Not Yet Published</h2>
          <p className="text-gray-600">The organizers are still finalizing the schedule. Please check back soon.</p>
          <div className="mt-6"><Link href={`/conference/${conferenceId}`}><Button variant="outline">Back</Button></Link></div>
        </div>
      </div>
    )
  }

  const { settings, schedule } = program
  const days = schedule.days || []

  return (
    <div className="container mx-auto py-10 px-4 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b pb-6 border-gray-200 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Conference Schedule</h1>
          <p className="text-gray-500 mt-1 font-medium">Browse sessions, filter by format, and build your personal agenda.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`hidden md:flex ${showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white'}`}>
            <Filter className="w-4 h-4 mr-2" /> {showFilters ? 'Hide Filters' : 'Filter'}
          </Button>
          <Button variant="outline"
            onClick={() => setShowOnlyBookmarked(!showOnlyBookmarked)}
            className={`border-2 ${showOnlyBookmarked ? 'border-amber-400 bg-amber-50 text-amber-700' : 'bg-white text-gray-700 border-gray-200'}`}>
            {showOnlyBookmarked ? <BookmarkCheck className="w-4 h-4 mr-2 text-amber-500" /> : <Bookmark className="w-4 h-4 mr-2" />}
            My Schedule ({bookmarks.length})
          </Button>
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {/* Filters sidebar */}
        {showFilters && settings.presentationTypes.length > 0 && (
          <div className="w-56 shrink-0 bg-white border rounded-2xl p-5 shadow-sm sticky top-24">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Format Types</h3>
              <button onClick={() => setActiveTypes([])} className="text-xs text-indigo-600 hover:underline">Clear</button>
            </div>
            <div className="space-y-2">
              {settings.presentationTypes.map(t => (
                <label key={t.id} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={activeTypes.includes(t.id)} onChange={() => toggleType(t.id)}
                    className="rounded border-gray-300 text-indigo-600" />
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="text-sm font-medium text-gray-700">{t.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Main schedule */}
        <div className="flex-1 min-w-0">
          {days.length === 0 ? (
            <div className="text-center py-24 border border-dashed rounded-3xl text-gray-400">No sessions scheduled yet.</div>
          ) : (
            <Tabs value={activeDate} onValueChange={setActiveDate}>
              <TabsList className="mb-8 h-auto p-1.5 bg-gray-100 border rounded-2xl inline-flex flex-wrap">
                {days.map(day => {
                  const d = new Date(day.date)
                  return (
                    <TabsTrigger key={day.date} value={day.date}
                      className="px-6 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm font-bold text-gray-600 flex flex-col items-center gap-1 min-w-[120px]">
                      <span className="text-xs uppercase tracking-widest">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <span className="text-base">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {days.map(day => {
                const sessions = (day as any).sessions || []

                const visibleSessions = sessions.filter((s: ProgramSession) => {
                  if (s.isGlobal) return !showOnlyBookmarked
                  if (showOnlyBookmarked && !bookmarks.includes(s.id)) return false
                  if (activeTypes.length > 0 && (!s.typeId || !activeTypes.includes(s.typeId))) return false
                  return true
                }).sort((a: ProgramSession, b: ProgramSession) => a.startTime.localeCompare(b.startTime))

                return (
                  <TabsContent key={day.date} value={day.date} className="space-y-3 focus-visible:outline-none">
                    {visibleSessions.length === 0 ? (
                      <div className="text-center py-20 border border-dashed rounded-3xl text-gray-400 font-medium">
                        {showOnlyBookmarked ? 'No bookmarked sessions for this day.' : 'No sessions match your filters.'}
                      </div>
                    ) : visibleSessions.map((session: ProgramSession) => {
                      const type = settings.presentationTypes.find(t => t.id === session.typeId)
                      const loc = settings.locations.find(l => l.id === session.locationId)
                      const isBookmarked = bookmarks.includes(session.id)
                      const myRating = ratings[session.id] || 0

                      if (session.isGlobal) {
                        return (
                          <div key={session.id} className="bg-[#1e2a4a] rounded-2xl px-6 py-4">
                            <div className="text-blue-300 text-xs font-bold mb-1">
                              {formatTime12(session.startTime)} – {formatTime12(session.endTime)}
                            </div>
                            <div className="text-white font-bold text-lg">{session.title}</div>
                            {session.chairNames && <div className="text-blue-300 text-sm mt-0.5">Chair(s): {session.chairNames}</div>}
                          </div>
                        )
                      }

                      return (
                        <div key={session.id}
                          className="bg-white border rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                          style={{ borderLeft: `4px solid ${type?.color || '#e2e8f0'}` }}>
                          <div className="p-5" style={{ backgroundColor: type ? `${type.color}10` : '#fff' }}>
                            <div className="flex justify-between items-start gap-3 mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className="text-xs text-gray-500 font-medium">
                                    {formatTime12(session.startTime)} – {formatTime12(session.endTime)}
                                  </span>
                                  {type && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-white"
                                      style={{ backgroundColor: type.color }}>
                                      {type.name}
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-bold text-gray-900 text-lg leading-snug">{session.title}</h4>
                              </div>
                              <button onClick={() => toggleBookmark(session.id)}
                                className={`p-2 rounded-full shrink-0 ${isBookmarked ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                {isBookmarked ? <BookmarkCheck className="w-5 h-5 fill-current" /> : <Bookmark className="w-5 h-5" />}
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm font-medium text-gray-500 mb-3">
                              {loc && (
                                <span className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border text-xs">
                                  <MapPin className="w-3 h-3" /> {loc.name}
                                </span>
                              )}
                              {session.chairNames && (
                                <span className="flex items-center gap-1.5 text-xs">
                                  <User className="w-3 h-3" /> {session.chairNames}
                                </span>
                              )}
                            </div>

                            {session.papers && session.papers.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                                {session.papers.map((p: any) => (
                                  <div key={p.paperId} className="flex gap-2 items-start">
                                    <div className="w-5 h-5 bg-white border rounded text-xs font-bold flex items-center justify-center shrink-0 text-gray-500">{p.order}</div>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-800 leading-snug">{p.title}</p>
                                      {p.authors && <p className="text-xs text-gray-400 mt-0.5">{p.authors}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Star Rating */}
                            <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-gray-100">
                              <span className="text-xs text-gray-400 font-medium mr-1">Rate:</span>
                              {[1,2,3,4,5].map(star => (
                                <button key={star} onClick={() => handleRateSession(session.id, star)}
                                  className={`transition-colors ${star <= myRating ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'}`}>
                                  <Star className={`w-4 h-4 ${star <= myRating ? 'fill-current' : ''}`} />
                                </button>
                              ))}
                              {myRating > 0 && <span className="text-xs text-gray-400 ml-1">({myRating}/5)</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </TabsContent>
                )
              })}
            </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}
