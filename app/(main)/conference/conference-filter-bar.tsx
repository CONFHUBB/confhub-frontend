'use client'

import { useState, useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Calendar, CheckCircle, ChevronDown, ChevronLeft, ChevronRight,
    Filter, X
} from 'lucide-react'

// ─── Date filter helpers ───
const getToday = () => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
}
const getTomorrow = () => {
    const d = getToday(); d.setDate(d.getDate() + 1); return d
}
const getWeekend = () => {
    const d = getToday()
    const day = d.getDay()
    const sat = new Date(d); sat.setDate(d.getDate() + (6 - day))
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1)
    return { start: sat, end: sun }
}
const getMonthEnd = () => {
    const d = getToday()
    return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

export type DatePreset = 'all' | 'today' | 'tomorrow' | 'weekend' | 'month'

export interface FilterValues {
    datePreset: DatePreset
    location: string
    area: string
}

interface ConferenceFilterBarProps {
    locations: string[]
    areas: string[]
    isStaff: boolean
    filters: FilterValues
    onFiltersChange: (filters: FilterValues) => void
}

const datePresetLabel: Record<DatePreset, string> = {
    all: 'All dates',
    today: 'Today',
    tomorrow: 'Tomorrow',
    weekend: 'This weekend',
    month: 'This month',
}

export function filterConferences<T extends {
    startDate: string; endDate: string; location: string; area: string
}>(items: T[], filters: FilterValues): T[] {
    let result = items

    if (filters.datePreset !== 'all') {
        result = result.filter(c => {
            const start = new Date(c.startDate)
            const end = new Date(c.endDate)
            if (filters.datePreset === 'today') { const t = getToday(); return start <= t && end >= t }
            if (filters.datePreset === 'tomorrow') { const t = getTomorrow(); return start <= t && end >= t }
            if (filters.datePreset === 'weekend') { const w = getWeekend(); return start <= w.end && end >= w.start }
            if (filters.datePreset === 'month') { const t = getToday(); const me = getMonthEnd(); return start <= me && end >= t }
            return true
        })
    }
    if (filters.location !== 'all') result = result.filter(c => c.location === filters.location)
    if (filters.area !== 'all') result = result.filter(c => c.area === filters.area)

    return result
}

export function ConferenceFilterBar({ locations, areas, isStaff, filters, onFiltersChange }: ConferenceFilterBarProps) {
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [showFilterPanel, setShowFilterPanel] = useState(false)
    const [tempLocation, setTempLocation] = useState(filters.location)
    const [tempArea, setTempArea] = useState(filters.area)

    const [calMonth, setCalMonth] = useState(() => {
        const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1)
    })
    const calMonth2 = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1)

    const dateRef = useRef<HTMLDivElement>(null)
    const filterRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDatePicker(false)
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterPanel(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const activeFilterCount = [filters.location !== 'all', filters.area !== 'all'].filter(Boolean).length

    const openFilterPanel = () => {
        setTempLocation(filters.location)
        setTempArea(filters.area)
        setShowFilterPanel(true)
        setShowDatePicker(false)
    }

    const applyFilters = () => {
        onFiltersChange({ ...filters, location: tempLocation, area: tempArea })
        setShowFilterPanel(false)
    }

    const resetFilters = () => {
        setTempLocation('all')
        setTempArea('all')
    }

    // ─── Calendar rendering ───
    const renderCalendar = (monthDate: Date) => {
        const year = monthDate.getFullYear()
        const month = monthDate.getMonth()
        const firstDay = new Date(year, month, 1).getDay()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const today = getToday()

        const dayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
        const offset = firstDay === 0 ? 6 : firstDay - 1
        const cells: (number | null)[] = Array(offset).fill(null)
        for (let d = 1; d <= daysInMonth; d++) cells.push(d)

        const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

        return (
            <div className="w-[260px]">
                <p className="text-sm font-semibold text-center mb-3">{monthName}</p>
                <div className="grid grid-cols-7 gap-0 text-center">
                    {dayNames.map(d => (
                        <span key={d} className="text-xs font-medium text-gray-400 pb-2">{d}</span>
                    ))}
                    {cells.map((day, i) => {
                        if (day === null) return <span key={`e-${i}`} />
                        const date = new Date(year, month, day)
                        const isToday = date.getTime() === today.getTime()
                        return (
                            <span
                                key={i}
                                className={`text-sm py-1.5 rounded-md cursor-default ${isToday ? 'border border-indigo-400 text-indigo-600 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                {day}
                            </span>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center mt-7 gap-3">
            {/* ── Date dropdown ── */}
            <div className="relative" ref={dateRef}>
                <button
                    onClick={() => { setShowDatePicker(!showDatePicker); setShowFilterPanel(false) }}
                    className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border transition-colors cursor-pointer ${filters.datePreset !== 'all' ? 'bg-[#34c6eb] text-white border-[#34c6eb]' : 'border-gray-300 text-gray-600 hover:border-[#34c6eb] hover:text-[#34c6eb]'}`}
                >
                    <Calendar className="h-4 w-4" />
                    {datePresetLabel[filters.datePreset]}
                    {filters.datePreset !== 'all' ? (
                        <X className="h-3.5 w-3.5 ml-1" onClick={(e) => { e.stopPropagation(); onFiltersChange({ ...filters, datePreset: 'all' }); setShowDatePicker(false) }} />
                    ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                    )}
                </button>

                {showDatePicker && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border p-5 w-auto z-50">
                        {/* Preset buttons */}
                        <div className="flex flex-wrap gap-2 mb-5">
                            {(['all', 'today', 'tomorrow', 'weekend', 'month'] as DatePreset[]).map(preset => (
                                <button
                                    key={preset}
                                    onClick={() => { onFiltersChange({ ...filters, datePreset: preset }); setShowDatePicker(false) }}
                                    className={`px-4 py-1.5 text-sm rounded-full border transition-colors cursor-pointer ${filters.datePreset === preset ? 'bg-[#34c6eb] text-white border-[#34c6eb]' : 'border-gray-300 text-gray-700 hover:border-[#34c6eb] hover:text-[#34c6eb]'}`}
                                >
                                    {datePresetLabel[preset]}
                                </button>
                            ))}
                        </div>

                        {/* 2-month calendar */}
                        <div className="flex gap-8">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="p-1 hover:bg-gray-100 rounded cursor-pointer">
                                        <ChevronLeft className="h-4 w-4 text-gray-500" />
                                    </button>
                                    <span className="text-sm font-medium" />
                                </div>
                                {renderCalendar(calMonth)}
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium" />
                                    <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="p-1 hover:bg-gray-100 rounded cursor-pointer">
                                        <ChevronRight className="h-4 w-4 text-gray-500" />
                                    </button>
                                </div>
                                {renderCalendar(calMonth2)}
                            </div>
                        </div>

                        {/* Bottom actions */}
                        <div className="flex gap-3 mt-5 pt-4 border-t">
                            <Button variant="outline" onClick={() => { onFiltersChange({ ...filters, datePreset: 'all' }); setShowDatePicker(false) }} className="flex-1">
                                Reset
                            </Button>
                            <Button onClick={() => setShowDatePicker(false)} className="flex-1">
                                Apply
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Filter button ── */}
            <div className="relative" ref={filterRef}>
                <button
                    onClick={() => { openFilterPanel(); setShowDatePicker(false) }}
                    className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border transition-colors cursor-pointer ${activeFilterCount > 0 ? 'bg-[#34c6eb] text-white border-[#34c6eb]' : 'border-gray-300 text-gray-600 hover:border-[#34c6eb] hover:text-[#34c6eb]'}`}
                >
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <>
                            <span className="bg-[#34c6eb]/20 text-[#34c6eb] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{activeFilterCount}</span>
                            <X className="h-3.5 w-3.5 ml-0.5" onClick={(e) => { e.stopPropagation(); onFiltersChange({ ...filters, location: 'all', area: 'all' }); setShowFilterPanel(false) }} />
                        </>
                    )}
                </button>

                {showFilterPanel && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border w-[420px] z-50">
                        <div className="p-5 space-y-6">
                            {/* Location */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">Location</h4>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="radio" name="location" checked={tempLocation === 'all'} onChange={() => setTempLocation('all')} className="w-4 h-4 accent-[#34c6eb]" />
                                        <span className="text-sm text-gray-700 group-hover:text-[#34c6eb] transition-colors">All locations</span>
                                    </label>
                                    {locations.map(loc => (
                                        <label key={loc} className="flex items-center gap-3 cursor-pointer group">
                                            <input type="radio" name="location" checked={tempLocation === loc} onChange={() => setTempLocation(loc)} className="w-4 h-4 accent-[#34c6eb]" />
                                            <span className="text-sm text-gray-700 group-hover:text-[#34c6eb] transition-colors">{loc}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <hr />

                            {/* Area / Category */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">Research Area</h4>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setTempArea('all')}
                                        className={`px-4 py-1.5 text-sm rounded-full border transition-colors cursor-pointer ${tempArea === 'all' ? 'bg-[#34c6eb] text-white border-[#34c6eb]' : 'border-gray-300 text-gray-700 hover:border-[#34c6eb] hover:text-[#34c6eb]'}`}
                                    >
                                        All areas
                                    </button>
                                    {areas.map(area => (
                                        <button
                                            key={area}
                                            onClick={() => setTempArea(area)}
                                            className={`px-4 py-1.5 text-sm rounded-full border transition-colors cursor-pointer ${tempArea === area ? 'bg-[#34c6eb] text-white border-[#34c6eb]' : 'border-gray-300 text-gray-700 hover:border-[#34c6eb] hover:text-[#34c6eb]'}`}
                                        >
                                            {area}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Bottom actions */}
                        <div className="flex gap-3 p-5 pt-0">
                            <Button variant="outline" onClick={resetFilters} className="flex-1">
                                Reset
                            </Button>
                            <Button onClick={applyFilters} className="flex-1">
                                Apply
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Staff badge */}
            {isStaff && (
                <Badge variant="outline" className="text-xs gap-1 py-1 px-2.5 border-[#34c6eb]/40 text-[#34c6eb]">
                    <CheckCircle className="h-3 w-3" />
                    Staff
                </Badge>
            )}
        </div>
    )
}
