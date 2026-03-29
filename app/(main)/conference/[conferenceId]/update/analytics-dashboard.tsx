'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getConferenceStats, type ConferenceStatsResponse } from '@/app/api/conference.api'
import {
    Loader2, FileText, Users, CheckCircle2, XCircle,
    BarChart3, UserCheck, TrendingUp, PieChart
} from 'lucide-react'

interface AnalyticsDashboardProps {
    conferenceId: number
}

function StatCard({ label, value, icon: Icon, color, suffix }: {
    label: string; value: number | string; icon: any; color: string; suffix?: string
}) {
    return (
        <Card className={`border-l-4 ${color}`}>
            <CardContent className="p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">{label}</p>
                        <p className="text-3xl font-bold mt-1">
                            {value}{suffix}
                        </p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function ProgressBar({ label, value, max, color }: {
    label: string; value: number; max: number; color: string
}) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">{label}</span>
                <span className="font-semibold">{value} / {max} ({pct}%)</span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${color}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}

function DonutChart({ accepted, rejected, underReview, submitted }: {
    accepted: number; rejected: number; underReview: number; submitted: number
}) {
    const pending = submitted - accepted - rejected - underReview
    const total = submitted || 1
    const segments = [
        { label: 'Accepted', value: accepted, color: '#10b981', pct: Math.round((accepted / total) * 100) },
        { label: 'Rejected', value: rejected, color: '#ef4444', pct: Math.round((rejected / total) * 100) },
        { label: 'Under Review', value: underReview, color: '#f59e0b', pct: Math.round((underReview / total) * 100) },
        { label: 'Pending', value: pending > 0 ? pending : 0, color: '#94a3b8', pct: pending > 0 ? Math.round((pending / total) * 100) : 0 },
    ]

    // Build conic-gradient
    let cumulative = 0
    const gradientParts = segments.filter(s => s.value > 0).map(s => {
        const start = cumulative
        cumulative += (s.value / total) * 360
        return `${s.color} ${start}deg ${cumulative}deg`
    })
    const gradient = `conic-gradient(${gradientParts.join(', ')})`

    return (
        <div className="flex items-center gap-6">
            <div className="relative h-32 w-32 shrink-0">
                <div
                    className="h-full w-full rounded-full"
                    style={{ background: gradient }}
                />
                <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{submitted}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">Total</span>
                </div>
            </div>
            <div className="space-y-2 flex-1">
                {segments.filter(s => s.value > 0).map(s => (
                    <div key={s.label} className="flex items-center gap-2 text-sm">
                        <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-muted-foreground flex-1">{s.label}</span>
                        <span className="font-semibold">{s.value}</span>
                        <span className="text-muted-foreground text-xs w-10 text-right">{s.pct}%</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function AnalyticsDashboard({ conferenceId }: AnalyticsDashboardProps) {
    const [stats, setStats] = useState<ConferenceStatsResponse | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getConferenceStats(conferenceId)
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [conferenceId])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="text-center text-muted-foreground py-12">
                Failed to load analytics data.
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold">Analytics</h2>
                <p className="text-sm text-muted-foreground mt-1">Conference performance metrics and insights</p>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Papers"
                    value={stats.totalPapers}
                    icon={FileText}
                    color="border-l-indigo-500"
                />
                <StatCard
                    label="Acceptance Rate"
                    value={stats.acceptanceRate ? Math.round(stats.acceptanceRate * 100) : 0}
                    suffix="%"
                    icon={TrendingUp}
                    color="border-l-emerald-500"
                />
                <StatCard
                    label="Registrations"
                    value={stats.totalRegistrations}
                    icon={Users}
                    color="border-l-blue-500"
                />
                <StatCard
                    label="Checked In"
                    value={stats.checkedIn}
                    icon={UserCheck}
                    color="border-l-amber-500"
                />
            </div>

            {/* Paper Distribution + Review Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Paper Status Distribution */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <PieChart className="h-4 w-4 text-indigo-500" />
                            Paper Status Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DonutChart
                            accepted={stats.accepted}
                            rejected={stats.rejected}
                            underReview={stats.underReview}
                            submitted={stats.submitted}
                        />
                    </CardContent>
                </Card>

                {/* Progress Overview */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-indigo-500" />
                            Progress Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <ProgressBar
                            label="Review Completion"
                            value={stats.completedReviews}
                            max={stats.totalReviews}
                            color="bg-amber-500"
                        />
                        <ProgressBar
                            label="Decisions Made"
                            value={stats.accepted + stats.rejected}
                            max={stats.submitted}
                            color="bg-purple-500"
                        />
                        <ProgressBar
                            label="Check-in Rate"
                            value={stats.checkedIn}
                            max={stats.totalRegistrations}
                            color="bg-emerald-500"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Stats Grid */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-medium">Detailed Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[
                            { label: 'Submitted', value: stats.submitted, icon: FileText, cls: 'text-blue-600 bg-blue-50' },
                            { label: 'Under Review', value: stats.underReview, icon: BarChart3, cls: 'text-amber-600 bg-amber-50' },
                            { label: 'Accepted', value: stats.accepted, icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50' },
                            { label: 'Rejected', value: stats.rejected, icon: XCircle, cls: 'text-red-600 bg-red-50' },
                            { label: 'Review Completion', value: `${stats.reviewCompletionRate ? Math.round(stats.reviewCompletionRate * 100) : 0}%`, icon: TrendingUp, cls: 'text-violet-600 bg-violet-50' },
                        ].map(({ label, value, icon: Icon, cls }) => (
                            <div key={label} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${cls}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold leading-tight">{value}</p>
                                    <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
