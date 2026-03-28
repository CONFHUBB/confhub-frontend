'use client'

import { useEffect, useState } from 'react'
import { getAggregateByPaper, type ReviewAggregate, type QuestionAggregate } from '@/app/api/review-aggregate.api'
import { getReviewsByReviewerAndConference } from '@/app/api/review.api'
import { getAnswersByReview } from '@/app/api/review.api'
import { getDiscussionByPaper } from '@/app/api/discussion.api'
import { createMetaReview, updateMetaReview } from '@/app/api/meta-review.api'
import type { MetaReviewResponse, Decision } from '@/types/meta-review'
import type { ReviewResponse, ReviewAnswerResponse } from '@/types/review'
import type { DiscussionPost } from '@/types/discussion'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ChevronDown, ChevronUp, MessageSquare, User } from 'lucide-react'
import { V } from '@/lib/validation'

interface Props {
    paperId: number
    conferenceId: number
    userId: number
    existingMetaReview: MetaReviewResponse | null
    onClose: () => void
    onSaved: () => void
}

export default function PaperDecisionDetail({ paperId, conferenceId, userId, existingMetaReview, onClose, onSaved }: Props) {
    const [aggregate, setAggregate] = useState<ReviewAggregate | null>(null)
    const [reviews, setReviews] = useState<{ review: ReviewResponse; answers: ReviewAnswerResponse[] }[]>([])
    const [discussions, setDiscussions] = useState<DiscussionPost[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set())

    const [decision, setDecision] = useState<Decision>(existingMetaReview?.finalDecision || 'APPROVE')
    const [reason, setReason] = useState(existingMetaReview?.reason || '')

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true)
                const [agg, disc] = await Promise.all([
                    getAggregateByPaper(paperId),
                    getDiscussionByPaper(paperId).catch(() => []),
                ])
                setAggregate(agg)
                setDiscussions(disc)

                // Fetch all reviews for this paper via the aggregate info
                // We need to get reviews by conference then filter by paperId
                if (agg && agg.reviewCount > 0) {
                    try {
                        const http = (await import('@/lib/http')).default
                        const reviewsRes = await http.get<ReviewResponse[]>(`/review/paper/${paperId}`)
                        const reviewsList = Array.isArray(reviewsRes.data) ? reviewsRes.data : []
                        
                        // Fetch answers for each review
                        const reviewsWithAnswers = await Promise.all(
                            reviewsList.map(async (r) => {
                                const answers = await getAnswersByReview(r.id).catch(() => [])
                                return { review: r, answers }
                            })
                        )
                        setReviews(reviewsWithAnswers)
                    } catch {
                        setReviews([])
                    }
                }
            } catch (err) {
                console.error('Failed to load paper details:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [paperId])

    const toggleReview = (reviewId: number) => {
        setExpandedReviews(prev => {
            const next = new Set(prev)
            next.has(reviewId) ? next.delete(reviewId) : next.add(reviewId)
            return next
        })
    }

    const handleSave = async () => {
        const reasonErr = V.minLen(reason.trim(), 10)
        if (reasonErr) {
            alert(`Decision Reason: ${reasonErr}`)
            return
        }
        if (!reason.trim()) return
        try {
            setSaving(true)
            const dto = { paperId, userId, finalDecision: decision, reason }
            if (existingMetaReview) {
                await updateMetaReview(existingMetaReview.id, dto)
            } else {
                await createMetaReview(dto)
            }
            onSaved()
        } catch (err: any) {
            console.error('Failed to save meta-review:', err)
            alert(err?.response?.data?.message || 'Failed to save decision. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg">
                        Paper #{paperId}: {aggregate?.paperTitle || 'Loading...'}
                    </DialogTitle>
                    {aggregate && (
                        <div className="flex gap-2 mt-1">
                            <Badge className="bg-gray-100 text-gray-700">
                                {aggregate.paperStatus.replace('_', ' ')}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                Avg Score: <strong>{aggregate.completedReviewCount > 0 ? Number(aggregate.averageTotalScore).toFixed(1) : '—'}</strong>
                                {' '} · Reviews: <strong>{aggregate.completedReviewCount}/{aggregate.reviewCount}</strong>
                            </span>
                        </div>
                    )}
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6 mt-4">
                        {/* Reviews Section */}
                        <div>
                            <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Reviews ({reviews.length})
                            </h3>
                            <div className="space-y-2">
                                {reviews.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4 text-center">No reviews submitted yet.</p>
                                ) : (
                                    reviews.map(({ review, answers }) => (
                                        <Card key={review.id} className="border-gray-200">
                                            <CardContent className="p-3">
                                                <div
                                                    className="flex items-center justify-between cursor-pointer"
                                                    onClick={() => toggleReview(review.id)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-sm">
                                                            <span className="font-medium">
                                                                {review.reviewer?.firstName} {review.reviewer?.lastName}
                                                            </span>
                                                            <span className="text-muted-foreground"> · </span>
                                                            <Badge className={
                                                                review.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                                review.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            } variant="secondary">
                                                                {review.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono text-sm font-semibold">
                                                            {review.totalScore != null ? Number(review.totalScore).toFixed(1) : '—'}
                                                        </span>
                                                        {expandedReviews.has(review.id) ? (
                                                            <ChevronUp className="h-4 w-4 text-gray-400" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                                        )}
                                                    </div>
                                                </div>

                                                {expandedReviews.has(review.id) && answers.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t space-y-2">
                                                        {answers.map(a => (
                                                            <div key={a.id} className="text-sm">
                                                                <p className="font-medium text-gray-600">{a.questionText}</p>
                                                                <p className="text-gray-800 mt-0.5">
                                                                    {a.selectedChoiceText || a.answerValue || '—'}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Score Breakdown */}
                        {aggregate && aggregate.questionAggregates.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-sm text-gray-700 mb-3">Score Breakdown</h3>
                                <div className="overflow-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-gray-50">
                                                <th className="px-3 py-2 text-left font-medium text-gray-600">Question</th>
                                                <th className="px-3 py-2 text-center font-medium text-gray-600 w-16">Avg</th>
                                                <th className="px-3 py-2 text-center font-medium text-gray-600 w-16">Min</th>
                                                <th className="px-3 py-2 text-center font-medium text-gray-600 w-16">Max</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {aggregate.questionAggregates.map(q => (
                                                <tr key={q.questionId} className="border-b last:border-0">
                                                    <td className="px-3 py-2">{q.questionText}</td>
                                                    <td className="px-3 py-2 text-center font-mono font-semibold">{Number(q.averageScore).toFixed(1)}</td>
                                                    <td className="px-3 py-2 text-center font-mono text-gray-500">{Number(q.minScore).toFixed(1)}</td>
                                                    <td className="px-3 py-2 text-center font-mono text-gray-500">{Number(q.maxScore).toFixed(1)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Discussion Section */}
                        {discussions.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Discussion ({discussions.length} posts)
                                </h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {discussions.map(d => (
                                        <div key={d.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium">{d.userFirstName} {d.userLastName}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(d.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {d.title && <p className="font-semibold text-gray-800">{d.title}</p>}
                                            <p className="text-gray-700">{d.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Meta-Review Decision Form */}
                        <div className="border-t pt-4">
                            <h3 className="font-semibold text-sm text-gray-700 mb-3">
                                {existingMetaReview ? '✏️ Update Your Decision' : '📝 Your Decision (Meta-Review)'}
                            </h3>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    {(['APPROVE', 'REJECT'] as Decision[]).map(d => (
                                        <label
                                            key={d}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                                                decision === d
                                                    ? d === 'APPROVE' ? 'border-green-500 bg-green-50 text-green-800'
                                                    : 'border-red-500 bg-red-50 text-red-800'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="decision"
                                                value={d}
                                                checked={decision === d}
                                                onChange={() => setDecision(d)}
                                                className="sr-only"
                                            />
                                            <span className="font-medium text-sm">{d === 'APPROVE' ? 'Accept' : 'Reject'}</span>
                                        </label>
                                    ))}
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                        Reason / Summary <span className="text-red-500">*</span>
                                    </label>
                                    <Textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Provide a summary of why this paper should be accepted/rejected..."
                                        rows={4}
                                        className="resize-y"
                                    />
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || !reason.trim()}
                                        className={
                                            decision === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' :
                                            'bg-red-600 hover:bg-red-700'
                                        }
                                    >
                                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                        {existingMetaReview ? 'Update Decision' : 'Save Decision'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
