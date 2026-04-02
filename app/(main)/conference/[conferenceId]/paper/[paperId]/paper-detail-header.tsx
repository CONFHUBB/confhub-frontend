'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    ArrowLeft, Edit, UserPlus, Gavel, Shield, Upload, FileEdit
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { PaperResponse } from '@/types/paper'
import type { PaperAuthorItem } from '@/app/api/paper.api'
import type { PaperPermissions } from '@/hooks/usePaperRole'
import type { MetaReviewResponse } from '@/types/meta-review'

// ── Status Color Map ──
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
    SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
    UNDER_REVIEW: { label: 'Under Review', color: 'bg-purple-100 text-purple-700' },
    AWAITING_DECISION: { label: 'Awaiting Decision', color: 'bg-amber-100 text-amber-700' },
    ACCEPTED: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700' },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
    WITHDRAWN: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-500' },
    CAMERA_READY: { label: 'Camera Ready', color: 'bg-teal-100 text-teal-700' },
    PUBLISHED: { label: 'Published', color: 'bg-cyan-100 text-cyan-700' },
}

const DECISION_CONFIG: Record<string, { label: string; color: string }> = {
    APPROVE: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    REJECT: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-300' },
}

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
    chair: { label: 'Chair', cls: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
    reviewer: { label: 'Reviewer', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
    author: { label: 'Author', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
}

interface PaperDetailHeaderProps {
    paper: PaperResponse
    authors: PaperAuthorItem[]
    metaReview: MetaReviewResponse | null
    reviewCount: number
    completedReviewCount: number
    averageTotalScore: number | null
    isChair: boolean
    isReviewer: boolean
    isAuthor: boolean
    permissions: PaperPermissions
    conferenceId: number
    conferenceName?: string
    onTabChange: (tab: string) => void
}

export function PaperDetailHeader({
    paper, authors, metaReview,
    reviewCount, completedReviewCount, averageTotalScore,
    isChair, isReviewer, isAuthor, permissions,
    conferenceId, conferenceName,
    onTabChange,
}: PaperDetailHeaderProps) {
    const router = useRouter()

    const reviewPct = reviewCount > 0 ? Math.round((completedReviewCount / reviewCount) * 100) : 0
    const allComplete = completedReviewCount === reviewCount && reviewCount > 0

    // Determine primary role badge
    const roleBadge = isChair ? ROLE_BADGE.chair : isReviewer ? ROLE_BADGE.reviewer : isAuthor ? ROLE_BADGE.author : null

    const authorNames = authors.map(a =>
        a.user?.fullName || `${a.user?.firstName || ''} ${a.user?.lastName || ''}`.trim()
    ).filter(Boolean).join(', ')

    return (
        <div className="space-y-4">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
                <button
                    onClick={() => router.back()}
                    className="hover:text-foreground transition-colors flex items-center font-medium"
                    title="Go back"
                >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Back
                </button>
                <span className="text-muted-foreground/30 mx-1">|</span>
                <span className="truncate max-w-[200px] sm:max-w-xs">{conferenceName || 'Conference Workspace'}</span>
                <span className="text-muted-foreground/50">/</span>
                <span className="font-medium text-foreground">Paper #{paper.id}</span>
            </nav>

            {/* Metadata Card */}
            <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
                {/* Row 1: Paper ID + Track */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono font-medium">#{paper.id}</span>
                    <span>·</span>
                    <span>Track: {paper.trackName || paper.track?.name || '—'}</span>
                </div>

                {/* Row 2: Title */}
                <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
                    {paper.title}
                </h1>

                {/* Row 3: Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Status */}
                    <Badge className={`text-xs shadow-none ${STATUS_CONFIG[paper.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_CONFIG[paper.status]?.label || paper.status?.replace(/_/g, ' ')}
                    </Badge>

                    {/* Decision */}
                    {metaReview?.finalDecision && (
                        <Badge variant="outline" className={`text-xs ${DECISION_CONFIG[metaReview.finalDecision]?.color || ''}`}>
                            Decision: {DECISION_CONFIG[metaReview.finalDecision]?.label || metaReview.finalDecision}
                        </Badge>
                    )}

                    {/* Role */}
                    {roleBadge && (
                        <Badge variant="outline" className={`text-xs ${roleBadge.cls}`}>
                            {roleBadge.label}
                        </Badge>
                    )}
                </div>

                {/* Row 4: Authors + Submitted + Keywords */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                    {authorNames && (
                        <span className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">Authors:</span> {authorNames}
                        </span>
                    )}
                    {paper.submissionTime && (
                        <span className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">Submitted:</span>
                            {new Date(paper.submissionTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    )}
                </div>

                {/* Keywords */}
                {paper.keywords && paper.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {paper.keywords.map((kw, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {kw}
                            </span>
                        ))}
                    </div>
                )}

                {/* Row 5: Review Progress */}
                {reviewCount > 0 && (
                    <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-xs">
                            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${allComplete ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                                    style={{ width: `${reviewPct}%` }}
                                />
                            </div>
                        </div>
                        <span className={`text-sm font-mono font-semibold ${allComplete ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {completedReviewCount}/{reviewCount} reviews
                        </span>
                        {averageTotalScore !== null && (
                            <span className="text-sm text-muted-foreground">
                                · Avg: <span className="font-semibold font-mono text-foreground">{averageTotalScore.toFixed(1)}</span>
                            </span>
                        )}
                    </div>
                )}

                {/* Row 6: Action Buttons (role-filtered) */}
                <div className="flex gap-2 flex-wrap pt-1">
                    {permissions.canViewAssignments && (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => onTabChange('assignments')}>
                            <UserPlus className="h-3.5 w-3.5" /> Assignments
                        </Button>
                    )}
                    {permissions.canMakeDecision && (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => onTabChange('decision')}>
                            <Gavel className="h-3.5 w-3.5" /> Make Decision
                        </Button>
                    )}
                    {permissions.canViewConflicts && (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => onTabChange('conflicts')}>
                            <Shield className="h-3.5 w-3.5" /> Conflicts
                        </Button>
                    )}
                    {permissions.canSubmitCameraReady && (
                        <Button 
                            variant="outline" size="sm" className="gap-1.5 text-xs"
                            onClick={() => router.push(`/conference/${conferenceId}/paper/${paper.id}/camera-ready`)}
                        >
                            <Upload className="h-3.5 w-3.5" /> Submit Camera-Ready
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
