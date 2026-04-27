"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getProgramConferences, getUpcomingConferenceActivities } from "@/app/api/conference.api"
import { getUserByEmail } from "@/app/api/user.api"
import type { ConferenceListResponse } from "@/types/conference"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toUpcomingActivityDeadline, type UpcomingActivityDeadline } from "@/lib/activity"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Loader2,
    Calendar,
    Clock,
    MapPin,
    Search,
    Plus,
    Building2,
    Filter,
    ArrowRight,
    FolderOpen,
} from "lucide-react"
import { StandardPagination } from "@/components/ui/standard-pagination"
import Link from "next/link"
import { fmtDate } from '@/lib/utils'
import { getConferenceStatus, getConferenceStatusSortRank } from '@/lib/constants/status'

// ── Status helpers ──────────────────────────────────────
const getStatusInfo = (status: string) => getConferenceStatus(status)

const PAGE_SIZE = 6

export default function ProgramConferencesPage() {
    const router = useRouter()
    const [conferences, setConferences] = useState<ConferenceListResponse[]>([])
    const [deadlinesByConference, setDeadlinesByConference] = useState<Record<number, UpcomingActivityDeadline | null>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filters
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [currentPage, setCurrentPage] = useState(0)


    useEffect(() => {
        const fetchMyConferences = async () => {
            try {
                setLoading(true)
                const token = localStorage.getItem("accessToken")
                if (!token) {
                    setError("You must be logged in to view your conferences.")
                    setTimeout(() => router.push("/auth/login"), 2000)
                    return
                }

                let userEmail = ""
                try {
                    const payload = JSON.parse(atob(token.split(".")[1]))
                    userEmail = payload.sub
                } catch {
                    throw new Error("Invalid token format")
                }

                if (!userEmail) {
                    setError("Invalid token. Please log in again.")
                    setTimeout(() => router.push("/auth/login"), 2000)
                    return
                }

                const user = await getUserByEmail(userEmail)
                if (!user || !user.id) {
                    setError("User not found. Unable to load conferences.")
                    setLoading(false)
                    return
                }

                const data = await getProgramConferences(user.id, 0, 100)
                const programConferences = data.content || []
                setConferences(programConferences)

                const upcomingActivities = await getUpcomingConferenceActivities(programConferences.map(c => c.id))
                const deadlines = Object.fromEntries(
                    programConferences.map((conference) => [
                        conference.id,
                        toUpcomingActivityDeadline(upcomingActivities[conference.id] ?? null),
                    ])
                ) as Record<number, UpcomingActivityDeadline | null>
                setDeadlinesByConference(deadlines)
            } catch (err: unknown) {
                console.error("Error fetching program chaired conferences:", err)
                const statusCode = typeof err === "object" && err !== null && "response" in err
                    ? (err as { response?: { status?: number } }).response?.status
                    : undefined

                if (statusCode === 401 || statusCode === 403) {
                    setError("Session expired. Please log in again.")
                    setTimeout(() => router.push("/auth/login"), 2000)
                } else {
                    const errorMessage = err instanceof Error ? err.message : "Unknown error"
                    setError(`Failed to load conferences: ${errorMessage}`)
                }
            } finally {
                setLoading(false)
            }
        }
        fetchMyConferences()
    }, [router])

    // ── Client-side filtering ───────────────────────────
    const filteredConferences = useMemo(() => {
        const filtered = conferences.filter((c) => {
            // Status filter
            if (statusFilter !== "all" && c.status?.toLowerCase() !== statusFilter) return false
            // Search
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

        return filtered.sort((a, b) => {
            const statusDiff = getConferenceStatusSortRank(a.status) - getConferenceStatusSortRank(b.status)
            if (statusDiff !== 0) return statusDiff

            const aDays = deadlinesByConference[a.id]?.daysLeft
            const bDays = deadlinesByConference[b.id]?.daysLeft

            if (aDays == null && bDays == null) return a.name.localeCompare(b.name)
            if (aDays == null) return 1
            if (bDays == null) return -1
            if (aDays !== bDays) return aDays - bDays
            return a.name.localeCompare(b.name)
        })
    }, [conferences, statusFilter, searchQuery, deadlinesByConference])

    // ── Pagination ──────────────────────────────────────
    const totalPages = Math.ceil(filteredConferences.length / PAGE_SIZE)
    const pagedConferences = filteredConferences.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

    // Reset page on filter change
    useEffect(() => { setCurrentPage(0) }, [searchQuery, statusFilter])

    // ── Stats ───────────────────────────────────────────
    const stats = useMemo(() => ({
        total: conferences.length,
        active: conferences.filter(c => c.status?.toLowerCase() === 'open').length,
        upcoming: conferences.filter(c => ['pending_approval', 'setup'].includes(c.status?.toLowerCase() || '')).length,
        completed: conferences.filter(c => ['completed', 'cancelled'].includes(c.status?.toLowerCase() || '')).length,
    }), [conferences])

    const formatDate = (dateString: string) => fmtDate(dateString)

    // ── Loading / Error states ──────────────────────────
    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
                <p className="text-lg text-destructive">{error}</p>
                {error.includes("logged in") && (
                    <Button onClick={() => router.push("/auth/login")}>Go to Login</Button>
                )}
            </div>
        )
    }

    return (
        <div className="page-wide space-y-6">
            {/* ── Eye-catching Header ──────────────────────────────────── */}
            <div className="relative mb-4 p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-800">
                {/* Decorative background blobs */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-secondary/10 dark:bg-secondary/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-4">
                            <div className="hidden sm:flex p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                                <Building2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                My <span className="text-primary">Conferences</span>
                            </div>
                        </h1>
                        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
                            Manage conferences where you serve as Program Chair
                        </p>
                    </div>
                    <Link href="/conference/create" className="shrink-0">
                        <Button size="lg" className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 rounded-xl font-semibold px-6">
                            <Plus className="h-5 w-5" />
                            New Conference
                        </Button>
                    </Link>
                </div>
            </div>

            {/* ── Stats Cards ────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total", value: stats.total, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
                    { label: "Active", value: stats.active, color: "text-green-600", bg: "bg-green-50 border-green-100" },
                    { label: "Upcoming", value: stats.upcoming, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
                    { label: "Completed", value: stats.completed, color: "text-gray-600", bg: "bg-gray-50 border-gray-100" },
                ].map((stat) => (
                    <div key={stat.label} className={`rounded-xl border p-4 ${stat.bg}`}>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Filter Toolbar ──────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, acronym, or location..."
                        className="pl-9 h-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44 h-10">
                        <div className="flex items-center gap-2">
                            <Filter className="h-3.5 w-3.5" />
                            <SelectValue placeholder="Filter status" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending_approval">Pending Approval</SelectItem>
                        <SelectItem value="setup">Setup</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>

            </div>

            {/* ── Results info ────────────────────────────── */}
            {searchQuery || statusFilter !== 'all' ? (
                <p className="text-xs text-muted-foreground">
                    Showing {filteredConferences.length} of {conferences.length} conferences
                </p>
            ) : null}

            {/* ── Empty State ────────────────────────────── */}
            {conferences.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
                    <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">No conferences yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-6">You are not serving as a Program Chair for any conferences.</p>

                </div>
            ) : filteredConferences.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 py-12 text-center">
                    <Search className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-muted-foreground">No conferences match your filters.</p>
                    <Button variant="link" className="mt-2 text-indigo-600" onClick={() => { setSearchQuery(""); setStatusFilter("all") }}>
                        Clear all filters
                    </Button>
                </div>
            ) : (
                /* ── Table View ────────────────────────────── */
                <div className="rounded-xl border bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/30 text-muted-foreground">
                                <tr>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">#</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Conference</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Location</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Date</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Deadline</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {pagedConferences.map((conf, idx) => {
                                    const statusInfo = getStatusInfo(conf.status || 'PENDING_APPROVAL')
                                    const deadlineInfo = deadlinesByConference[conf.id] || null
                                    return (
                                        <tr key={conf.id} className="transition-colors hover:bg-indigo-50/30">
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
                                                    <span className="truncate">{conf.location}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                                    <Calendar className="size-3.5 shrink-0" />
                                                    {formatDate(conf.startDate)} — {formatDate(conf.endDate)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                {deadlineInfo ? (
                                                    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${deadlineInfo.isUrgent ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                                                        <Clock className="w-3 h-3" />
                                                        {deadlineInfo.label}: {deadlineInfo.daysLeft}d left
                                                        {deadlineInfo.isUrgent && ' ⚠'}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <Badge variant="outline" className={`text-[10px] font-semibold ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                                                    {statusInfo.label}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {conf.status === 'CANCELLED' ? (
                                                    <Button disabled size="sm" variant="secondary" className="h-8 text-[11px] font-semibold tracking-wide shrink-0">
                                                        Cancelled
                                                    </Button>
                                                ) : (
                                                    <Link href={`/conference/${conf.id}/update`}>
                                                        <Button size="sm" className="gap-1.5 h-8 text-[11px] font-semibold tracking-wide bg-indigo-600 hover:bg-indigo-700 text-white border-0 shrink-0">
                                                            Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <StandardPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalElements={filteredConferences.length}
                entityName="conferences"
                onPageChange={setCurrentPage}
            />
        </div>
    )
}
