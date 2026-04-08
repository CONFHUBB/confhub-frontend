'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getPapersByAuthor } from '@/app/api/paper.api'
import { getUserByEmail } from '@/app/api/user.api'
import type { PaperResponse, PaperStatus } from '@/types/paper'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Loader2, Edit, FileText, Send, Search, CheckCircle2, XCircle, Ban,
    Camera, Globe, AlertTriangle, Calendar, Tag, Layers, BarChart3, Star, Upload,
    Filter, X, Building2, ArrowRight, FolderOpen
} from 'lucide-react'
import { StandardPagination } from '@/components/ui/standard-pagination'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import Link from 'next/link'
import { getPaperStatus, PAPER_STATUS } from '@/lib/constants/status'
import { fmtDate } from '@/lib/utils'


const ALL_STATUSES = Object.keys(PAPER_STATUS) as PaperStatus[]
const ACTION_STATUSES: PaperStatus[] = ['DRAFT']

function StatusBadge({ status }: { status: PaperStatus }) {
    const config = getPaperStatus(status)
    return (
        <Badge variant="outline" className={`text-[10px] font-semibold border-transparent uppercase ${config.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.dot}`} />
            {config.label}
        </Badge>
    )
}

const ITEMS_PER_PAGE = 10

export default function UserSubmissionsPage() {
    const router = useRouter()
    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Search, filter & pagination state
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<PaperStatus | 'ALL'>('ALL')
    const [conferenceFilter, setConferenceFilter] = useState<number | 'ALL'>('ALL')
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest')
    const [currentPage, setCurrentPage] = useState(0)

    useEffect(() => {
        const fetchPapers = async () => {
            try {
                setLoading(true)
                const token = localStorage.getItem("accessToken")
                if (!token) return router.push("/auth/login")
                const payload = JSON.parse(atob(token.split(".")[1]))
                const email = payload.sub
                const user = await getUserByEmail(email)
                if (!user || !user.id) return

                const data = await getPapersByAuthor(user.id)
                setPapers(Array.isArray(data) ? data : [])
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to fetch your papers.')
            } finally {
                setLoading(false)
            }
        }
        fetchPapers()
    }, [])

    const conferences = useMemo(() => {
        const map = new Map<number, string>()
        papers.forEach(p => {
            const conf = p.track?.conference
            if (conf && !map.has(conf.id)) map.set(conf.id, `${conf.acronym} – ${conf.name}`)
        })
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
    }, [papers])

    // ── Filtered + sorted papers ──
    const filteredPapers = useMemo(() => {
        let result = [...papers]

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            result = result.filter(p =>
                p.title?.toLowerCase().includes(q) ||
                (p.abstractField && p.abstractField.toLowerCase().includes(q)) ||
                (p.keywords && p.keywords.some(kw => kw.toLowerCase().includes(q))) ||
                p.track?.name?.toLowerCase().includes(q)
            )
        }

        // Status filter
        if (statusFilter !== 'ALL') {
            result = result.filter(p => p.status === statusFilter)
        }

        // Conference filter
        if (conferenceFilter !== 'ALL') {
            result = result.filter(p => p.track?.conference?.id === conferenceFilter)
        }

        // Sort
        switch (sortBy) {
            case 'newest':
                result.sort((a, b) => new Date(b.submissionTime).getTime() - new Date(a.submissionTime).getTime())
                break
            case 'oldest':
                result.sort((a, b) => new Date(a.submissionTime).getTime() - new Date(b.submissionTime).getTime())
                break
            case 'title':
                result.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
                break
        }

        return result
    }, [papers, searchQuery, statusFilter, conferenceFilter, sortBy])

    // ── Pagination ──
    const totalPages = Math.ceil(filteredPapers.length / ITEMS_PER_PAGE)
    const paginatedPapers = useMemo(() => {
        const start = currentPage * ITEMS_PER_PAGE
        return filteredPapers.slice(start, start + ITEMS_PER_PAGE)
    }, [filteredPapers, currentPage])

    // Reset page when filters change
    useEffect(() => { setCurrentPage(0) }, [searchQuery, statusFilter, conferenceFilter, sortBy])

    // ── Compute stats ──
    const stats = {
        total: papers.length,
        underReview: papers.filter(p => p.status === 'UNDER_REVIEW').length,
        accepted: papers.filter(p => p.status === 'ACCEPTED' || p.status === 'PUBLISHED').length,
        needsAction: papers.filter(p => ACTION_STATUSES.includes(p.status)).length,
    }

    // Active filter count
    const activeFilterCount = [
        statusFilter !== 'ALL' ? 1 : 0,
        conferenceFilter !== 'ALL' ? 1 : 0,
    ].reduce((a, b) => a + b, 0)

    const clearFilters = () => {
        setSearchQuery('')
        setStatusFilter('ALL')
        setConferenceFilter('ALL')
        setSortBy('newest')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-destructive text-lg">{error}</p>
                {error.includes('logged in') && (
                    <Button onClick={() => router.push('/auth/login')}>
                        Go to Login
                    </Button>
                )}
            </div>
        )
    }

    return (
        <div className="page-wide space-y-6">
            {/* ── Eye-catching Header ──────────────────────────────────── */}
            <div className="relative mb-4 p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-800">
                {/* Decorative background blobs */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-indigo-500/10 to-indigo-400/10 dark:from-indigo-500/20 dark:to-indigo-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-blue-500/10 to-teal-500/10 dark:from-blue-500/20 dark:to-teal-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-4">
                            <div className="hidden sm:flex p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                                <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                My <span className="text-primary">Papers</span>
                            </div>
                        </h1>
                        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
                            Track your submissions and manage paper details
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Stats Cards ────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total", value: stats.total, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
                    { label: "Under Review", value: stats.underReview, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
                    { label: "Accepted", value: stats.accepted, color: "text-green-600", bg: "bg-green-50 border-green-100" },
                    { label: "Needs Action", value: stats.needsAction, color: stats.needsAction > 0 ? "text-amber-600" : "text-gray-600", bg: stats.needsAction > 0 ? "bg-amber-50 border-amber-200 ring-1 ring-amber-200" : "bg-gray-50 border-gray-100" },
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
                        placeholder="Search by title, abstract, or keywords..."
                        className="pl-9 h-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
                    <SelectTrigger className="w-full sm:w-44 h-10">
                        <div className="flex items-center gap-2">
                            <Filter className="h-3.5 w-3.5" />
                            <SelectValue placeholder="Filter status" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        {ALL_STATUSES.map(s => (
                            <SelectItem key={s} value={s}>{getPaperStatus(s).label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {/* Conference Filter */}
                <Select value={conferenceFilter.toString()} onValueChange={(val) => setConferenceFilter(val === 'ALL' ? 'ALL' : Number(val))}>
                    <SelectTrigger className="w-full sm:w-[200px] h-10">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5" />
                            <SelectValue placeholder="Filter conference" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Conferences</SelectItem>
                        {conferences.map(([id, name]) => (
                            <SelectItem key={id} value={id.toString()}>{name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* ── Results info ────────────────────────────── */}
            {searchQuery || statusFilter !== 'ALL' || conferenceFilter !== 'ALL' ? (
                <p className="text-xs text-muted-foreground">
                    Showing {filteredPapers.length} of {papers.length} papers
                </p>
            ) : null}

            {/* ── Empty State ────────────────────────────── */}
            {papers.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
                    <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">No papers yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-6">You have not submitted any papers to conferences yet.</p>
                </div>
            ) : filteredPapers.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 py-12 text-center">
                    <Search className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-muted-foreground">No papers match your filters.</p>
                    <Button variant="link" className="mt-2 text-indigo-600" onClick={clearFilters}>
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
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Paper Link</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Conference / Track</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Submitted</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Conf Status</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Paper Status</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginatedPapers.map((paper, idx) => {
                                    const pageOffset = currentPage * ITEMS_PER_PAGE
                                    return (
                                        <tr key={paper.id} className="transition-colors hover:bg-indigo-50/30">
                                            <td className="px-5 py-4 text-xs text-muted-foreground font-medium">
                                                {pageOffset + idx + 1}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div>
                                                    <p className="font-medium truncate max-w-[250px]">{paper.title}</p>
                                                    <p className="text-xs font-mono text-muted-foreground mt-0.5">#{paper.id}</p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-0.5 text-muted-foreground text-sm">
                                                    <span className="truncate max-w-[200px] flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{paper.track?.conference?.acronym}</span>
                                                    <span className="text-xs pl-5 truncate max-w-[200px]">{paper.track?.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                                    <Calendar className="size-3.5 shrink-0" />
                                                    {fmtDate(paper.submissionTime)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                                                    paper.track?.conference?.status === 'ONGOING' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    paper.track?.conference?.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    paper.track?.conference?.status === 'COMPLETED' ? 'bg-gray-50 text-gray-600 border-gray-200' :
                                                    'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                    {paper.track?.conference?.status || 'UNKNOWN'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={paper.status} />
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    {paper.track?.conference?.id && (
                                                        <Link href={`/conference/${paper.track.conference.id}/author`}>
                                                            <Button size="sm" className="gap-1.5 h-8 text-[11px] font-semibold tracking-wide bg-indigo-600 hover:bg-indigo-700 text-white border-0">
                                                                Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
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
                totalElements={filteredPapers.length}
                entityName="papers"
                onPageChange={setCurrentPage}
            />
        </div>
    )
}
