'use client'

import { useEffect, useState } from 'react'
import { Loader2, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAggregateByPaper, type ReviewAggregate } from '@/app/api/review-aggregate.api'
import { getReviewsByPaper, getReviewVersions } from '@/app/api/review.api'
import type { ReviewResponse } from '@/types/review'
import type { PaperResponse } from '@/types/paper'
import Link from 'next/link'
import { toast } from 'sonner'

interface ReviewsTabProps {
    paperId: number
    paper: PaperResponse
    conferenceId: number
    isChair: boolean
    isAuthor: boolean
    isDoubleBlind: boolean
}

export function ReviewsTab({ paperId, paper, conferenceId, isChair, isAuthor, isDoubleBlind }: ReviewsTabProps) {
    const [aggregate, setAggregate] = useState<ReviewAggregate | null>(null)
    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set())
    const [reviewVersions, setReviewVersions] = useState<Record<number, any[]>>({})
    const [selectedVersionIdx, setSelectedVersionIdx] = useState<Record<number, number>>({})

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            const [agg, revs] = await Promise.all([
                getAggregateByPaper(paperId).catch(() => null),
                getReviewsByPaper(paperId).catch(() => [])
            ])
            setAggregate(agg)
            setReviews(revs)
            setLoading(false)
        }
        fetch()
    }, [paperId])

    const toggleReview = async (reviewId: number) => {
        if (expandedReviews.has(reviewId)) {
            setExpandedReviews(prev => { const n = new Set(prev); n.delete(reviewId); return n })
            return
        }
        if (!reviewVersions[reviewId]) {
            try {
                const versions = await getReviewVersions(reviewId)
                setReviewVersions(prev => ({ ...prev, [reviewId]: versions }))
                setSelectedVersionIdx(prev => ({ ...prev, [reviewId]: versions.length > 0 ? versions.length - 1 : 0 }))
            } catch {
                toast.error('Failed to load review versions')
                return
            }
        }
        setExpandedReviews(prev => new Set(prev).add(reviewId))
    }

    // ── Anonymization logic ──
    const getReviewerDisplayName = (rev: ReviewResponse, index: number): string => {
        // Chair always sees real names
        if (isChair) return `${rev.reviewer.firstName} ${rev.reviewer.lastName}`
        // Author in double-blind → anonymize
        if (isAuthor && isDoubleBlind) return `Anonymous Reviewer ${index + 1}`
        // Reviewer or non-double-blind → show real name
        return `${rev.reviewer.firstName} ${rev.reviewer.lastName}`
    }

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

    if (!aggregate || aggregate.reviewCount === 0) {
        return (
            <div className="space-y-4">
                <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">No reviews yet for this paper.</p>
                </div>
                {isChair && (
                    <div className="flex justify-center">
                        <Link href={`/conference/${conferenceId}/update?tab=reviewer-assignment`}>
                            <Button variant="outline" className="gap-2 text-sm">
                                <ExternalLink className="h-3.5 w-3.5" /> Go to Reviewer Assignment
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Score Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border bg-card p-5 text-center">
                    <p className="text-3xl font-bold">{aggregate.completedReviewCount}/{aggregate.reviewCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Reviews Completed</p>
                </div>
                <div className="rounded-lg border bg-card p-5 text-center">
                    <p className="text-3xl font-bold">{aggregate.averageTotalScore?.toFixed(1) || '—'}</p>
                    <p className="text-xs text-muted-foreground mt-1">Average Score</p>
                </div>
                <div className="rounded-lg border bg-card p-5 text-center">
                    <p className="text-3xl font-bold">{aggregate.questionAggregates?.length || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Questions</p>
                </div>
            </div>

            {/* Per-Question Breakdown */}
            {aggregate.questionAggregates && aggregate.questionAggregates.length > 0 && (
                <div className="rounded-lg border bg-card p-5">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-4 tracking-wider">Score Breakdown</h3>
                    <div className="space-y-2">
                        {aggregate.questionAggregates.map((qa, i) => (
                            <div key={qa.questionId} className="flex items-center justify-between text-sm border rounded-lg px-4 py-3 hover:bg-muted/30 transition-colors">
                                <span className="text-muted-foreground line-clamp-1 flex-1 mr-4">
                                    <span className="font-mono text-xs text-slate-400 mr-2">Q{i + 1}.</span>
                                    {qa.questionText}
                                </span>
                                <div className="flex items-center gap-4 shrink-0">
                                    <span className="text-xs text-muted-foreground">
                                        {qa.minScore?.toFixed(1)} – {qa.maxScore?.toFixed(1)}
                                    </span>
                                    <span className="font-mono font-semibold text-sm text-primary">
                                        avg {qa.averageScore?.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Individual Reviews */}
            <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Individual Reviews ({reviews.length})
                </h3>
                {reviews.length === 0 && (
                    <p className="text-sm text-muted-foreground">No review assignments yet.</p>
                )}
                {reviews.map((rev, idx) => {
                    const isExpanded = expandedReviews.has(rev.id)
                    const versions = reviewVersions[rev.id] || []
                    const activeIdx = selectedVersionIdx[rev.id] !== undefined ? selectedVersionIdx[rev.id] : versions.length - 1
                    const activeVersion = versions[activeIdx]
                    const displayName = getReviewerDisplayName(rev, idx)

                    return (
                        <div key={rev.id} className="border rounded-lg overflow-hidden bg-card">
                            <button
                                onClick={() => toggleReview(rev.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                            >
                                <div className="text-left">
                                    <p className="text-sm font-semibold">{displayName}</p>
                                    <p className="text-xs text-muted-foreground">{rev.status}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {rev.totalScore !== null && (
                                        <Badge variant="secondary" className="font-mono">{rev.totalScore}</Badge>
                                    )}
                                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="p-5 border-t bg-muted/10">
                                    {versions.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic">No review versions submitted yet.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Version Selector */}
                                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border">
                                                <span className="text-xs font-medium text-muted-foreground uppercase">Version:</span>
                                                <select
                                                    value={activeIdx}
                                                    onChange={e => setSelectedVersionIdx(prev => ({ ...prev, [rev.id]: Number(e.target.value) }))}
                                                    className="text-sm border rounded-md p-1.5 flex-1 bg-background"
                                                >
                                                    {versions.map((v, i) => (
                                                        <option key={v.id} value={i}>
                                                            Version {v.versionNumber} ({new Date(v.submittedAt).toLocaleString()}) - Score: {v.totalScore}
                                                            {i === versions.length - 1 ? ' (Latest)' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Answers */}
                                            {activeVersion && (
                                                <div className="space-y-3">
                                                    {activeVersion.answers.map((ans: any, qIdx: number) => (
                                                        <div key={ans.id} className="text-sm space-y-1.5 bg-background border rounded-lg p-4">
                                                            <p className="font-medium text-foreground">
                                                                <span className="text-muted-foreground mr-2 font-mono text-xs">Q{qIdx + 1}.</span>
                                                                {ans.questionText}
                                                            </p>
                                                            <div className="pl-6 text-muted-foreground">
                                                                {ans.questionType === 'COMMENT' && <p className="whitespace-pre-wrap">{ans.answerValue || '—'}</p>}
                                                                {ans.questionType === 'AGREEMENT' && <p className="font-semibold text-foreground">{ans.answerValue || '—'}</p>}
                                                                {(ans.questionType === 'OPTIONS' || ans.questionType === 'OPTIONS_WITH_VALUE') && (
                                                                    <p className="font-semibold text-primary">{ans.selectedChoiceText || '—'}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Link to Reviewer Management */}
            {isChair && (
                <div className="flex justify-center pt-4 border-t">
                    <Link href={`/conference/${conferenceId}/update?tab=reviewer-assignment`}>
                        <Button variant="outline" className="gap-2 text-sm">
                            <ExternalLink className="h-3.5 w-3.5" /> Manage in Reviewer Assignment
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    )
}
