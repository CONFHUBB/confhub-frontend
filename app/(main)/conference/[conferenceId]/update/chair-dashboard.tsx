'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Loader2, FileText, Users, BarChart3, CheckCircle2,
    Clock, AlertTriangle, Eye, UserCheck
} from 'lucide-react'
import { getPapersByConference } from '@/app/api/paper.api'
import { getAggregatesByConference } from '@/app/api/review-aggregate.api'
import { getConferenceActivities } from '@/app/api/conference.api'
import type { ConferenceActivityDTO } from '@/types/conference'

interface PaperSummary {
    id: number
    title: string
    status: string
    reviewCount: number
    completedReviewCount: number
    averageTotalScore: number | null
}

interface ChairDashboardProps {
    conferenceId: number
}

const ACTIVITY_LABELS: Record<string, string> = {
    PAPER_SUBMISSION: 'Paper Submission',
    REVIEWER_BIDDING: 'Reviewer Bidding',
    REVIEW_SUBMISSION: 'Review Submission',
    REVIEW_DISCUSSION: 'Review Discussion',
    AUTHOR_NOTIFICATION: 'Author Notification',
    CAMERA_READY_SUBMISSION: 'Camera-Ready Submission',
}

export function ChairDashboard({ conferenceId }: ChairDashboardProps) {
    const [papers, setPapers] = useState<PaperSummary[]>([])
    const [activities, setActivities] = useState<ConferenceActivityDTO[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const [papersData, aggregatesData, activitiesData] = await Promise.all([
                getPapersByConference(conferenceId).catch(() => []),
                getAggregatesByConference(conferenceId).catch(() => []),
                getConferenceActivities(conferenceId).catch(() => []),
            ])

            // Merge paper status with review aggregates
            const aggregateMap = new Map(aggregatesData.map(a => [a.paperId, a]))
            const merged: PaperSummary[] = papersData.map((p: any) => {
                const agg = aggregateMap.get(p.id)
                return {
                    id: p.id,
                    title: p.title,
                    status: p.status,
                    reviewCount: agg?.reviewCount || 0,
                    completedReviewCount: agg?.completedReviewCount || 0,
                    averageTotalScore: agg?.averageTotalScore || null,
                }
            })
            setPapers(merged)
            setActivities(activitiesData)
        } catch (err) {
            console.error('Failed to load dashboard:', err)
        } finally {
            setLoading(false)
        }
    }, [conferenceId])

    useEffect(() => { fetchData() }, [fetchData])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Stats
    const totalPapers = papers.length
    const submitted = papers.filter(p => p.status !== 'DRAFT').length
    const underReview = papers.filter(p => p.status === 'UNDER_REVIEW').length
    const accepted = papers.filter(p => ['ACCEPTED', 'PUBLISHED'].includes(p.status)).length
    const rejected = papers.filter(p => p.status === 'REJECTED').length
    const hasDecision = accepted + rejected
    const pendingDecision = submitted - hasDecision

    // Review progress
    const papersWithReviewers = papers.filter(p => p.reviewCount > 0)
    const papersFullyReviewed = papers.filter(p => p.reviewCount > 0 && p.completedReviewCount >= p.reviewCount)
    const totalReviews = papers.reduce((s, p) => s + p.reviewCount, 0)
    const completedReviews = papers.reduce((s, p) => s + p.completedReviewCount, 0)
    const reviewProgress = totalReviews > 0 ? Math.round((completedReviews / totalReviews) * 100) : 0
    const assignmentProgress = totalPapers > 0 ? Math.round((papersWithReviewers.length / submitted) * 100) : 0

    // Active timeline
    const now = new Date()
    const sortedActivities = activities
        .filter(a => a.isEnabled)
        .sort((a, b) => {
            if (!a.deadline) return 1
            if (!b.deadline) return -1
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        })

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold">Dashboard</h2>
                <p className="text-sm text-muted-foreground mt-1">Conference progress overview at a glance</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold">{submitted}</p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">Submitted Papers</p>
                            </div>
                            <FileText className="h-8 w-8 text-blue-200" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold">{underReview}</p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">Under Review</p>
                            </div>
                            <Eye className="h-8 w-8 text-amber-200" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold">{accepted}</p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">Accepted</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-emerald-200" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-400">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold">{rejected}</p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">Rejected</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-200" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Progress Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-indigo-500" />
                            Assignment Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{papersWithReviewers.length} / {submitted} papers assigned</span>
                            <span className="font-semibold">{assignmentProgress}%</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${assignmentProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${assignmentProgress}%` }}
                            />
                        </div>
                        {submitted > 0 && papersWithReviewers.length < submitted && (
                            <p className="text-xs text-amber-600">
                                ⚠ {submitted - papersWithReviewers.length} paper(s) still need reviewer assignment
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-emerald-500" />
                            Review Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{completedReviews} / {totalReviews} reviews completed</span>
                            <span className="font-semibold">{reviewProgress}%</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${reviewProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${reviewProgress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{papersFullyReviewed.length} paper(s) fully reviewed</span>
                            {pendingDecision > 0 && (
                                <span className="text-amber-600">{pendingDecision} awaiting decision</span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Paper Status Breakdown */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Paper Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[
                            { label: 'Draft', count: papers.filter(p => p.status === 'DRAFT').length, color: 'bg-gray-400' },
                            { label: 'Submitted', count: papers.filter(p => p.status === 'SUBMITTED').length, color: 'bg-indigo-500' },
                            { label: 'Under Review', count: underReview, color: 'bg-amber-500' },
                            { label: 'Accepted', count: accepted, color: 'bg-emerald-500' },
                            { label: 'Rejected', count: rejected, color: 'bg-red-500' },
                            { label: 'Revision', count: papers.filter(p => p.status === 'REVISION').length, color: 'bg-orange-500' },
                            { label: 'Published', count: papers.filter(p => p.status === 'PUBLISHED').length, color: 'bg-teal-500' },
                        ].filter(s => s.count > 0).map(s => (
                            <div key={s.label} className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground w-24">{s.label}</span>
                                <div className="flex-1 h-5 rounded bg-gray-50 overflow-hidden relative">
                                    <div
                                        className={`h-full rounded ${s.color} transition-all`}
                                        style={{ width: `${totalPapers > 0 ? (s.count / totalPapers * 100) : 0}%` }}
                                    />
                                </div>
                                <span className="text-xs font-semibold w-8 text-right">{s.count}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Activity Timeline */}
            {sortedActivities.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-indigo-500" />
                            Activity Timeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {sortedActivities.map(a => {
                                const deadline = a.deadline ? new Date(a.deadline) : null
                                const isPast = deadline ? deadline.getTime() < now.getTime() : false
                                const diffDays = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
                                const isUrgent = diffDays !== null && diffDays <= 3 && !isPast

                                return (
                                    <div key={a.activityType} className="flex items-center justify-between py-2 border-b last:border-0">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${isPast ? 'bg-gray-300' : isUrgent ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`} />
                                            <span className="text-sm font-medium">{ACTIVITY_LABELS[a.activityType] || a.name || a.activityType}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {deadline && (
                                                <span className="text-xs text-muted-foreground">
                                                    {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            )}
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] ${
                                                    isPast ? 'text-gray-500 border-gray-200' :
                                                    isUrgent ? 'text-red-700 border-red-200 bg-red-50' :
                                                    'text-indigo-700 border-indigo-200 bg-indigo-50'
                                                }`}
                                            >
                                                {isPast ? 'Closed' : diffDays !== null ? `${diffDays}d left` : 'No deadline'}
                                            </Badge>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
