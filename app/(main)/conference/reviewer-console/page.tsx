'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getUserRoleAssignments } from '@/app/api/conference-user-track.api'
import { getConference } from '@/app/api/conference.api'
import { useUserRoles } from '@/hooks/useUserConferenceRoles'
import type { ConferenceUserTrackResponse } from '@/types/notification'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Loader2, Calendar, MapPin, Search, Filter,
    ChevronLeft, ChevronRight, ArrowRight, FolderOpen, ClipboardList,
} from 'lucide-react'
import Link from 'next/link'

// ── Status helpers ──────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    active:    { label: 'Active',    color: 'bg-green-50 text-green-700 border-green-200',   dot: 'bg-green-500' },
    upcoming:  { label: 'Upcoming',  color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
    completed: { label: 'Completed', color: 'bg-gray-100 text-gray-700 border-gray-200',     dot: 'bg-gray-400' },
    draft:     { label: 'Draft',     color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
}

const getStatusInfo = (status: string) =>
    STATUS_CONFIG[status.toLowerCase()] ?? STATUS_CONFIG.draft

const PAGE_SIZE = 6

interface ReviewerConference {
    id: number
    name: string
    acronym: string
    location?: string
    startDate?: string
    endDate?: string
    status?: string
}

export default function ReviewerConsolePage() {
    const router = useRouter()
    const { userId } = useUserRoles()
    const [conferences, setConferences] = useState<ReviewerConference[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(0)

    const fetchReviewerConferences = useCallback(async () => {
        if (!userId) { setLoading(false); return }
        try {
            setLoading(true)
            const roles = await getUserRoleAssignments(userId)
            const reviewerRoles = roles.filter(
                (r: ConferenceUserTrackResponse) => r.assignedRole === 'REVIEWER' && r.isAccepted === true
            )
            const uniqueConfIds = Array.from(new Set(reviewerRoles.map(r => r.conferenceId)))

            const confList: ReviewerConference[] = []
            await Promise.all(
                uniqueConfIds.map(async (confId) => {
                    try {
                        const conf = await getConference(confId)
                        confList.push({
                            id: confId,
                            name: conf.name,
                            acronym: conf.acronym,
                            location: conf.location,
                            startDate: conf.startDate,
                            endDate: conf.endDate,
                            status: conf.status,
                        })
                    } catch { /* ignore */ }
                })
            )
            confList.sort((a, b) => a.name.localeCompare(b.name))
            setConferences(confList)
        } catch (err) {
            console.error('Failed to load reviewer conferences:', err)
        } finally {
            setLoading(false)
        }
    }, [userId])

    useEffect(() => { fetchReviewerConferences() }, [fetchReviewerConferences])

    // ── Client-side filtering ───────────────────────────
    const filteredConferences = useMemo(() => {
        return conferences.filter((c) => {
            if (statusFilter !== 'all' && c.status?.toLowerCase() !== statusFilter) return false
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                if (
                    !c.name?.toLowerCase().includes(q) &&
                    !c.acronym?.toLowerCase().includes(q) &&
                    !c.location?.toLowerCase().includes(q)
                ) return false
            }
            return true
        })
    }, [conferences, statusFilter, searchQuery])

    // ── Pagination ──────────────────────────────────────
    const totalPages = Math.ceil(filteredConferences.length / PAGE_SIZE)
    const pagedConferences = filteredConferences.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

    useEffect(() => { setCurrentPage(0) }, [searchQuery, statusFilter])

    // ── Stats ───────────────────────────────────────────
    const stats = useMemo(() => ({
        total: conferences.length,
        active: conferences.filter(c => c.status?.toLowerCase() === 'active').length,
        upcoming: conferences.filter(c => c.status?.toLowerCase() === 'upcoming').length,
        completed: conferences.filter(c => c.status?.toLowerCase() === 'completed').length,
    }), [conferences])

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'TBA'
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
        })
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* ── Header ──────────────────────────────────── */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
                    <ClipboardList className="h-6 w-6 text-amber-600" />
                    My Reviews
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Conferences where you serve as a Reviewer
                </p>
            </div>

            {/* ── Stats Cards ────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: stats.total, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
                    { label: 'Active', value: stats.active, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
                    { label: 'Upcoming', value: stats.upcoming, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
                    { label: 'Completed', value: stats.completed, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-100' },
                ].map((stat) => (
                    <div key={stat.label} className={`rounded-xl border p-4 ${stat.bg}`}>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Filter Toolbar ──────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, acronym, or location..."
                        className="pl-9 h-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44 h-10">
                        <div className="flex items-center gap-2">
                            <Filter className="h-3.5 w-3.5" />
                            <SelectValue placeholder="Filter status" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* ── Results info ────────────────────────────── */}
            {searchQuery || statusFilter !== 'all' ? (
                <p className="text-xs text-muted-foreground">
                    Showing {filteredConferences.length} of {conferences.length} conferences
                </p>
            ) : null}

            {/* ── Empty / Table ───────────────────────────── */}
            {conferences.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
                    <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">No reviewer assignments</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        You have not been assigned as a reviewer for any conference yet.
                    </p>
                </div>
            ) : filteredConferences.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 py-12 text-center">
                    <Search className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-muted-foreground">No conferences match your filters.</p>
                    <Button variant="link" className="mt-2 text-indigo-600" onClick={() => { setSearchQuery(''); setStatusFilter('all') }}>
                        Clear all filters
                    </Button>
                </div>
            ) : (
                <div className="rounded-xl border bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/30 text-muted-foreground">
                                <tr>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">#</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Conference</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Location</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Date</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {pagedConferences.map((conf, idx) => {
                                    const statusInfo = getStatusInfo(conf.status || 'draft')
                                    return (
                                        <tr key={conf.id} className="transition-colors hover:bg-amber-50/30">
                                            <td className="px-5 py-4 text-xs text-muted-foreground font-medium">
                                                {currentPage * PAGE_SIZE + idx + 1}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div>
                                                    <p className="font-medium truncate max-w-[250px]">{conf.name}</p>
                                                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{conf.acronym}</p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                                    <MapPin className="size-3.5 shrink-0" />
                                                    <span className="truncate">{conf.location || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                                    <Calendar className="size-3.5 shrink-0" />
                                                    {formatDate(conf.startDate)} — {formatDate(conf.endDate)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Badge variant="outline" className={`text-[10px] font-semibold ${statusInfo.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot} mr-1.5`} />
                                                    {statusInfo.label}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <Link href={`/conference/${conf.id}/reviewer`}>
                                                    <Button variant="outline" size="sm" className="gap-2 shrink-0 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800">
                                                        Open Console <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Pagination ─────────────────────────────── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                        Page {currentPage + 1} of {totalPages} · {filteredConferences.length} conference{filteredConferences.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex gap-1">
                        <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <Button
                                key={i}
                                variant={i === currentPage ? 'default' : 'outline'}
                                size="sm"
                                className={`w-8 h-8 p-0 text-xs ${i === currentPage ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                                onClick={() => setCurrentPage(i)}
                            >
                                {i + 1}
                            </Button>
                        ))}
                        <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
