'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getPapersByAuthor } from '@/app/api/paper.api'
import { getUserByEmail } from '@/app/api/user.api'
import { getAggregateByPaper, type ReviewAggregate } from '@/app/api/review-aggregate.api'
import { getMetaReviewByPaper } from '@/app/api/meta-review.api'
import type { MetaReviewResponse } from '@/types/meta-review'
import type { PaperResponse, PaperStatus } from '@/types/paper'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Loader2, Edit, FileText, Send, Search, CheckCircle2, XCircle, Ban,
    Camera, Globe, AlertTriangle, Calendar, Tag, Layers, BarChart3, Star, Upload,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, X
} from 'lucide-react'

// ── Status Configuration ──
const STATUS_CONFIG: Record<PaperStatus, {
    label: string
    color: string
    bgColor: string
    borderColor: string
    icon: React.ReactNode
}> = {
    DRAFT: {
        label: 'Draft',
        color: 'text-amber-700 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800',
        icon: <FileText className="h-3.5 w-3.5" />,
    },
    SUBMITTED: {
        label: 'Submitted',
        color: 'text-indigo-700 dark:text-indigo-400',
        bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
        borderColor: 'border-indigo-200 dark:border-indigo-800',
        icon: <Send className="h-3.5 w-3.5" />,
    },
    UNDER_REVIEW: {
        label: 'Under Review',
        color: 'text-purple-700 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-950/30',
        borderColor: 'border-purple-200 dark:border-purple-800',
        icon: <Search className="h-3.5 w-3.5" />,
    },
    ACCEPTED: {
        label: 'Accepted',
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    REJECTED: {
        label: 'Rejected',
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-200 dark:border-red-800',
        icon: <XCircle className="h-3.5 w-3.5" />,
    },
    WITHDRAWN: {
        label: 'Withdrawn',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-800/30',
        borderColor: 'border-gray-200 dark:border-gray-700',
        icon: <Ban className="h-3.5 w-3.5" />,
    },
    CAMERA_READY: {
        label: 'Camera Ready',
        color: 'text-indigo-700 dark:text-indigo-400',
        bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
        borderColor: 'border-indigo-200 dark:border-indigo-800',
        icon: <Camera className="h-3.5 w-3.5" />,
    },
    PUBLISHED: {
        label: 'Published',
        color: 'text-emerald-700 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        icon: <Globe className="h-3.5 w-3.5" />,
    },
}

// Statuses that need user action
const ACTION_STATUSES: PaperStatus[] = ['DRAFT', 'CAMERA_READY']

// All possible statuses for filter
const ALL_STATUSES: PaperStatus[] = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'CAMERA_READY', 'PUBLISHED']

// Decision config
const DECISION_STYLE: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    APPROVE: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
    REJECT: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="h-3 w-3" /> },
    REVISION: { label: 'Revision Required', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <AlertTriangle className="h-3 w-3" /> },
}

const ITEMS_PER_PAGE = 10

interface ReviewInfo {
    aggregate: ReviewAggregate | null
    metaReview: MetaReviewResponse | null
}

// ── StatusBadge Component ──
function StatusBadge({ status }: { status: PaperStatus }) {
    const config = STATUS_CONFIG[status]
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color} ${config.bgColor} ${config.borderColor}`}>
            {config.icon}
            {config.label}
        </span>
    )
}

// ── PaperCard Component ──
function PaperCard({ paper, reviewInfo, onEdit }: { paper: PaperResponse; reviewInfo?: ReviewInfo; onEdit: () => void }) {
    const router = useRouter()
    const needsAction = ACTION_STATUSES.includes(paper.status)
    const agg = reviewInfo?.aggregate
    const meta = reviewInfo?.metaReview
    const decision = meta?.finalDecision ? DECISION_STYLE[meta.finalDecision] : null
    const isAccepted = paper.status === 'ACCEPTED'

    return (
        <div className={`group relative rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/30 ${
            needsAction ? 'border-l-4 border-l-amber-400' : ''
        }`}>
            {/* Action Required Banner */}
            {needsAction && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/30 rounded-t-xl">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        {paper.status === 'DRAFT' ? 'Complete your submission' : 'Upload camera-ready version'}
                    </span>
                </div>
            )}

            <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                    {/* Main content */}
                    <div className="flex-1 min-w-0 space-y-3">
                        {/* Title + Status */}
                        <div className="flex flex-wrap items-start gap-2.5">
                            <h3 className="font-semibold text-base text-foreground leading-snug flex-1 min-w-0 line-clamp-2">
                                {paper.title}
                            </h3>
                            <StatusBadge status={paper.status} />
                        </div>

                        {/* Abstract preview */}
                        {paper.abstractField && (
                            <p className="text-sm text-muted-foreground line-clamp-1 leading-relaxed">
                                {paper.abstractField}
                            </p>
                        )}

                        {/* Meta info row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                                <Layers className="h-3.5 w-3.5" />
                                {paper.track.name}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Submitted {new Date(paper.submissionTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground/70">
                                <Globe className="h-3.5 w-3.5" />
                                {paper.track.conference.acronym}
                            </span>
                        </div>

                        {/* Review Results — visible when reviews exist */}
                        {agg && agg.reviewCount > 0 && (
                            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-dashed">
                                <span className="inline-flex items-center gap-1.5 text-xs">
                                    <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
                                    <span className="text-muted-foreground">Reviews:</span>
                                    <span className="font-semibold">{agg.completedReviewCount}/{agg.reviewCount}</span>
                                </span>
                                {agg.averageTotalScore !== null && agg.averageTotalScore > 0 && (
                                    <span className="inline-flex items-center gap-1.5 text-xs">
                                        <Star className="h-3.5 w-3.5 text-amber-500" />
                                        <span className="text-muted-foreground">Avg Score:</span>
                                        <span className={`font-semibold font-mono ${
                                            agg.averageTotalScore >= 3.5 ? 'text-emerald-600' :
                                            agg.averageTotalScore >= 2 ? 'text-indigo-600' : 'text-red-600'
                                        }`}>{agg.averageTotalScore.toFixed(1)}</span>
                                    </span>
                                )}
                                {decision && (
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${decision.color}`}>
                                        {decision.icon}
                                        {decision.label}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Keywords */}
                        {paper.keywords && paper.keywords.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <Tag className="h-3 w-3 text-muted-foreground" />
                                {paper.keywords.map((kw, i) => (
                                    <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                                        {kw}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right side: Edit + Workspace buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity"
                            onClick={onEdit}
                        >
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                        </Button>
                        <Button
                            size="sm"
                            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => router.push(`/conference/${paper.track.conference.id}/author`)}
                        >
                            <Upload className="h-3.5 w-3.5" />
                            Workspace
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Pagination Component ──
function Pagination({ currentPage, totalPages, onPageChange }: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}) {
    if (totalPages <= 1) return null

    const getVisiblePages = () => {
        const pages: (number | 'ellipsis')[] = []
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            pages.push(1)
            if (currentPage > 3) pages.push('ellipsis')
            const start = Math.max(2, currentPage - 1)
            const end = Math.min(totalPages - 1, currentPage + 1)
            for (let i = start; i <= end; i++) pages.push(i)
            if (currentPage < totalPages - 2) pages.push('ellipsis')
            pages.push(totalPages)
        }
        return pages
    }

    return (
        <div className="flex items-center justify-center gap-1.5 pt-6">
            <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage === 1}
                onClick={() => onPageChange(1)}
            >
                <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            {getVisiblePages().map((page, i) =>
                page === 'ellipsis' ? (
                    <span key={`e${i}`} className="px-1.5 text-xs text-muted-foreground">…</span>
                ) : (
                    <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        className={`h-8 w-8 p-0 text-xs font-medium ${currentPage === page ? '' : ''}`}
                        onClick={() => onPageChange(page)}
                    >
                        {page}
                    </Button>
                )
            )}

            <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(totalPages)}
            >
                <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
        </div>
    )
}

// ── Main Page ──
export default function UserSubmissionsPage() {
    const router = useRouter()
    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [reviewInfoMap, setReviewInfoMap] = useState<Record<number, ReviewInfo>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Search, filter & pagination state
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<PaperStatus | 'ALL'>('ALL')
    const [conferenceFilter, setConferenceFilter] = useState<number | 'ALL'>('ALL')
    const [currentPage, setCurrentPage] = useState(1)
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest')

    useEffect(() => {
        fetchPapers()
    }, [])

    const fetchPapers = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('accessToken')
            if (!token) {
                setError('You must be logged in to view your submissions.')
                setTimeout(() => router.push('/auth/login'), 2000)
                return
            }

            const payload = JSON.parse(atob(token.split('.')[1]))
            const userEmail = payload.sub

            if (!userEmail) {
                setError('Invalid token. Please log in again.')
                setTimeout(() => router.push('/auth/login'), 2000)
                return
            }

            const user = await getUserByEmail(userEmail)
            if (!user || !user.id) {
                setError('User not found. Unable to load papers.')
                setLoading(false)
                return
            }

            const data = await getPapersByAuthor(user.id)
            setPapers(data)

            // Fetch review info for non-draft papers
            const reviewablePapers = data.filter(p => p.status !== 'DRAFT')
            const reviewMap: Record<number, ReviewInfo> = {}
            await Promise.all(
                reviewablePapers.map(async (p) => {
                    try {
                        const [aggregate, metaReview] = await Promise.all([
                            getAggregateByPaper(p.id).catch(() => null),
                            getMetaReviewByPaper(p.id).catch(() => null),
                        ])
                        reviewMap[p.id] = { aggregate, metaReview }
                    } catch { /* ignore */ }
                })
            )
            setReviewInfoMap(reviewMap)
        } catch (err: any) {
            console.error('Error fetching papers:', err)
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Session expired. Please log in again.')
                setTimeout(() => router.push('/auth/login'), 2000)
            } else {
                setError(`Failed to load submissions: ${err.message || 'Unknown error'}`)
            }
        } finally {
            setLoading(false)
        }
    }

    // ── Unique conferences for filter dropdown ──
    const conferences = useMemo(() => {
        const map = new Map<number, string>()
        papers.forEach(p => {
            const conf = p.track.conference
            if (!map.has(conf.id)) map.set(conf.id, `${conf.acronym} – ${conf.name}`)
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
                p.title.toLowerCase().includes(q) ||
                (p.abstractField && p.abstractField.toLowerCase().includes(q)) ||
                (p.keywords && p.keywords.some(kw => kw.toLowerCase().includes(q))) ||
                p.track.name.toLowerCase().includes(q)
            )
        }

        // Status filter
        if (statusFilter !== 'ALL') {
            result = result.filter(p => p.status === statusFilter)
        }

        // Conference filter
        if (conferenceFilter !== 'ALL') {
            result = result.filter(p => p.track.conference.id === conferenceFilter)
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
                result.sort((a, b) => a.title.localeCompare(b.title))
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
        <div className="container mx-auto py-8 px-4 max-w-5xl space-y-6">
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

            {/* Search + Filters */}
            {papers.length > 0 && (
                <div className="space-y-3">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="paper-search"
                            placeholder="Search by title, abstract, keywords, or track..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Filter Row */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Filter className="h-3.5 w-3.5" />
                            <span className="font-medium">Filters:</span>
                        </div>

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
                            className="h-8 px-2.5 text-xs border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer max-w-[220px] truncate"
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

                        {/* Results count */}
                        <span className="ml-auto text-xs text-muted-foreground">
                            {filteredPapers.length === papers.length
                                ? `${papers.length} paper${papers.length !== 1 ? 's' : ''}`
                                : `${filteredPapers.length} of ${papers.length} papers`
                            }
                        </span>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {papers.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-16 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-1">No papers yet</h3>
                        <p className="text-sm text-muted-foreground">
                            You haven&apos;t submitted any papers yet. Submit a paper to a conference to get started.
                        </p>
                    </CardContent>
                </Card>
            ) : filteredPapers.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                        <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-foreground mb-1">No papers match your filters</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            Try adjusting your search or filter criteria.
                        </p>
                        <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1.5">
                            <X className="h-3.5 w-3.5" />
                            Clear all filters
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {paginatedPapers.map((paper) => (
                        <PaperCard
                            key={paper.id}
                            paper={paper}
                            reviewInfo={reviewInfoMap[paper.id]}
                            onEdit={() => router.push(`/paper/${paper.id}`)}
                        />
                    ))}

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />

                    {/* Page info */}
                    {totalPages > 1 && (
                        <p className="text-center text-xs text-muted-foreground">
                            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredPapers.length)} of {filteredPapers.length} papers
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
