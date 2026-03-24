'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, FileText, Eye, CheckCircle2, AlertTriangle } from 'lucide-react'
import { getPapersByConference } from '@/app/api/paper.api'

interface ChairOverviewProps {
    conferenceId: number
}

export function ChairOverview({ conferenceId }: ChairOverviewProps) {
    const [papers, setPapers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const papersData = await getPapersByConference(conferenceId).catch(() => [])
            setPapers(papersData)
        } catch (err) {
            console.error('Failed to load chair overview:', err)
        } finally {
            setLoading(false)
        }
    }, [conferenceId])

    useEffect(() => { fetchData() }, [fetchData])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        )
    }

    // Stats
    const submitted = papers.filter(p => p.status !== 'DRAFT').length
    const underReview = papers.filter(p => p.status === 'UNDER_REVIEW').length
    const accepted = papers.filter(p => ['ACCEPTED', 'PUBLISHED'].includes(p.status)).length
    const rejected = papers.filter(p => p.status === 'REJECTED').length

    return (
        <div className="space-y-3">
            <h3 className="text-lg font-bold">Program Chair Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 bg-indigo-50/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold">{submitted}</p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">Submitted Papers</p>
                            </div>
                            <FileText className="h-6 w-6 text-indigo-300" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold">{underReview}</p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">Under Review</p>
                            </div>
                            <Eye className="h-6 w-6 text-amber-300" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold">{accepted}</p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">Accepted</p>
                            </div>
                            <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-400 bg-red-50/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold">{rejected}</p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">Rejected</p>
                            </div>
                            <AlertTriangle className="h-6 w-6 text-red-300" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
