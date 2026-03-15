'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPapersByAuthor } from '@/app/api/paper.api'
import { getUserByEmail } from '@/app/api/user.api'
import type { PaperResponse, PaperStatus } from '@/types/paper'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Loader2, Edit, FileText, Send, Search, CheckCircle2, XCircle, Ban,
    Camera, Globe, AlertTriangle, Calendar, Tag, Layers
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
        color: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
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
function PaperCard({ paper, onEdit }: { paper: PaperResponse; onEdit: () => void }) {
    const needsAction = ACTION_STATUSES.includes(paper.status)
    const statusConfig = STATUS_CONFIG[paper.status]

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
                        </div>

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

                    {/* Edit button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity"
                        onClick={onEdit}
                    >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ── Main Page ──
export default function UserSubmissionsPage() {
    const router = useRouter()
    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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

    // ── Compute stats ──
    const stats = {
        total: papers.length,
        underReview: papers.filter(p => p.status === 'UNDER_REVIEW').length,
        accepted: papers.filter(p => p.status === 'ACCEPTED' || p.status === 'PUBLISHED').length,
        needsAction: papers.filter(p => ACTION_STATUSES.includes(p.status)).length,
    }

    // ── Group papers by conference ──
    const groupedPapers = papers.reduce<Record<number, {
        conferenceName: string
        conferenceAcronym: string
        submissionDeadline: string
        papers: PaperResponse[]
    }>>((acc, paper) => {
        const conf = paper.track.conference
        if (!acc[conf.id]) {
            acc[conf.id] = {
                conferenceName: conf.name,
                conferenceAcronym: conf.acronym,
                submissionDeadline: conf.endDate,
                papers: [],
            }
        }
        acc[conf.id].papers.push(paper)
        return acc
    }, {})

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
        <div className="container mx-auto py-8 px-4 max-w-5xl space-y-8">
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
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedPapers).map(([confId, group]) => (
                        <div key={confId} className="space-y-4">
                            {/* Conference Group Header */}
                            <div className="flex items-center justify-between gap-4 pb-2 border-b">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="h-8 w-1 bg-primary rounded-full shrink-0" />
                                    <div className="min-w-0">
                                        <h2 className="text-base font-semibold truncate">
                                            {group.conferenceName}
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            {group.conferenceAcronym} · {group.papers.length} paper{group.papers.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>Deadline:</span>
                                    <span className={`font-semibold ${new Date(group.submissionDeadline) < new Date() ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                                        {new Date(group.submissionDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            {/* Paper Cards */}
                            <div className="space-y-3">
                                {group.papers.map((paper) => (
                                    <PaperCard
                                        key={paper.id}
                                        paper={paper}
                                        onEdit={() => router.push(`/paper/${paper.id}`)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
