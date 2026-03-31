'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getAuthorsByPaper, type PaperAuthorItem } from '@/app/api/paper.api'
import { getBidsByPaper } from '@/app/api/bidding.api'
import type { BiddingResponse } from '@/types/bidding'
import type { PaperResponse } from '@/types/paper'

const BID_LABELS: Record<string, string> = { EAGER: 'Eager', WILLING: 'Willing', IN_A_PINCH: 'In a pinch', NOT_WILLING: 'Not willing' }
const BID_COLORS: Record<string, string> = {
    EAGER: 'bg-emerald-100 text-emerald-700',
    WILLING: 'bg-indigo-100 text-indigo-700',
    IN_A_PINCH: 'bg-amber-100 text-amber-700',
    NOT_WILLING: 'bg-red-100 text-red-700',
}

interface InfoTabProps {
    paper: PaperResponse
    paperId: number
    authors: PaperAuthorItem[]
    isChair: boolean
}

export function InfoTab({ paper, paperId, authors, isChair }: InfoTabProps) {
    const [bids, setBids] = useState<BiddingResponse[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            const b = await getBidsByPaper(paperId).catch(() => [])
            setBids(b || [])
            setLoading(false)
        }
        fetch()
    }, [paperId])

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Paper Info */}
            <div className="space-y-6">
                {/* Abstract */}
                {paper.abstractField && (
                    <div className="rounded-lg border bg-card p-5">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">Abstract</h3>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{paper.abstractField}</p>
                    </div>
                )}

                {/* Keywords */}
                {paper.keywords && paper.keywords.length > 0 && (
                    <div className="rounded-lg border bg-card p-5">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">Keywords</h3>
                        <div className="flex flex-wrap gap-2">
                            {paper.keywords.map((kw, i) => (
                                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                                    {kw}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Submission Details */}
                <div className="rounded-lg border bg-card p-5">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">Submission Details</h3>
                    <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Track</span>
                            <span className="font-medium">{paper.trackName || paper.track?.name || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Submitted</span>
                            <span className="font-medium">{paper.submissionTime ? new Date(paper.submissionTime).toLocaleString('en-US') : '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <span className="font-medium">{paper.status?.replace(/_/g, ' ')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Authors & Bids */}
            <div className="space-y-6">
                {/* Authors */}
                <div className="rounded-lg border bg-card p-5">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">
                        Authors ({authors.length})
                    </h3>
                    {authors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No authors found</p>
                    ) : (
                        <div className="space-y-2.5">
                            {authors.map(a => (
                                <div key={a.paperAuthorId} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                        {(a.user.firstName?.[0] || '').toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {a.user.fullName || `${a.user.firstName} ${a.user.lastName}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">{a.user.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bids (Chair only) */}
                {isChair && (
                    <div className="rounded-lg border bg-card p-5">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">
                            Bids ({bids.length})
                        </h3>
                        {bids.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No bids received</p>
                        ) : (
                            <div className="space-y-2">
                                {bids.map(b => (
                                    <div key={b.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/30 transition-colors">
                                        <span className="font-medium">{b.reviewerName}</span>
                                        <Badge className={`text-[10px] shadow-none ${BID_COLORS[b.bidValue] || ''}`}>
                                            {BID_LABELS[b.bidValue] || b.bidValue}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
