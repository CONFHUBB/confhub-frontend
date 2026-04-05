'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    ArrowLeft, Upload, Lock
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { PaperResponse } from '@/types/paper'
import type { PaperAuthorItem } from '@/app/api/paper.api'
import type { PaperPermissions } from '@/hooks/usePaperRole'
import type { MetaReviewResponse } from '@/types/meta-review'
import { getPaperStatus, paperStatusClass, DECISION_CONFIG } from '@/lib/constants/status'

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
    isDoubleBlind: boolean
    permissions: PaperPermissions
    conferenceId: number
    conferenceName?: string
    onTabChange: (tab: string) => void
}

export function PaperDetailHeader({
    paper, authors, metaReview,
    reviewCount, completedReviewCount, averageTotalScore,
    isChair, isReviewer, isAuthor, isDoubleBlind, permissions,
    conferenceId, conferenceName,
    onTabChange,
}: PaperDetailHeaderProps) {
    const router = useRouter()

    const reviewPct = reviewCount > 0 ? Math.round((completedReviewCount / reviewCount) * 100) : 0
    const allComplete = completedReviewCount === reviewCount && reviewCount > 0

    // Determine primary role badge
    const roleBadge = isChair ? ROLE_BADGE.chair : isReviewer ? ROLE_BADGE.reviewer : isAuthor ? ROLE_BADGE.author : null

    // Double-blind: hide author names for reviewers (chairs always see)
    const shouldMaskAuthors = isDoubleBlind && isReviewer && !isChair

    const authorNames = shouldMaskAuthors
        ? ''
        : authors.map(a =>
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
                    <Badge className={`text-xs shadow-none ${paperStatusClass(paper.status)}`}>
                        {getPaperStatus(paper.status).label}
                    </Badge>

                    {/* Decision */}
                    {metaReview?.finalDecision && (
                        <Badge variant="outline" className={`text-xs ${DECISION_CONFIG[metaReview.finalDecision as keyof typeof DECISION_CONFIG]?.bg || ''} ${DECISION_CONFIG[metaReview.finalDecision as keyof typeof DECISION_CONFIG]?.text || ''} ${DECISION_CONFIG[metaReview.finalDecision as keyof typeof DECISION_CONFIG]?.border || ''}`}>
                            Decision: {DECISION_CONFIG[metaReview.finalDecision as keyof typeof DECISION_CONFIG]?.label || metaReview.finalDecision}
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
                    {shouldMaskAuthors ? (
                        <span className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-slate-200">
                                <Lock className="h-3 w-3 mr-1" />
                                Double-Blind Active — Author identities are hidden
                            </Badge>
                        </span>
                    ) : authorNames ? (
                        <span className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">Authors:</span> {authorNames}
                        </span>
                    ) : null}
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

                {/* Row 6: Quick Actions — only unique actions not in tab bar */}
                <div className="flex gap-3 flex-wrap pt-1">
                    {permissions.canSubmitCameraReady && (
                        <Button 
                            variant="default" size="default" className="gap-2"
                            onClick={() => router.push(`/conference/${conferenceId}/paper/${paper.id}/camera-ready`)}
                        >
                            <Upload className="h-4 w-4" /> Submit Camera-Ready
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

