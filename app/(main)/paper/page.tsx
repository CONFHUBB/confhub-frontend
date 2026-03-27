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
    Filter, X, Building2
} from 'lucide-react'
import { UnifiedDataTable, type DataTableColumn } from '@/components/ui/unified-data-table'

// ── Status Configuration ──
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    DRAFT: { label: 'Draft', color: 'bg-amber-100 text-amber-700 hover:bg-amber-100', icon: <Edit className="w-3 h-3" /> },
    SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-700 hover:bg-blue-100', icon: <Send className="w-3 h-3" /> },
    UNDER_REVIEW: { label: 'Under Review', color: 'bg-purple-100 text-purple-700 hover:bg-purple-100', icon: <Search className="w-3 h-3" /> },
    ACCEPTED: { label: 'Accepted', color: 'bg-green-100 text-green-700 hover:bg-green-100', icon: <CheckCircle2 className="w-3 h-3" /> },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700 hover:bg-red-100', icon: <XCircle className="w-3 h-3" /> },
    WITHDRAWN: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-700 hover:bg-gray-100', icon: <Ban className="w-3 h-3" /> },
    CAMERA_READY: { label: 'Camera Ready', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100', icon: <Camera className="w-3 h-3" /> },
    PUBLISHED: { label: 'Published', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100', icon: <Globe className="w-3 h-3" /> },
    REVISION: { label: 'Revision Required', color: 'bg-orange-100 text-orange-700 hover:bg-orange-100', icon: <AlertTriangle className="w-3 h-3" /> }
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as PaperStatus[]
const ACTION_STATUSES: PaperStatus[] = ['DRAFT', 'REVISION']

function StatusBadge({ status }: { status: PaperStatus }) {
    const config = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: null }
    return (
        <Badge variant="outline" className={`gap-1.5 border-transparent ${config.color} uppercase tracking-wider text-[10px] font-bold px-2 py-0.5`}>
            {config.icon}
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
    const [currentPage, setCurrentPage] = useState(1)

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
        const start = (currentPage - 1) * ITEMS_PER_PAGE
        return filteredPapers.slice(start, start + ITEMS_PER_PAGE)
    }, [filteredPapers, currentPage])

    // Reset page when filters change
    useEffect(() => { setCurrentPage(1) }, [searchQuery, statusFilter, conferenceFilter, sortBy])

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
        <div className="container mx-auto py-8 px-4 max-w-7xl space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">My Papers</h1>
                <p className="text-muted-foreground mt-1">
                    Track your submissions and manage paper details
                </p>
            </div>

            {/* Summary Stats */}
            {papers.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30">
                        <CardContent className="p-4">
                            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">Total Papers</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20">
                        <CardContent className="p-4">
                            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.underReview}</p>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">Under Review</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20">
                        <CardContent className="p-4">
                            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.accepted}</p>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">Accepted</p>
                        </CardContent>
                    </Card>
                    <Card className={`border-0 shadow-sm ${stats.needsAction > 0 ? 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-800' : 'bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30'}`}>
                        <CardContent className="p-4">
                            <p className={`text-2xl font-bold ${stats.needsAction > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}`}>{stats.needsAction}</p>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">Needs Action</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── Control Bar: Search + Filters in one row ── */}
            {papers.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border border-border rounded-lg px-3 py-2 bg-muted/30">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            id="paper-search"
                            placeholder="Search by title, abstract, keywords or track..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-sm bg-background"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="w-px h-5 bg-border shrink-0" />

                    {/* Status Filter */}
                    <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as PaperStatus | 'ALL')}
                        className="h-8 px-2.5 text-xs border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                    >
                        <option value="ALL">All Statuses</option>
                        {ALL_STATUSES.map(s => (
                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                        ))}
                    </select>

                    {/* Conference Filter */}
                    <select
                        id="conference-filter"
                        value={conferenceFilter}
                        onChange={(e) => setConferenceFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                        className="h-8 px-2.5 text-xs border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer max-w-[200px] truncate"
                    >
                        <option value="ALL">All Conferences</option>
                        {conferences.map(([id, name]) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                    </select>

                    {/* Sort */}
                    <select
                        id="sort-by"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'title')}
                        className="h-8 px-2.5 text-xs border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="title">Title A–Z</option>
                    </select>

                    {/* Clear Filters */}
                    {(activeFilterCount > 0 || searchQuery) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={clearFilters}
                        >
                            <X className="h-3 w-3" />
                            Clear
                            {activeFilterCount > 0 && (
                                <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </Button>
                    )}
                </div>
            )}

            {/* ── UnifiedDataTable ── */}
            {(() => {
                const pageOffset = (currentPage - 1) * ITEMS_PER_PAGE
                const columns: DataTableColumn<PaperResponse>[] = [
                    {
                        header: '#',
                        accessorKey: 'id',
                        className: 'w-[48px] text-center',
                        cell: (paper) => (
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {pageOffset + paginatedPapers.indexOf(paper) + 1}
                            </span>
                        ),
                    },
                    {
                        header: 'ID',
                        accessorKey: 'id',
                        className: 'w-[72px]',
                        cell: (paper) => (
                            <span className="text-xs font-mono text-muted-foreground">
                                #{paper.id}
                            </span>
                        ),
                    },
                    {
                        header: 'Title',
                        accessorKey: 'title',
                        className: 'w-1/2',
                        cell: (paper) => (
                            <p
                                className="max-w-full truncate font-medium text-gray-900"
                                title={paper.title}
                            >
                                {ACTION_STATUSES.includes(paper.status) && (
                                    <AlertTriangle className="inline h-3.5 w-3.5 text-amber-500 mr-1.5 -mt-0.5" />
                                )}
                                {paper.title}
                            </p>
                        ),
                    },
                    {
                        header: 'Conference',
                        accessorKey: 'track',
                        className: 'w-36',
                        cell: (paper) => (
                            <span
                                className="block max-w-[140px] truncate text-sm text-gray-600"
                                title={paper.track?.conference?.name}
                            >
                                <Building2 className="inline h-3 w-3 mr-1 text-gray-400" />
                                {paper.track?.conference?.acronym}
                            </span>
                        ),
                    },
                    {
                        header: 'Track',
                        accessorKey: 'track',
                        className: 'w-[150px]',
                        cell: (paper) => (
                            <span
                                className="block max-w-[140px] truncate text-sm text-gray-600"
                                title={paper.track?.name}
                            >
                                {paper.track?.name}
                            </span>
                        ),
                    },
                    {
                        header: 'Status',
                        accessorKey: 'status',
                        className: 'w-36',
                        cell: (paper) => <StatusBadge status={paper.status} />,
                    },
                    {
                        header: 'Submitted',
                        accessorKey: 'submissionTime',
                        className: 'w-28',
                        cell: (paper) => (
                            <span className="text-xs text-gray-500 tabular-nums">
                                {new Date(paper.submissionTime).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric'
                                })}
                            </span>
                        ),
                    },
                    {
                        header: '',
                        accessorKey: 'id',
                        className: 'w-28',
                        cell: (paper) => (
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300"
                                onClick={() => router.push(`/paper/${paper.id}`)}
                            >
                                <Upload className="h-3.5 w-3.5" />
                                Workspace
                            </Button>
                        ),
                    },
                ]

                return (
                    <UnifiedDataTable<PaperResponse>
                        title=""
                        columns={columns}
                        data={paginatedPapers}
                        isLoading={false}
                        keyExtractor={(p) => p.id}
                        pagination={{
                            currentPage: currentPage - 1,
                            totalPages,
                            totalElements: filteredPapers.length,
                            onPageChange: (p) => setCurrentPage(p + 1),
                        }}
                    />
                )
            })()}
        </div>
    )
}
