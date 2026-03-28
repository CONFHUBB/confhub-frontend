'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getConference } from '@/app/api/conference.api'
import { getAggregatesByConference, type ReviewAggregate } from '@/app/api/review-aggregate.api'
import { getMetaReviewsByConference } from '@/app/api/meta-review.api'
import type { ConferenceResponse } from '@/types/conference'
import type { MetaReviewResponse } from '@/types/meta-review'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, ArrowLeft, FileText, CheckCircle, XCircle, Clock, Search, BarChart3 } from 'lucide-react'
import PaperDecisionDetail from '@/components/chair/paper-decision-detail'

const STATUS_COLORS: Record<string, string> = {
    SUBMITTED: 'bg-gray-100 text-gray-700',
    UNDER_REVIEW: 'bg-indigo-100 text-indigo-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    PUBLISHED: 'bg-emerald-100 text-emerald-800',
    WITHDRAWN: 'bg-gray-200 text-gray-500',
}

export default function ChairDecisionsPage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [aggregates, setAggregates] = useState<ReviewAggregate[]>([])
    const [metaReviews, setMetaReviews] = useState<MetaReviewResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null)
    const [userId, setUserId] = useState<number | null>(null)

    useEffect(() => {
        try {
            const token = localStorage.getItem('accessToken')
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]))
                setUserId(payload.userId || payload.id)
            }
        } catch { /* ignore */ }
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const [conf, aggs, mrs] = await Promise.all([
                getConference(conferenceId),
                getAggregatesByConference(conferenceId),
                getMetaReviewsByConference(conferenceId),
            ])
            setConference(conf)
            setAggregates(aggs)
            setMetaReviews(mrs)
        } catch (err) {
            console.error('Failed to load decision console:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [conferenceId])

    const metaReviewMap = useMemo(() => {
        const map: Record<number, MetaReviewResponse> = {}
        metaReviews.forEach(mr => { map[mr.paper.id] = mr })
        return map
    }, [metaReviews])

    const filteredAggregates = useMemo(() => {
        return aggregates.filter(a => {
            if (search && !a.paperTitle.toLowerCase().includes(search.toLowerCase())) return false
            if (statusFilter !== 'ALL' && a.paperStatus !== statusFilter) return false
            return true
        })
    }, [aggregates, search, statusFilter])

    const counts = useMemo(() => {
        const c = { total: aggregates.length, awaiting: 0, accepted: 0, rejected: 0, published: 0 }
        aggregates.forEach(a => {
            switch (a.paperStatus) {
                case 'ACCEPTED': c.accepted++; break
                case 'REJECTED': c.rejected++; break
                case 'PUBLISHED': c.published++; break
                default: c.awaiting++; break
            }
        })
        return c
    }, [aggregates])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div className="space-y-3">
                <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push(`/conference/${conferenceId}/update`)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Conference Management
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Chair Decision Console</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {conference?.name} — Review and make final decisions on submissions
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Card className="border-l-4 border-l-slate-400">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-slate-100 p-2">
                                <FileText className="h-4 w-4 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{counts.total}</p>
                                <p className="text-xs text-muted-foreground">Total Papers</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-400">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-indigo-100 p-2">
                                <Clock className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{counts.awaiting}</p>
                                <p className="text-xs text-muted-foreground">Awaiting Decision</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-400">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-green-100 p-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{counts.accepted}</p>
                                <p className="text-xs text-muted-foreground">Accepted</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-400">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-red-100 p-2">
                                <XCircle className="h-4 w-4 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{counts.rejected}</p>
                                <p className="text-xs text-muted-foreground">Rejected</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-400">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-emerald-100 p-2">
                                <BarChart3 className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{counts.published}</p>
                                <p className="text-xs text-muted-foreground">Published</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search papers..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <select
                            className="border rounded-md px-3 py-2 text-sm bg-white"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">All Status</option>
                            <option value="UNDER_REVIEW">Under Review</option>
                            <option value="ACCEPTED">Accepted</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="PUBLISHED">Published</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Papers Table */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                        Papers ({filteredAggregates.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredAggregates.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            <p>No papers found with the current filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-auto rounded-xl border bg-white">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="px-5 py-3.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground w-16">#</th>
                                        <th className="px-5 py-3.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Paper Title</th>
                                        <th className="px-5 py-3.5 text-center font-medium text-xs uppercase tracking-wider text-muted-foreground w-24">Avg Score</th>
                                        <th className="px-5 py-3.5 text-center font-medium text-xs uppercase tracking-wider text-muted-foreground w-24">Reviews</th>
                                        <th className="px-5 py-3.5 text-center font-medium text-xs uppercase tracking-wider text-muted-foreground w-28">Status</th>
                                        <th className="px-5 py-3.5 text-center font-medium text-xs uppercase tracking-wider text-muted-foreground w-24">Decision</th>
                                        <th className="px-5 py-3.5 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground w-28">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredAggregates.map((agg, i) => {
                                        const mr = metaReviewMap[agg.paperId]
                                        return (
                                            <tr key={agg.paperId} className="hover:bg-indigo-50/30 transition-colors">
                                                <td className="px-5 py-4 text-xs text-muted-foreground font-medium">{agg.paperId}</td>
                                                <td className="px-5 py-4 font-medium max-w-md truncate">
                                                    {agg.paperTitle}
                                                </td>
                                                <td className="px-5 py-4 text-center font-mono">
                                                    {agg.completedReviewCount > 0
                                                        ? Number(agg.averageTotalScore).toFixed(1)
                                                        : '—'}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={agg.completedReviewCount === agg.reviewCount ? 'text-green-600 font-semibold' : 'text-amber-600'}>
                                                        {agg.completedReviewCount}/{agg.reviewCount}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <Badge className={STATUS_COLORS[agg.paperStatus] || 'bg-gray-100 text-gray-800'}>
                                                        {agg.paperStatus.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    {mr ? (
                                                        <Badge className={
                                                            mr.finalDecision === 'APPROVE' ? 'bg-green-100 text-green-800' :
                                                            'bg-red-100 text-red-800'
                                                        }>
                                                            {mr.finalDecision}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant={mr ? 'outline' : 'default'}
                                                        onClick={() => setSelectedPaperId(agg.paperId)}
                                                    >
                                                        {mr ? 'View' : 'Review'}
                                                    </Button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Paper Decision Detail Dialog */}
            {selectedPaperId && userId && (
                <PaperDecisionDetail
                    paperId={selectedPaperId}
                    conferenceId={conferenceId}
                    userId={userId}
                    existingMetaReview={metaReviewMap[selectedPaperId] || null}
                    onClose={() => setSelectedPaperId(null)}
                    onSaved={() => {
                        setSelectedPaperId(null)
                        fetchData()
                    }}
                />
            )}
        </div>
    )
}
