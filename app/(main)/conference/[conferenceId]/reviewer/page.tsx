'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getConference, getConferenceActivities } from '@/app/api/conference.api'
import { getBidsSummary } from '@/app/api/bidding.api'
import { getReviewsByReviewerAndConference } from '@/app/api/review.api'
import type { ConferenceResponse, ConferenceActivityDTO } from '@/types/conference'
import type { BidsSummary } from '@/types/bidding'
import type { ReviewResponse } from '@/types/review'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, ClipboardList, Target, FileSearch, ThumbsUp, ThumbsDown, Minus, Zap, Clock, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
    ASSIGNED: 'bg-indigo-100 text-indigo-800',
    IN_PROGRESS: 'bg-amber-100 text-amber-800',
    COMPLETED: 'bg-green-100 text-green-800',
    DECLINED: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<string, string> = {
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    DECLINED: 'Declined',
}

const BID_ICONS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    EAGER: { icon: <Zap className="h-4 w-4" />, color: 'text-emerald-600', label: 'Eager' },
    WILLING: { icon: <ThumbsUp className="h-4 w-4" />, color: 'text-indigo-600', label: 'Willing' },
    IN_A_PINCH: { icon: <Minus className="h-4 w-4" />, color: 'text-amber-600', label: 'In a Pinch' },
    NOT_WILLING: { icon: <ThumbsDown className="h-4 w-4" />, color: 'text-red-600', label: 'Not Willing' },
}

export default function ReviewerConsolePage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [bidsSummary, setBidsSummary] = useState<BidsSummary | null>(null)
    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [activities, setActivities] = useState<ConferenceActivityDTO[]>([])
    const [loading, setLoading] = useState(true)
    const [reviewerId, setReviewerId] = useState<number | null>(null)
    const [expandedReview, setExpandedReview] = useState<number | null>(null)

    useEffect(() => {
        // Get userId from JWT
        try {
            const token = localStorage.getItem('accessToken')
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]))
                setReviewerId(payload.userId || payload.id)
            }
        } catch { /* ignore */ }
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const conf = await getConference(conferenceId)
                setConference(conf)

                if (reviewerId) {
                    const [summary, reviewsData, activitiesData] = await Promise.all([
                        getBidsSummary(reviewerId, conferenceId).catch(() => null),
                        getReviewsByReviewerAndConference(reviewerId, conferenceId).catch(() => []),
                        getConferenceActivities(conferenceId).catch(() => []),
                    ])
                    if (summary) setBidsSummary(summary)
                    const list = Array.isArray(reviewsData) ? reviewsData : (reviewsData as any)?.content || []
                    setReviews(list)
                    setActivities(activitiesData)
                }
            } catch (err) {
                console.error('Failed to load reviewer console:', err)
            } finally {
                setLoading(false)
            }
        }
        if (reviewerId) fetchData()
    }, [conferenceId, reviewerId])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Header */}
            <div className="space-y-4">
                <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push('/conference/reviewer-select')}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Reviewer
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reviewer Console</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {conference?.name || 'Conference'} — {conference?.acronym}
                    </p>
                </div>

                {/* Deadline countdown badges */}
                {activities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {activities
                            .filter(a => a.isEnabled && a.deadline && ['REVIEWER_BIDDING', 'REVIEW_SUBMISSION'].includes(a.activityType))
                            .map(a => {
                                const deadline = new Date(a.deadline!)
                                const now = new Date()
                                const diffMs = deadline.getTime() - now.getTime()
                                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
                                const isPast = diffMs <= 0
                                const isUrgent = diffDays <= 3 && !isPast
                                const label = a.activityType === 'REVIEWER_BIDDING' ? 'Bidding Deadline' : 'Review Deadline'
                                return (
                                    <span
                                        key={a.activityType}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                                            isPast ? 'bg-gray-100 text-gray-500 border-gray-200' :
                                            isUrgent ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' :
                                            'bg-indigo-50 text-indigo-700 border-indigo-200'
                                        }`}
                                    >
                                        <Clock className="h-3 w-3" />
                                        {label}: {isPast ? 'Closed' : `${diffDays} day${diffDays !== 1 ? 's' : ''} left`}
                                    </span>
                                )
                            })}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Link href={`/conference/${conferenceId}/reviewer/interests`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500 h-full">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="rounded-full bg-purple-100 p-3">
                                <Target className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">Subject Areas</p>
                                <p className="text-xs text-muted-foreground">Select your subject areas</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/conference/${conferenceId}/reviewer/bidding`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500 h-full">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="rounded-full bg-indigo-100 p-3">
                                <FileSearch className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">Bidding Papers</p>
                                <p className="text-xs text-muted-foreground">
                                    {bidsSummary ? `${bidsSummary.totalBids}/${bidsSummary.totalPapers} papers bid` : 'Place bids on papers'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Card className="border-l-4 border-l-emerald-500">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="rounded-full bg-emerald-100 p-3">
                            <ClipboardList className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                                <p className="font-semibold text-gray-900">My Reviews</p>
                            <p className="text-xs text-muted-foreground">
                                {reviews.length} paper(s) assigned for review
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bidding Summary */}
            {bidsSummary && bidsSummary.totalBids > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Bidding Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            {Object.entries(BID_ICONS).map(([key, { icon, color, label }]) => (
                                <div key={key} className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 ${color}`}>
                                    {icon}
                                    <span className="font-semibold">{bidsSummary.bidCounts?.[key] || 0}</span>
                                    <span className="text-sm text-gray-600">{label}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-3">
                            Bid on <strong>{bidsSummary.totalBids}</strong> / {bidsSummary.totalPapers} papers
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Reviews Table */}
            <Card>
                <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Assigned Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                    {reviews.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            <p>No reviews have been assigned to you yet.</p>
                            <p className="text-sm mt-1">The Chair will assign papers after bidding is complete.</p>
                        </div>
                    ) : (
                        <div className="overflow-auto rounded-xl border bg-white">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="px-5 py-3.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">#</th>
                                        <th className="px-5 py-3.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Paper Title</th>
                                        <th className="px-5 py-3.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                                        <th className="px-5 py-3.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Score</th>
                                        <th className="px-5 py-3.5 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {reviews.map((review, i) => (
                                        <>
                                        <tr key={review.id} className="hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}>
                                            <td className="px-5 py-4 text-xs text-muted-foreground font-medium">{i + 1}</td>
                                            <td className="px-5 py-4 font-medium max-w-md">
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate">{review.paper?.title || `Paper #${review.paper?.id}`}</span>
                                                    {expandedReview === review.id ? <ChevronUp className="h-3 w-3 text-gray-400 shrink-0" /> : <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Badge className={STATUS_COLORS[review.status] || 'bg-gray-100 text-gray-800'}>
                                                    {STATUS_LABELS[review.status] || review.status}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-4 font-mono">
                                                {review.totalScore != null ? review.totalScore : '—'}
                                            </td>
                                            <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                {review.status !== 'DECLINED' && (
                                                    <Link href={`/conference/${conferenceId}/reviewer/review/${review.id}`}>
                                                        <Button size="sm" variant={review.status === 'COMPLETED' ? 'outline' : 'default'}>
                                                            {review.status === 'COMPLETED' ? 'View' : review.status === 'ASSIGNED' ? 'Start' : 'Continue'}
                                                        </Button>
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                        {expandedReview === review.id && review.paper?.abstractField && (
                                            <tr key={`${review.id}-abstract`}>
                                                <td colSpan={5} className="px-5 py-4 bg-indigo-50/50">
                                                    <div className="text-sm text-gray-600 max-w-3xl">
                                                        <p className="font-medium text-gray-700 text-xs uppercase tracking-wider mb-1">Abstract</p>
                                                        <p className="leading-relaxed line-clamp-4">{review.paper.abstractField}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
