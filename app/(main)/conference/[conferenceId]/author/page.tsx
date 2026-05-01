'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getConference } from '@/app/api/conference.api'
import { getUserByEmail } from '@/app/api/user.api'
import { getPapersByAuthor } from '@/app/api/paper.api'
import { getMyTickets, type TicketResponse } from '@/app/api/registration.api'
import { getAggregateByPaper, type ReviewAggregate } from '@/app/api/review-aggregate.api'
import { getMetaReviewByPaper } from '@/app/api/meta-review.api'
import { downloadAcceptanceLetter, downloadInvoice, downloadCertificate } from '@/app/api/document.api'
import type { MetaReviewResponse } from '@/types/meta-review'
import type { ConferenceResponse } from '@/types/conference'
import type { PaperResponse } from '@/types/paper'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import {
    Loader2, ArrowLeft, FileText, Ticket, User, ChevronDown, ChevronRight,
    ChevronUp, LayoutDashboard, Star, CheckCircle2, XCircle, Clock, Download,
    Search, Filter, MoreHorizontal, Eye, Upload, Check, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { AuthorPhaseTracker } from './author-phase-tracker'
import dynamic from 'next/dynamic'
import { getPaperStatus, PAPER_STATUS } from '@/lib/constants/status'
import { getCurrentUserEmail } from '@/lib/auth'
import { Breadcrumb } from '@/components/shared/breadcrumb'
import { WorkspaceSkeleton } from '@/components/shared/skeletons'
import { fmtDate } from '@/lib/utils'

const CameraReadyPage = dynamic(() => import('./camera-ready/page'), {
    loading: () => <WorkspaceSkeleton />
})

// ── Types ──
type AuthorTab = 'overview' | 'my-papers' | 'camera-ready' | 'my-ticket' | 'profile'

const TAB_GROUPS = [
    {
        title: 'Overview',
        icon: <LayoutDashboard className="h-4 w-4" />,
        accentColor: 'text-primary',
        items: [{ key: 'overview' as AuthorTab, label: 'Dashboard' }],
    },
    {
        title: 'Papers',
        icon: <FileText className="h-4 w-4" />,
        accentColor: 'text-emerald-600',
        items: [
            { key: 'my-papers' as AuthorTab, label: 'My Papers' },
            { key: 'camera-ready' as AuthorTab, label: 'Camera-Ready' },
        ],
    },
    {
        title: 'Registration',
        icon: <Ticket className="h-4 w-4" />,
        accentColor: 'text-rose-600',
        items: [{ key: 'my-ticket' as AuthorTab, label: 'My Ticket' }],
    },
    {
        title: 'Account',
        icon: <User className="h-4 w-4" />,
        accentColor: 'text-indigo-600',
        items: [{ key: 'profile' as AuthorTab, label: 'Profile' }],
    },
]



const PAGE_SIZE = 20

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
export default function AuthorDashboardPage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [tickets, setTickets] = useState<TicketResponse[]>([])
    const [userInfo, setUserInfo] = useState<{ id: number; firstName: string; lastName: string; email: string } | null>(null)
    const [reviewData, setReviewData] = useState<Record<number, ReviewAggregate | null>>({})
    const [metaReviews, setMetaReviews] = useState<Record<number, MetaReviewResponse | null>>({})
    const [loading, setLoading] = useState(true)

    const searchParams = useSearchParams()
    const initialTab = (searchParams.get('tab') as AuthorTab) || 'overview'
    const [activeTab, setActiveTab] = useState<AuthorTab>(initialTab)
    const [expandedGroups, setExpandedGroups] = useState<string[]>(TAB_GROUPS.map(g => g.title))

    useEffect(() => {
        const tab = searchParams.get('tab') as AuthorTab
        if (tab && ['overview', 'my-papers', 'camera-ready', 'my-ticket', 'profile'].includes(tab)) {
            setActiveTab(tab)
            // Expand the group containing this tab
            const group = TAB_GROUPS.find(g => g.items.some(i => i.key === tab))
            if (group && !expandedGroups.includes(group.title)) {
                setExpandedGroups(prev => [...prev, group.title])
            }
        }
    }, [searchParams])

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const email = getCurrentUserEmail()
            if (!email) { router.push('/auth/login'); return }
            const user = await getUserByEmail(email)
            if (!user?.id) { router.push('/auth/login'); return }
            setUserInfo({ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email })

            const [conf, allPapers] = await Promise.all([
                getConference(conferenceId),
                getPapersByAuthor(user.id),
            ])
            setConference(conf)
            const confPapers = allPapers.filter((p: PaperResponse) => p.conferenceId === conferenceId)
            setPapers(confPapers)

            const [aggResults, mrResults] = await Promise.all([
                Promise.all(confPapers.map((p: PaperResponse) => getAggregateByPaper(p.id).catch(() => null))),
                Promise.all(confPapers.map((p: PaperResponse) => getMetaReviewByPaper(p.id).catch(() => null))),
            ])
            const aggMap: Record<number, ReviewAggregate | null> = {}
            const mrMap: Record<number, MetaReviewResponse | null> = {}
            confPapers.forEach((p: PaperResponse, i: number) => { aggMap[p.id] = aggResults[i]; mrMap[p.id] = mrResults[i] })
            setReviewData(aggMap)
            setMetaReviews(mrMap)

            try { setTickets(await getMyTickets(user.id)) } catch { setTickets([]) }
        } catch (err) {
            console.error('Failed to load author dashboard:', err)
        } finally {
            setLoading(false)
        }
    }, [conferenceId, router])

    useEffect(() => { fetchData() }, [fetchData])

    if (loading) return <WorkspaceSkeleton />
    if (!conference) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <p className="text-muted-foreground text-lg">Conference not found</p>
            <Button onClick={() => router.back()}>Back</Button>
        </div>
    )

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview': return <OverviewTab papers={papers} tickets={tickets} conference={conference} conferenceId={conferenceId} reviewData={reviewData} onNavigate={setActiveTab} />
            case 'my-papers': return <MyPapersTab papers={papers} reviewData={reviewData} metaReviews={metaReviews} conferenceId={conferenceId} />
            case 'camera-ready': return <CameraReadyPage />
            case 'my-ticket': return <MyTicketTab tickets={tickets} papers={papers} conferenceId={conferenceId} />
            case 'profile': return <ProfileTab userInfo={userInfo} />
            default: return null
        }
    }

    return (
        <div className="min-h-screen bg-transparent flex flex-col overflow-hidden">
            <div className="flex-1 w-full max-w-[1700px] mx-auto flex flex-col p-4 md:p-8 overflow-hidden">
                {/* Breadcrumb Navigation */}
                <Breadcrumb items={[
                    { label: 'Conferences', href: '/conference' },
                    { label: conference?.acronym || 'Conference', href: `/conference/${conferenceId}` },
                    { label: 'Author Workspace' },
                ]} />

                {/* Header Area — Vibrant hero banner */}
                <div className="mb-6 shrink-0">
                    <div className="relative rounded-2xl overflow-hidden bg-primary p-6 md:px-8 md:py-7 shadow-lg">
                        {/* Decorative circles */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 blur-xl" />

                        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                {/* Acronym + Status */}
                                <div className="flex items-center gap-2.5 mb-2">
                                    {conference?.acronym && (
                                        <span className="text-xs font-mono font-semibold tracking-wider text-white/70 bg-white/10 px-2.5 py-0.5 rounded-md">
                                            {conference.acronym}
                                        </span>
                                    )}
                                    <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${conference?.status === 'OPEN' ? 'bg-emerald-400/20 text-emerald-200' :
                                            conference?.status === 'SETUP' ? 'bg-blue-400/20 text-blue-200' :
                                                conference?.status === 'COMPLETED' ? 'bg-gray-400/20 text-gray-300' :
                                                    'bg-amber-400/20 text-amber-200'
                                        }`}>
                                        {conference?.status || 'UNKNOWN'}
                                    </span>
                                </div>

                                {/* Title */}
                                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                                    {conference?.name || 'Conference'}
                                </h1>

                                <p className="text-white/60 text-sm mt-1.5 flex items-center gap-2 flex-wrap">
                                    <FileText className="h-3.5 w-3.5 shrink-0" />
                                    Author Workspace
                                </p>
                            </div>

                            {/* Right: Role badge */}
                            <div className="flex items-center gap-2.5 md:self-start">
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/95 shadow-lg">
                                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-indigo-100 text-indigo-600">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider leading-none">Your Role</p>
                                        <p className="text-sm font-bold leading-tight mt-0.5 text-indigo-700">Author</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Phase Tracker */}
                <div className="mb-6 shrink-0">
                    <AuthorPhaseTracker conferenceId={conferenceId} />
                </div>

                {/* Sidebar + Content */}
                <div className="flex flex-col md:flex-row gap-0 flex-1 min-h-0 rounded-2xl border border-border shadow-lg bg-background overflow-hidden">
                    {/* Sidebar */}
                    <div className="md:w-56 shrink-0 bg-muted/5 border-r flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-3">
                            <nav className="space-y-0.5">
                                {TAB_GROUPS.map(group => {
                                    const isExpanded = expandedGroups.includes(group.title)
                                    const isGroupActive = group.items.some(i => activeTab === i.key)
                                    return (
                                        <div key={group.title}>
                                            <button
                                                onClick={() => setExpandedGroups(prev =>
                                                    isExpanded ? prev.filter(t => t !== group.title) : [...prev, group.title]
                                                )}
                                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors
                                                    ${isGroupActive ? 'text-primary' : 'text-foreground hover:text-primary'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={group.accentColor}>{group.icon}</span>
                                                    <span className="uppercase tracking-wider">{group.title}</span>
                                                </div>
                                                {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                                            </button>
                                            {isExpanded && (
                                                <div className="flex flex-col space-y-0.5 pl-3 ml-3 border-l border-border/50">
                                                    {group.items.map(item => (
                                                        <button
                                                            key={item.key}
                                                            onClick={() => setActiveTab(item.key)}
                                                            className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors
                                                                ${activeTab === item.key
                                                                    ? 'bg-primary/10 text-primary font-semibold'
                                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                                }`}
                                                        >
                                                            {item.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0 bg-background overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-6 md:p-8 pb-20">
                                {renderTabContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB: Overview
// ════════════════════════════════════════════════════════════════════════════════
function OverviewTab({ papers, tickets, conference, conferenceId, reviewData, onNavigate }: {
    papers: PaperResponse[]; tickets: TicketResponse[]; conference: ConferenceResponse; conferenceId: number
    reviewData: Record<number, ReviewAggregate | null>; onNavigate: (t: AuthorTab) => void
}) {
    const ticket = tickets.find(t => t.conferenceId === conferenceId) || null
    const accepted = papers.filter(p => ['ACCEPTED', 'AWAITING_REGISTRATION', 'REGISTERED', 'AWAITING_CAMERA_READY', 'CAMERA_READY_SUBMITTED', 'CAMERA_READY_REJECTED', 'PUBLISHED'].includes(p.status)).length
    const underReview = papers.filter(p => p.status === 'UNDER_REVIEW').length
    const scores = Object.values(reviewData).filter(r => r && r.averageTotalScore).map(r => r!.averageTotalScore)
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—'

    const stats = [
        { label: 'Total Papers', value: String(papers.length), color: 'bg-indigo-500', accent: 'text-indigo-600' },
        { label: 'Accepted', value: String(accepted), color: 'bg-emerald-500', accent: 'text-emerald-600' },
        { label: 'Under Review', value: String(underReview), color: 'bg-amber-500', accent: 'text-amber-600' },
        { label: 'Avg. Score', value: avgScore, color: 'bg-indigo-500', accent: 'text-indigo-600' },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold">Author Dashboard</h2>
                <p className="text-sm text-muted-foreground mt-1">Overview of your papers and registration status</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map(s => (
                    <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border p-4">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                        <p className={`text-3xl font-bold mt-1 ${s.accent}`}>{s.value}</p>
                        <div className={`w-10 h-1 rounded-full mt-2 ${s.color}`} />
                    </div>
                ))}
            </div>

            {/* Paper Template */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-100">
                        <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                        <p className="font-semibold">Paper Template</p>
                        <p className="text-sm text-muted-foreground">
                            {conference.paperTemplateUrl ? 'Download the sample template before submitting.' : 'No template uploaded yet.'}
                        </p>
                    </div>
                </div>
                {conference.paperTemplateUrl ? (
                    <Button variant="outline" size="sm" asChild>
                        <a href={conference.paperTemplateUrl} target="_blank" rel="noreferrer">
                            Download
                        </a>
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" disabled>
                        Unavailable
                    </Button>
                )}
            </div>

            {/* Registration */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ticket?.paymentStatus === 'COMPLETED' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                        <Ticket className={`h-5 w-5 ${ticket?.paymentStatus === 'COMPLETED' ? 'text-emerald-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                        <p className="font-semibold">{ticket ? `Registered — ${ticket.ticketTypeName}` : 'Not Registered'}</p>
                        <p className="text-sm text-muted-foreground">
                            {ticket?.paymentStatus === 'COMPLETED' ? `Reg #${ticket.registrationNumber}` : ticket?.paymentStatus === 'PENDING' ? 'Payment pending' : 'Go to Camera-Ready to register'}
                        </p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate(ticket ? 'my-ticket' : 'camera-ready')}>
                    {ticket ? 'View Ticket' : 'Register'}
                </Button>
            </div>

            {/* Quick nav */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'My Papers', tab: 'my-papers' as AuthorTab, icon: <FileText className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                    { label: 'Camera-Ready', tab: 'camera-ready' as AuthorTab, icon: <Upload className="h-5 w-5" />, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
                    { label: 'My Ticket', tab: 'my-ticket' as AuthorTab, icon: <Ticket className="h-5 w-5" />, color: 'text-rose-600 bg-rose-50 border-rose-200' },
                    { label: 'Profile', tab: 'profile' as AuthorTab, icon: <User className="h-5 w-5" />, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
                ].map(nav => (
                    <button key={nav.tab} onClick={() => onNavigate(nav.tab)} className={`flex items-center gap-3 p-4 rounded-xl border ${nav.color} hover:shadow-sm transition-shadow text-left`}>
                        {nav.icon}
                        <span className="font-semibold text-sm">{nav.label}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB: My Papers — TABLE format with filters, search, sort, actions
// ════════════════════════════════════════════════════════════════════════════════
function MyPapersTab({ papers, reviewData, metaReviews, conferenceId }: {
    papers: PaperResponse[]
    reviewData: Record<number, ReviewAggregate | null>
    metaReviews: Record<number, MetaReviewResponse | null>
    conferenceId: number
}) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterTrack, setFilterTrack] = useState('all')
    const [sortKey, setSortKey] = useState<'id' | 'title' | 'status' | 'score'>('id')
    const [sortAsc, setSortAsc] = useState(true)
    const [currentPage, setCurrentPage] = useState(0)
    const [expandedId, setExpandedId] = useState<number | null>(null)

    const trackNames = useMemo(() => Array.from(new Set(papers.map(p => p.track?.name).filter(Boolean))).sort(), [papers])
    const activeFilterCount = filterTrack !== 'all' ? 1 : 0

    // Status chips counts
    const statusCounts = useMemo(() => {
        const c: Record<string, number> = {}
        papers.forEach(p => { c[p.status] = (c[p.status] || 0) + 1 })
        return c
    }, [papers])

    const filtered = useMemo(() => {
        let r = papers
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            r = r.filter(p => p.title.toLowerCase().includes(q) || p.id.toString().includes(q))
        }
        if (filterStatus !== 'all') r = r.filter(p => p.status === filterStatus)
        if (filterTrack !== 'all') r = r.filter(p => p.track?.name === filterTrack)
        return [...r].sort((a, b) => {
            let cmp = 0
            if (sortKey === 'id') cmp = a.id - b.id
            if (sortKey === 'title') cmp = a.title.localeCompare(b.title)
            if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
            if (sortKey === 'score') {
                const sa = reviewData[a.id]?.averageTotalScore ?? -1
                const sb = reviewData[b.id]?.averageTotalScore ?? -1
                cmp = sa - sb
            }
            return sortAsc ? cmp : -cmp
        })
    }, [papers, searchQuery, filterStatus, filterTrack, sortKey, sortAsc, reviewData])

    useEffect(() => { setCurrentPage(0) }, [searchQuery, filterStatus, filterTrack])

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

    const handleSort = (key: typeof sortKey) => {
        if (sortKey === key) setSortAsc(v => !v)
        else { setSortKey(key); setSortAsc(true) }
    }

    const SortIcon = ({ k }: { k: typeof sortKey }) =>
        sortKey !== k ? <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" /> :
            sortAsc ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />

    const exportCSV = () => {
        const headers = ['ID', 'Title', 'Track', 'Status', 'Submitted', 'Score', 'Decision']
        const rows = filtered.map(p => [
            p.id,
            `"${p.title.replace(/"/g, '""')}"`,
            `"${p.track?.name || ''}"`,
            p.status,
            fmtDate(p.submissionTime),
            reviewData[p.id]?.averageTotalScore?.toFixed(1) || 'N/A',
            metaReviews[p.id]?.finalDecision || 'N/A',
        ])
        const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n')
        const link = document.createElement('a')
        link.href = encodeURI(csv)
        link.download = `my_papers_${new Date().toISOString().split('T')[0]}.csv`
        link.click()
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-bold">My Papers</h2>
                <p className="text-sm text-muted-foreground mt-1">{papers.length} paper{papers.length !== 1 ? 's' : ''} in this conference</p>
            </div>

            {/* Status chips */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setFilterStatus('all')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${filterStatus === 'all' ? 'ring-2 ring-primary bg-primary/5 border-primary/30 font-semibold' : 'hover:bg-muted/50'}`}
                >
                    <span className="font-bold">{papers.length}</span>
                    <span className="text-muted-foreground text-xs">All</span>
                </button>
                {Object.entries(PAPER_STATUS).map(([status, cfg]) => {
                    const count = statusCounts[status] || 0
                    if (count === 0) return null
                    const isActive = filterStatus === status
                    return (
                        <button key={status} onClick={() => setFilterStatus(isActive ? 'all' : status)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all hover:shadow-sm ${isActive ? 'ring-2 ring-primary bg-primary/5 border-primary/30' : 'hover:bg-muted/50'}`}
                        >
                            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                            <span className="font-bold">{count}</span>
                            <span className="text-muted-foreground text-xs">{cfg.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 h-9 text-sm" placeholder="Search by title or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    {trackNames.length > 1 && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-9 gap-2 text-sm px-3">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    Track
                                    {activeFilterCount > 0 && <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{activeFilterCount}</Badge>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-0" align="end">
                                <div className="p-3 space-y-1">
                                    {[{ value: 'all', label: 'All Tracks' }, ...trackNames.map(t => ({ value: t, label: t }))].map(opt => (
                                        <div key={opt.value} onClick={() => { setFilterTrack(opt.value); setCurrentPage(0) }}
                                            className="flex items-center justify-between px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-muted">
                                            <span className={filterTrack === opt.value ? 'font-medium' : ''}>{opt.label}</span>
                                            {filterTrack === opt.value && <Check className="h-4 w-4" />}
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportCSV}>
                        <Download className="h-4 w-4" /> Export
                    </Button>
                </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground border rounded-lg">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>{searchQuery || filterStatus !== 'all' ? 'No papers match your filters.' : 'No papers submitted yet.'}</p>
                </div>
            ) : (
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-12 text-center text-xs cursor-pointer group" onClick={() => handleSort('id')}>
                                    <span className="flex items-center justify-center gap-1"># <SortIcon k="id" /></span>
                                </TableHead>
                                <TableHead className="min-w-[220px] cursor-pointer group" onClick={() => handleSort('title')}>
                                    <span className="flex items-center gap-1">Title <SortIcon k="title" /></span>
                                </TableHead>
                                <TableHead className="w-28">Track</TableHead>
                                <TableHead className="w-28 text-center cursor-pointer group" onClick={() => handleSort('status')}>
                                    <span className="flex items-center justify-center gap-1">Status <SortIcon k="status" /></span>
                                </TableHead>
                                <TableHead className="w-20 text-center cursor-pointer group" onClick={() => handleSort('score')}>
                                    <span className="flex items-center justify-center gap-1">Score <SortIcon k="score" /></span>
                                </TableHead>
                                <TableHead className="w-24 text-center">Decision</TableHead>
                                <TableHead className="w-16 text-center">Reviews</TableHead>
                                <TableHead className="w-16 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.map(paper => {
                                const agg = reviewData[paper.id]
                                const mr = metaReviews[paper.id]
                                const sc = getPaperStatus(paper.status)
                                const isExpanded = expandedId === paper.id

                                return (
                                    <React.Fragment key={paper.id}>
                                        <TableRow className="cursor-pointer hover:bg-muted/30" onClick={() => setExpandedId(isExpanded ? null : paper.id)}>
                                            <TableCell className="text-center text-xs text-muted-foreground font-mono">{paper.id}</TableCell>
                                            <TableCell>
                                                <p className="font-medium line-clamp-1 text-sm">{paper.title}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {fmtDate(paper.submissionTime)}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{paper.track?.name || '—'}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={`text-[10px] border ${sc.bg} ${sc.text} ${sc.border}`}>
                                                    {sc.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {agg && agg.averageTotalScore > 0 ? (
                                                    <span className={`font-mono text-xs font-semibold ${agg.averageTotalScore >= 3.5 ? 'text-emerald-600' :
                                                            agg.averageTotalScore >= 2 ? 'text-indigo-600' : 'text-red-500'
                                                        }`}>{agg.averageTotalScore.toFixed(1)}</span>
                                                ) : <span className="text-muted-foreground text-xs">—</span>}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {mr ? (
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${mr.finalDecision === 'APPROVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                            mr.finalDecision === 'REJECT' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                'bg-amber-100 text-amber-700 border-amber-200'
                                                        }`}>{mr.finalDecision}</span>
                                                ) : <span className="text-muted-foreground text-xs">—</span>}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {agg && agg.reviewCount > 0 ? (
                                                    <span className={`text-xs font-mono ${agg.completedReviewCount === agg.reviewCount ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}`}>
                                                        {agg.completedReviewCount}/{agg.reviewCount}
                                                    </span>
                                                ) : <span className="text-muted-foreground text-xs">—</span>}
                                            </TableCell>
                                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => router.push(`/conference/${conferenceId}/paper/${paper.id}`)}>
                                                            <ExternalLink className="h-3.5 w-3.5 mr-2" /> View Details
                                                        </DropdownMenuItem>
                                                        {(['AWAITING_REGISTRATION', 'REGISTERED', 'AWAITING_CAMERA_READY', 'CAMERA_READY_REJECTED'].includes(paper.status)) && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => router.push(`/paper/${paper.id}/camera-ready`)}>
                                                                    <Upload className="h-3.5 w-3.5 mr-2" /> Camera-Ready
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                        {isExpanded && (
                                            <TableRow key={`${paper.id}-detail`} className="bg-muted/10">
                                                <TableCell colSpan={8} className="py-5 px-8">
                                                    <div className="space-y-4">
                                                        {paper.abstractField && (
                                                            <div>
                                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Abstract</p>
                                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{paper.abstractField}</p>
                                                            </div>
                                                        )}
                                                        {paper.keywords && paper.keywords.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {paper.keywords.map((kw, i) => (
                                                                    <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">{kw}</Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {agg && agg.questionAggregates && agg.questionAggregates.length > 0 && (
                                                            <div>
                                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Review Score Breakdown</p>
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                                                                    {agg.questionAggregates.map(q => (
                                                                        <div key={q.questionId} className="flex items-center justify-between text-sm bg-background rounded-lg px-4 py-2.5 border">
                                                                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0 pr-4">{q.questionText}</span>
                                                                            <span className="font-bold text-amber-700 text-base shrink-0">{q.averageScore.toFixed(1)}<span className="text-xs font-normal text-muted-foreground"> / {q.maxScore}</span></span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {mr?.reason && (
                                                            <div>
                                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Meta-Review Reason</p>
                                                                <p className="text-sm italic text-gray-600 dark:text-gray-400">"{mr.reason}"</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Page {currentPage + 1} of {totalPages} · {filtered.length} papers</p>
                    <div className="flex gap-1">
                        <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}><ChevronDown className="h-4 w-4 -rotate-90" /></Button>
                        <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}><ChevronDown className="h-4 w-4 rotate-90" /></Button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════════
function MyTicketTab({ tickets, papers, conferenceId }: { tickets: TicketResponse[]; papers: PaperResponse[]; conferenceId: number }) {
    const ticket = tickets.find(t => t.conferenceId === conferenceId)
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
    const [downloading, setDownloading] = useState<string | null>(null)

    useEffect(() => {
        if (ticket?.qrCode && !qrDataUrl) {
            QRCode.toDataURL(ticket.qrCode, { width: 180, margin: 2 })
                .then(url => setQrDataUrl(url))
                .catch(() => { })
        }
    }, [ticket?.qrCode, qrDataUrl])

    const handleDownload = async (type: string, docId: number, ticketId: number) => {
        try {
            setDownloading(type)
            if (type === 'acceptance') await downloadAcceptanceLetter(docId)
            if (type === 'invoice') await downloadInvoice(docId)
            if (type === 'certificate') await downloadCertificate(docId)
            toast.success('Download started')
        } catch { toast.error('Download failed') }
        finally { setDownloading(null) }
    }

    if (!ticket) return (
        <div className="text-center py-20 text-muted-foreground space-y-3">
            <Ticket className="h-12 w-12 mx-auto opacity-30" />
            <h2 className="text-lg font-semibold">Not Registered</h2>
            <p className="text-sm">You have not registered for this conference.</p>
        </div>
    )

    const isPaid = ticket.paymentStatus === 'COMPLETED'
    const acceptedPaper = papers.find(p => ['ACCEPTED', 'PUBLISHED'].includes(p.status))

    const ticketFields = [
        { label: 'Registration Number', value: <span className="font-mono font-semibold">{ticket.registrationNumber}</span> },
        { label: 'Ticket Type', value: ticket.ticketTypeName },
        {
            label: 'Payment Status', value: (
                <Badge className={isPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                    {isPaid ? '✅ Confirmed' : '⏳ Pending'}
                </Badge>
            )
        },
        { label: 'Amount', value: ticket.price === 0 ? 'Free' : `${ticket.price.toLocaleString()} ${ticket.currency || 'VND'}` },
        { label: 'Attendee Name', value: ticket.userName },
        { label: 'Email', value: ticket.userEmail },
        { label: 'Check-in', value: ticket.isCheckedIn ? <Badge className="bg-emerald-100 text-emerald-800">Checked In</Badge> : <span className="text-muted-foreground text-sm">Not checked in</span> },
    ]

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h2 className="text-xl font-bold">Registration Details</h2>
                <p className="text-sm text-muted-foreground mt-1">Your ticket and documents for {ticket.conferenceName}</p>
            </div>

            <div className="flex flex-col xl:flex-row gap-6">
                {/* Ticket Fields Table */}
                <div className="flex-1 rounded-lg border overflow-hidden bg-background max-w-xl shadow-sm">
                    <div className={`h-1.5 ${isPaid ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <Table>
                        <TableBody>
                            {ticketFields.map(f => (
                                <TableRow key={f.label}>
                                    <TableCell className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-40 border-r bg-muted/10">{f.label}</TableCell>
                                    <TableCell className="text-sm font-medium">{f.value}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Documents and QR */}
                {isPaid && (
                    <div className="flex flex-col md:flex-row gap-6 flex-1">
                        {/* Documents table */}
                        <div className="flex-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Documents</p>
                            <div className="rounded-lg border overflow-hidden bg-background shadow-sm">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead>Document</TableHead>
                                            <TableHead className="w-24 text-center">Status</TableHead>
                                            <TableHead className="w-24 text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[
                                            { label: 'Acceptance Letter', type: 'acceptance', docId: acceptedPaper?.id, available: !!acceptedPaper },
                                            { label: 'Invoice', type: 'invoice', docId: ticket.id, available: isPaid },
                                            { label: 'Certificate', type: 'certificate', docId: ticket.id, available: !!ticket.isCheckedIn },
                                        ].map(doc => {
                                            const isDownloading = downloading === doc.type
                                            return (
                                                <TableRow key={doc.type}>
                                                    <TableCell className="text-sm font-medium">{doc.label}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge className={doc.available ? 'bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]' : 'bg-gray-100 text-gray-500 border-gray-200 text-[10px]'}>
                                                            {doc.available ? 'Available' : 'N/A'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 gap-1.5 text-xs"
                                                            disabled={!doc.available || !doc.docId || isDownloading}
                                                            onClick={() => doc.docId && handleDownload(doc.type, doc.docId, ticket.id)}
                                                        >
                                                            {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                                            Download
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="flex flex-col items-center bg-background border rounded-xl p-5 shrink-0 justify-center min-w-[200px] shadow-sm">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Check-in QR Code</p>
                            {qrDataUrl ? (
                                <img src={qrDataUrl} alt="QR Code" className="w-36 h-36 rounded-lg shadow-sm border border-gray-100" />
                            ) : (
                                <div className="w-36 h-36 bg-muted/50 rounded-lg flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-3 font-mono">{ticket.registrationNumber}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB: Profile
// ════════════════════════════════════════════════════════════════════════════════
function ProfileTab({ userInfo }: { userInfo: { id: number; firstName: string; lastName: string; email: string } | null }) {
    if (!userInfo) return <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold">Author Profile</h2>
                <p className="text-sm text-muted-foreground mt-1">Your account information</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden">
                <div className="h-20 bg-primary" />
                <div className="px-6 pb-6 -mt-8">
                    <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center mb-3">
                        <span className="text-xl font-bold text-indigo-600">
                            {userInfo.firstName.charAt(0)}{userInfo.lastName.charAt(0)}
                        </span>
                    </div>
                    <h3 className="text-xl font-bold">{userInfo.firstName} {userInfo.lastName}</h3>
                    <p className="text-sm text-muted-foreground">{userInfo.email}</p>
                </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="w-40">Field</TableHead>
                            <TableHead>Value</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Name</TableCell>
                            <TableCell className="font-medium">{userInfo.firstName}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Name</TableCell>
                            <TableCell className="font-medium">{userInfo.lastName}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</TableCell>
                            <TableCell className="font-medium">{userInfo.email}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">User ID</TableCell>
                            <TableCell className="font-mono text-muted-foreground">{userInfo.id}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
