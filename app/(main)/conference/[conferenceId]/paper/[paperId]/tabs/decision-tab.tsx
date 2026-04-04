'use client'

import { useEffect, useState } from 'react'
import { Loader2, Gavel } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createMetaReview, updateMetaReview } from '@/app/api/meta-review.api'
import type { MetaReviewResponse, Decision } from '@/types/meta-review'
import type { ReviewAggregate } from '@/app/api/review-aggregate.api'
import type { PaperResponse } from '@/types/paper'
import { toast } from 'sonner'

interface DecisionTabProps {
    paperId: number
    conferenceId: number
    userId: number | null
    metaReview: MetaReviewResponse | null
    paper: PaperResponse
    aggregate: ReviewAggregate | null
    isChair: boolean
    onChanged: () => void
}

const DECISIONS: { value: Decision; label: string; color: string; desc: string }[] = [
    { value: 'APPROVE', label: 'Accept', color: 'border-green-400 bg-green-50 text-green-800', desc: 'Paper accepted for publication' },
    { value: 'REJECT', label: 'Reject', color: 'border-red-400 bg-red-50 text-red-800', desc: 'Paper rejected' },
]

export function DecisionTab({ paperId, conferenceId, userId, metaReview, paper, aggregate, isChair, onChanged }: DecisionTabProps) {
    const [decision, setDecision] = useState<Decision | ''>(metaReview?.finalDecision || '')
    const [reason, setReason] = useState(metaReview?.reason || '')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setDecision(metaReview?.finalDecision || '')
        setReason(metaReview?.reason || '')
    }, [metaReview])

    const handleSave = async () => {
        if (!userId) {
            toast.error('User session not found. Please refresh the page.')
            return
        }
        if (!decision) {
            toast.error('Please select a final decision (Accept/Reject).')
            return
        }
        if (!reason.trim()) {
            toast.error('Please provide a reason or comments for this decision.')
            return
        }
        try {
            setSaving(true)
            if (metaReview) {
                await updateMetaReview(metaReview.id, { paperId, userId, finalDecision: decision, reason })
                toast.success('Decision updated!')
            } else {
                await createMetaReview({ paperId, userId, finalDecision: decision, reason })
                toast.success('Decision saved!')
            }
            onChanged()
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save decision')
        } finally {
            setSaving(false)
        }
    }

    // Author view-only mode
    if (!isChair) {
        return (
            <div className="max-w-2xl space-y-6">
                <div className="rounded-lg border bg-card p-6 text-center">
                    {metaReview ? (
                        <div className="space-y-4">
                            <Gavel className="h-10 w-10 mx-auto text-muted-foreground" />
                            <div>
                                <p className="text-lg font-semibold">
                                    Decision: {metaReview.finalDecision === 'APPROVE' ? '✅ Accepted' : '❌ Rejected'}
                                </p>
                                {metaReview.reason && (
                                    <div className="mt-4 text-left rounded-lg bg-muted/30 p-4">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Reason</p>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{metaReview.reason}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Gavel className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
                            <p className="text-sm text-muted-foreground">No decision has been made yet.</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Chair edit mode
    return (
        <div className="max-w-2xl space-y-6">
            {/* Review Summary */}
            {aggregate && (
                <div className="rounded-lg border bg-card p-5">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">Review Summary</h3>
                    <div className="flex items-center gap-6 text-sm">
                        <span>Reviews: <strong>{aggregate.completedReviewCount}/{aggregate.reviewCount}</strong></span>
                        {aggregate.averageTotalScore !== null && (
                            <span>Avg Score: <strong>{aggregate.averageTotalScore?.toFixed(1)}</strong></span>
                        )}
                    </div>
                </div>
            )}

            {/* Decision Selection */}
            <div className="rounded-lg border bg-card p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-4 tracking-wider">Final Decision</h3>
                <div className="grid grid-cols-2 gap-3">
                    {DECISIONS.map(d => (
                        <button
                            key={d.value}
                            onClick={() => setDecision(d.value)}
                            className={`rounded-xl border-2 p-4 text-center transition-all ${
                                decision === d.value
                                    ? `${d.color} ring-2 ring-offset-2`
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <p className="font-semibold text-base">{d.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{d.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Reason */}
            <div className="rounded-lg border bg-card p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">Reason / Comments *</h3>
                <Textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Explain the decision rationale..."
                    className="min-h-[150px]"
                />
            </div>

            {/* Save Button */}
            <Button
                onClick={handleSave}
                disabled={saving || !decision || !reason.trim()}
                className="w-full"
                size="lg"
            >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {metaReview ? 'Update Decision' : 'Save Decision'}
            </Button>

            {/* Existing decision info */}
            {metaReview && (
                <div className="text-xs text-muted-foreground text-center">
                    Last updated by: {metaReview.user.firstName} {metaReview.user.lastName} ({metaReview.user.email})
                </div>
            )}
        </div>
    )
}
