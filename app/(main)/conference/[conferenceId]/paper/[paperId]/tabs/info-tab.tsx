'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, CheckCircle2, Circle, Send, Search, Users, MessageSquare, Bell, Camera, Ticket, Globe, FileCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getAuthorsByPaper, type PaperAuthorItem } from '@/app/api/paper.api'
import { getBidsByPaper } from '@/app/api/bidding.api'
import { getConferenceActivities } from '@/app/api/conference.api'
import type { ConferenceActivityDTO } from '@/types/conference'
import type { BiddingResponse } from '@/types/bidding'
import type { PaperResponse } from '@/types/paper'
import { getPaperStatus } from '@/lib/constants/status'
import { fmtDate } from '@/lib/utils'

const BID_LABELS: Record<string, string> = { EAGER: 'Eager', WILLING: 'Willing', IN_A_PINCH: 'In a pinch', NOT_WILLING: 'Not willing' }
const BID_COLORS: Record<string, string> = {
    EAGER: 'bg-emerald-100 text-emerald-700',
    WILLING: 'bg-indigo-100 text-indigo-700',
    IN_A_PINCH: 'bg-amber-100 text-amber-700',
    NOT_WILLING: 'bg-red-100 text-red-700',
}

// ── Paper Lifecycle Steps (maps paper status → conference activity for deadlines) ──
const LIFECYCLE_STEPS = [
    { key: 'SUBMITTED',              label: 'Submitted',         activityType: 'PAPER_SUBMISSION',        icon: Send,           color: 'bg-blue-500',    textColor: 'text-blue-700' },
    { key: 'UNDER_REVIEW',           label: 'Under Review',      activityType: 'REVIEW_SUBMISSION',       icon: Search,         color: 'bg-indigo-500',  textColor: 'text-indigo-700' },
    { key: 'AWAITING_DECISION',      label: 'Awaiting Decision', activityType: 'REVIEW_DISCUSSION',       icon: MessageSquare,  color: 'bg-amber-500',   textColor: 'text-amber-700' },
    { key: 'ACCEPTED',               label: 'Decision',          activityType: 'AUTHOR_NOTIFICATION',     icon: Bell,           color: 'bg-emerald-500', textColor: 'text-emerald-700' },
    { key: 'AWAITING_REGISTRATION',  label: 'Registration',      activityType: 'REGISTRATION',            icon: Ticket,         color: 'bg-orange-500',  textColor: 'text-orange-700' },
    { key: 'AWAITING_CAMERA_READY',  label: 'Camera-Ready',      activityType: 'CAMERA_READY_SUBMISSION', icon: Camera,         color: 'bg-violet-500',  textColor: 'text-violet-700' },
    { key: 'CAMERA_READY_SUBMITTED', label: 'CR Submitted',      activityType: null,                      icon: FileCheck,      color: 'bg-teal-500',    textColor: 'text-teal-700' },
    { key: 'PUBLISHED',              label: 'Published',         activityType: null,                      icon: Globe,          color: 'bg-cyan-500',    textColor: 'text-cyan-700' },
]

const TERMINAL_STATUSES = ['REJECTED', 'WITHDRAWN', 'CAMERA_READY_REJECTED']

function PaperTimeline({ status, conferenceId, submissionTime }: { status: string; conferenceId: number; submissionTime?: string }) {
    const [activities, setActivities] = useState<ConferenceActivityDTO[]>([])
    const [loadingAct, setLoadingAct] = useState(true)

    useEffect(() => {
        if (!conferenceId) return
        getConferenceActivities(conferenceId)
            .then(acts => setActivities(acts || []))
            .catch(() => setActivities([]))
            .finally(() => setLoadingAct(false))
    }, [conferenceId])

    const getDeadline = (actType: string | null) => {
        if (!actType) return null
        return activities.find(a => a.activityType === actType)?.deadline || null
    }

    // Terminal state (Rejected, Withdrawn, etc.)
    if (TERMINAL_STATUSES.includes(status)) {
        const sc = getPaperStatus(status)
        return (
            <div className="rounded-xl border bg-card p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-4 tracking-wider">Paper Lifecycle</h3>
                <div className="flex items-center gap-3 p-4 rounded-lg border bg-red-50 border-red-200">
                    <div className={`w-3 h-3 rounded-full ${sc.dot}`} />
                    <span className={`text-sm font-semibold ${sc.text}`}>{sc.label}</span>
                </div>
            </div>
        )
    }

    // Compute current index
    const currentIndex = LIFECYCLE_STEPS.findIndex(s => s.key === status)
    const effectiveIndex = status === 'REGISTERED'
        ? LIFECYCLE_STEPS.findIndex(s => s.key === 'AWAITING_CAMERA_READY') - 1
        : currentIndex

    // Progress
    const doneCount = effectiveIndex >= 0 ? effectiveIndex : 0
    const totalSteps = LIFECYCLE_STEPS.length
    const progressPercent = totalSteps > 0 ? Math.round(((doneCount + (effectiveIndex >= 0 ? 0.5 : 0)) / totalSteps) * 100) : 0

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
                        <FileCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold tracking-tight">Paper Lifecycle</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Currently: {getPaperStatus(status).label}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <span className={`text-xs font-bold ${progressPercent === 100 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {progressPercent}%
                    </span>
                </div>
            </div>

            {/* Horizontal stepper (desktop) */}
            <div className="hidden sm:block px-4 pb-5 pt-4">
                <div className="flex items-start justify-between">
                    {LIFECYCLE_STEPS.map((step, idx) => {
                        const isCompleted = effectiveIndex >= 0 && idx < effectiveIndex
                        const isCurrent = effectiveIndex >= 0 && idx === effectiveIndex
                        const Icon = step.icon
                        const deadline = getDeadline(step.activityType)

                        return (
                            <div key={step.key} className="flex items-center flex-1 last:flex-initial">
                                <div className="flex flex-col items-center gap-1.5">
                                    {/* Circle icon */}
                                    <div className={`
                                        flex items-center justify-center h-10 w-10 rounded-full border-2 transition-all duration-300
                                        ${isCompleted
                                            ? `${step.color} border-transparent text-white`
                                            : isCurrent
                                                ? `${step.color} border-transparent text-white shadow-lg shadow-primary/20`
                                                : 'bg-white border-muted-foreground/25 text-muted-foreground/40'
                                        }`}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle2 className="h-5 w-5" />
                                        ) : isCurrent ? (
                                            <div className="relative"><Icon className="h-4 w-4" /><span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-white animate-pulse" /></div>
                                        ) : (
                                            <Circle className="h-5 w-5" />
                                        )}
                                    </div>
                                    {/* Label */}
                                    <div className="flex flex-col items-center">
                                        <p className={`text-xs font-semibold leading-tight text-center ${isCompleted ? 'text-emerald-700' : isCurrent ? 'text-primary' : 'text-muted-foreground/50'}`}>
                                            {step.label}
                                        </p>
                                        {isCurrent && (
                                            <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary animate-pulse">
                                                In Progress
                                            </span>
                                        )}
                                        {isCompleted && (
                                            <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                Completed
                                            </span>
                                        )}
                                        {/* Timestamp: submission time for first step, deadline for others */}
                                        {idx === 0 && submissionTime && (
                                            <p className={`text-[10px] mt-1 ${isCompleted ? 'text-emerald-600/60' : isCurrent ? 'text-primary' : 'text-muted-foreground/40'}`}>
                                                {fmtDate(submissionTime)}
                                            </p>
                                        )}
                                        {idx > 0 && deadline && (
                                            <p className={`text-[10px] mt-1 ${isCompleted ? 'text-emerald-600/60' : isCurrent ? 'text-primary' : 'text-muted-foreground/40'}`}>
                                                {fmtDate(deadline)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {idx < LIFECYCLE_STEPS.length - 1 && (
                                    <div className="flex-1 mx-2 mt-[-40px]">
                                        <div className={`h-0.5 w-full rounded-full transition-colors ${isCompleted ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Vertical layout (mobile) */}
            <div className="sm:hidden px-4 pb-4 pt-3">
                <div className="relative ml-2">
                    <div className="absolute left-[9px] top-3 bottom-3 w-px bg-border" />
                    {LIFECYCLE_STEPS.map((step, idx) => {
                        const isCompleted = effectiveIndex >= 0 && idx < effectiveIndex
                        const isCurrent = effectiveIndex >= 0 && idx === effectiveIndex
                        const deadline = getDeadline(step.activityType)

                        return (
                            <div key={step.key} className="flex items-start gap-3 py-2 relative">
                                <div className="relative z-10 mt-0.5 shrink-0">
                                    {isCompleted ? (
                                        <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" />
                                    ) : isCurrent ? (
                                        <div className="h-[18px] w-[18px] rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                        </div>
                                    ) : (
                                        <Circle className="h-[18px] w-[18px] text-muted-foreground/40" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-sm leading-tight ${isCompleted ? 'font-semibold text-emerald-700' : isCurrent ? 'font-semibold text-primary' : 'text-muted-foreground/50'}`}>
                                        {step.label}
                                    </p>
                                    {idx === 0 && submissionTime && (
                                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                            {fmtDate(submissionTime)}
                                        </p>
                                    )}
                                    {idx > 0 && deadline && (
                                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                            Deadline: {fmtDate(deadline)}
                                        </p>
                                    )}
                                </div>
                                {isCurrent && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">Active</span>}
                                {isCompleted && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">Done</span>}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

interface InfoTabProps {
    paper: PaperResponse
    paperId: number
    conferenceId: number
    authors: PaperAuthorItem[]
    isChair: boolean
    isAuthor?: boolean
}

export function InfoTab({ paper, paperId, conferenceId, authors, isChair, isAuthor }: InfoTabProps) {
    const [bids, setBids] = useState<BiddingResponse[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            const b = await getBidsByPaper(paperId).catch(() => [])
            setBids(b || [])
            setLoading(false)
        }
        fetch()
    }, [paperId])

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

    const showTimeline = isChair || isAuthor

    return (
        <div className="space-y-6">
            {/* Paper Lifecycle Timeline */}
            {showTimeline && (
                <PaperTimeline status={paper.status} conferenceId={conferenceId} submissionTime={paper.submissionTime} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Paper Info */}
                <div className="space-y-6">
                    {/* Abstract */}
                    {paper.abstractField && (
                        <div className="rounded-lg border bg-card p-5">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">Abstract</h3>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{paper.abstractField}</p>
                        </div>
                    )}

                    {/* Keywords */}
                    {paper.keywords && paper.keywords.length > 0 && (
                        <div className="rounded-lg border bg-card p-5">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">Keywords</h3>
                            <div className="flex flex-wrap gap-2">
                                {paper.keywords.map((kw, i) => (
                                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Submission Details */}
                    <div className="rounded-lg border bg-card p-5">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">Submission Details</h3>
                        <div className="space-y-2.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Track</span>
                                <span className="font-medium">{paper.trackName || paper.track?.name || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Submitted</span>
                                <span className="font-medium">{paper.submissionTime ? new Date(paper.submissionTime).toLocaleString('en-US') : '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <span className="font-medium">{paper.status?.replace(/_/g, ' ')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Authors & Bids */}
                <div className="space-y-6">
                    {/* Authors */}
                    <div className="rounded-lg border bg-card p-5">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">
                            Authors ({authors.length})
                        </h3>
                        {authors.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No authors found</p>
                        ) : (
                            <div className="space-y-2.5">
                                {authors.map(a => (
                                    <div key={a.paperAuthorId} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                            {(a.user.firstName?.[0] || '').toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {a.user.fullName || `${a.user.firstName} ${a.user.lastName}`}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">{a.user.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bids (Chair only) */}
                    {isChair && (
                        <div className="rounded-lg border bg-card p-5">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">
                                Bids ({bids.length})
                            </h3>
                            {bids.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No bids received</p>
                            ) : (
                                <div className="space-y-2">
                                    {bids.map(b => (
                                        <div key={b.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/30 transition-colors">
                                            <span className="font-medium">{b.reviewerName}</span>
                                            <Badge className={`text-[10px] shadow-none ${BID_COLORS[b.bidValue] || ''}`}>
                                                {BID_LABELS[b.bidValue] || b.bidValue}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

