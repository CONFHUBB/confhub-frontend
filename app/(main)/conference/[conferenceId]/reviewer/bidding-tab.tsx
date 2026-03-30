'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { getPapersForBidding, submitBid, deleteBid, getBidsByReviewerAndConference } from '@/app/api/bidding.api'
import { getInterestsByReviewer } from '@/app/api/reviewer-interest.api'
import { getConferenceActivities } from '@/app/api/conference.api'
import type { PaperForBidding, BidValue } from '@/types/bidding'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Search, Zap, ThumbsUp, Minus, ThumbsDown, ChevronDown, ChevronUp, AlertTriangle, Target, Tag, Pencil, XCircle, Lock, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { FilterPanel } from '@/components/ui/filter-panel'
import { EmptyState } from '@/components/ui/empty-state'
import toast from 'react-hot-toast'

const BID_OPTIONS: { value: BidValue; label: string; shortLabel: string; color: string; activeColor: string; icon: React.ReactNode }[] = [
    { value: 'EAGER', label: 'Eager to review', shortLabel: 'Eager', color: 'border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600', activeColor: 'bg-emerald-100 border-emerald-400 text-emerald-700 ring-1 ring-emerald-300', icon: <Zap className="h-3.5 w-3.5" /> },
    { value: 'WILLING', label: 'Willing', shortLabel: 'Willing', color: 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600', activeColor: 'bg-indigo-100 border-indigo-400 text-indigo-700 ring-1 ring-blue-300', icon: <ThumbsUp className="h-3.5 w-3.5" /> },
    { value: 'IN_A_PINCH', label: 'In a Pinch', shortLabel: 'Pinch', color: 'border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600', activeColor: 'bg-amber-100 border-amber-400 text-amber-700 ring-1 ring-amber-300', icon: <Minus className="h-3.5 w-3.5" /> },
    { value: 'NOT_WILLING', label: 'Not Willing', shortLabel: 'No', color: 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600', activeColor: 'bg-red-100 border-red-400 text-red-700 ring-1 ring-red-300', icon: <ThumbsDown className="h-3.5 w-3.5" /> },
]

type SortKey = 'relevance' | 'title' | 'bid'
type FilterBid = 'all' | BidValue | 'NOT_BID'

interface BiddingTabProps {
    conferenceId: number
    reviewerId: number
    onDataChanged?: (data?: { bidsUpdated?: boolean }) => void
    bidCounts?: Record<string, number>
    onBidCountsChanged?: (counts: Record<string, number>) => void
}

export function BiddingTab({ conferenceId, reviewerId, onDataChanged, bidCounts: externalBidCounts, onBidCountsChanged }: BiddingTabProps) {
    const [papers, setPapers] = useState<PaperForBidding[]>([])
    const [loading, setLoading] = useState(true)
    const [needsSubjectAreas, setNeedsSubjectAreas] = useState(false)
    const [submitting, setSubmitting] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortKey, setSortKey] = useState<SortKey>('relevance')
    const [sortAsc, setSortAsc] = useState(false)
    const [filterBid, setFilterBid] = useState<FilterBid>('all')
    const [filterTrack, setFilterTrack] = useState<string>('all')
    const [expandedPaper, setExpandedPaper] = useState<number | null>(null)
    const [editingBidPaperId, setEditingBidPaperId] = useState<number | null>(null)
    const [bidIdMap, setBidIdMap] = useState<Record<number, number>>({})
    const [activityClosed, setActivityClosed] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(0)
    const PAGE_SIZE = 15

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setNeedsSubjectAreas(false)
            setActivityClosed(null)

            try {
                const activities = await getConferenceActivities(conferenceId)
                const biddingActivity = activities.find(a => a.activityType === 'REVIEWER_BIDDING')
                if (biddingActivity) {
                    if (!biddingActivity.isEnabled) { setActivityClosed('Reviewer bidding is currently disabled.') }
                    else if (biddingActivity.deadline && new Date(biddingActivity.deadline) < new Date()) {
                        setActivityClosed(`Bidding deadline has passed (${new Date(biddingActivity.deadline).toLocaleString()}).`)
                    }
                }
            } catch { /* ignore */ }

            const interests = await getInterestsByReviewer(reviewerId).catch(() => [])
            if (!interests || interests.length === 0) { setNeedsSubjectAreas(true); setLoading(false); return }

            const [papersData, bidsData] = await Promise.all([
                getPapersForBidding(reviewerId, conferenceId),
                getBidsByReviewerAndConference(reviewerId, conferenceId).catch(() => []),
            ])
            setPapers(papersData)
            const idMap: Record<number, number> = {}
            if (Array.isArray(bidsData)) { bidsData.forEach(b => { idMap[b.paperId] = b.id }) }
            setBidIdMap(idMap)
        } catch (err: any) {
            const msg = err?.response?.data?.message || ''
            if (msg.includes('Subject Areas') || msg.includes('subject areas')) setNeedsSubjectAreas(true)
            else toast.error(msg || 'Failed to load papers')
        } finally { setLoading(false) }
    }, [reviewerId, conferenceId])

    useEffect(() => { fetchData() }, [fetchData])

    const handleBid = async (paperId: number, bidValue: BidValue) => {
        setSubmitting(paperId)
        try {
            const result = await submitBid({ paperId, reviewerId, bidValue })
            // Optimistic update: update papers state and bidId map
            setPapers(prev => prev.map(p => p.paperId === paperId ? { ...p, currentBid: bidValue } : p))
            setBidIdMap(prev => ({ ...prev, [paperId]: result.id }))
            setEditingBidPaperId(null)
            toast.success('Bid submitted')
            // Notify parent to refresh workflow status (not full data)
            onDataChanged?.({ bidsUpdated: true })
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to submit bid') }
        finally { setSubmitting(null) }
    }

    const handleCancelBid = async (paperId: number) => {
        const bidId = bidIdMap[paperId]
        if (!bidId) { toast.error('Bid not found'); return }
        setSubmitting(paperId)
        try {
            await deleteBid(bidId)
            // Optimistic update: update papers state and bidId map
            setPapers(prev => prev.map(p => p.paperId === paperId ? { ...p, currentBid: null } : p))
            setBidIdMap(prev => { const u = { ...prev }; delete u[paperId]; return u })
            setEditingBidPaperId(null)
            toast.success('Bid cancelled')
            // Notify parent to refresh workflow status (not full data)
            onDataChanged?.({ bidsUpdated: true })
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to cancel bid') }
        finally { setSubmitting(null) }
    }

    const trackNames = useMemo(() => Array.from(new Set(papers.map(p => p.trackName).filter(Boolean))).sort(), [papers])

    const filteredPapers = papers
        .filter(p => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase()
                if (!p.title.toLowerCase().includes(q) && !(p.abstractText || '').toLowerCase().includes(q) &&
                    !(p.primarySubjectArea || '').toLowerCase().includes(q) && !p.keywords?.some(k => k.toLowerCase().includes(q))) return false
            }
            if (filterTrack !== 'all' && p.trackName !== filterTrack) return false
            if (filterBid === 'NOT_BID') return p.currentBid === null
            if (filterBid !== 'all') return p.currentBid === filterBid
            return true
        })
        .sort((a, b) => {
            let cmp = 0
            if (sortKey === 'relevance') cmp = (a.relevanceScore || 0) - (b.relevanceScore || 0)
            else if (sortKey === 'title') cmp = a.title.localeCompare(b.title)
            else if (sortKey === 'bid') cmp = (a.currentBid || '').localeCompare(b.currentBid || '')
            return sortAsc ? cmp : -cmp
        })

    const bidCount = papers.filter(p => p.currentBid !== null).length

    // Compute bid summary locally from papers state (no API call needed)
    const bidCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const opt of BID_OPTIONS) {
            counts[opt.value] = papers.filter(p => p.currentBid === opt.value).length
        }
        return counts
    }, [papers])

    // Sync bid counts to parent whenever they change
    useEffect(() => {
        onBidCountsChanged?.(bidCounts)
    }, [bidCounts, onBidCountsChanged])

    const paginatedPapers = useMemo(() => {
        const start = currentPage * PAGE_SIZE
        const end = start + PAGE_SIZE
        return filteredPapers.slice(start, end)
    }, [filteredPapers, currentPage])

    const totalPages = Math.ceil(filteredPapers.length / PAGE_SIZE)

    useEffect(() => { setCurrentPage(0) }, [searchQuery, filterBid, filterTrack, sortKey, sortAsc])

    const exportCsv = () => {
        try {
            const headers = ['Paper ID', 'Title', 'Track', 'Primary Subject Area', 'Relevance Score', 'Current Bid']
            const rows = filteredPapers.map(p => [
                p.paperId,
                `"${p.title.replace(/"/g, '""')}"`,
                p.trackName || '',
                p.primarySubjectArea || '',
                p.relevanceScore || 0,
                p.currentBid || 'NOT_BID'
            ])
            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `biddings-conf-${conferenceId}.csv`
            a.click()
            URL.revokeObjectURL(url)
        } catch { toast.error('Failed to export bidding CSV') }
    }

    if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

    if (needsSubjectAreas) return (
        <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-8 text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center"><AlertTriangle className="h-8 w-8 text-amber-600" /></div>
                <h2 className="text-xl font-bold text-amber-900">Subject Areas Required</h2>
                <p className="text-amber-800 max-w-md mx-auto">
                    Before you can bid on papers, you must first select your <strong>Subject Areas</strong>. Go to the Subject Areas step first.
                </p>
            </CardContent>
        </Card>
    )

    return (
        <div className="space-y-5">
            {activityClosed && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-amber-900">Bidding Closed</h3>
                        <p className="text-sm mt-0.5">{activityClosed} Viewing mode only.</p>
                    </div>
                </div>
            )}
            
            <div>
                <h2 className="text-xl font-bold">Paper Bidding</h2>
                <p className="text-sm text-muted-foreground mt-1">Rate your interest in reviewing each paper. Bid on <strong>{bidCount}</strong>/{papers.length} papers.</p>
            </div>

            {papers.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-gray-50 border">
                    {BID_OPTIONS.map(opt => (
                        <div key={opt.value} className="flex items-center gap-1.5 text-sm">
                            {opt.icon} <span className="font-semibold">{bidCounts[opt.value] || 0}</span>
                            <span className="text-gray-500">{opt.shortLabel}</span><span className="text-gray-300 mx-1">|</span>
                        </div>
                    ))}
                    <span className="text-sm text-gray-600">Not bid: <strong>{papers.length - bidCount}</strong></span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 h-9 text-sm" placeholder="Search by title, abstract, keyword..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <FilterPanel
                    groups={[
                        ...(trackNames.length > 1 ? [{
                            label: 'Track',
                            type: 'radio' as const,
                            options: [{ value: 'all', label: 'All Tracks' }, ...trackNames.map(t => ({ value: t, label: t }))],
                            value: filterTrack,
                            onChange: setFilterTrack,
                        }] : []),
                        {
                            label: 'Bid Status',
                            type: 'radio' as const,
                            options: [
                                { value: 'all', label: 'All Bids' },
                                { value: 'NOT_BID', label: 'Not Bid' },
                                { value: 'EAGER', label: 'Eager' },
                                { value: 'WILLING', label: 'Willing' },
                                { value: 'IN_A_PINCH', label: 'In a Pinch' },
                                { value: 'NOT_WILLING', label: 'Not Willing' },
                            ],
                            value: filterBid,
                            onChange: (v) => setFilterBid(v as FilterBid),
                        },
                        {
                            label: 'Sort By',
                            type: 'radio' as const,
                            options: [
                                { value: 'relevance', label: 'Relevance' },
                                { value: 'title', label: 'Title' },
                                { value: 'bid', label: 'Bid Status' },
                            ],
                            value: sortKey,
                            onChange: (v) => setSortKey(v as SortKey),
                        }
                    ]}
                />
                <Button variant="outline" size="sm" className="h-9 w-9 px-0 border-gray-200" onClick={() => setSortAsc(!sortAsc)} title="Toggle Sort Order">
                    {sortAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" className="gap-2 text-xs h-9 bg-white" onClick={exportCsv} disabled={loading || filteredPapers.length === 0}>
                    <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
            </div>

            {filteredPapers.length === 0 ? (
                <EmptyState
                    emoji={searchQuery || filterBid !== 'all' || filterTrack !== 'all' ? '🔍' : '📝'}
                    title={searchQuery || filterBid !== 'all' || filterTrack !== 'all' ? 'No papers match your search' : 'No papers available for bidding'}
                    description={searchQuery || filterBid !== 'all' || filterTrack !== 'all' ? 'Try adjusting your search or filter settings.' : 'The Chair has not configured papers for bidding yet.'}
                />
            ) : (
                <div className="space-y-3">
                    {paginatedPapers.map(paper => {
                        const isExpanded = expandedPaper === paper.paperId
                        return (
                            <Card key={paper.paperId} className={`transition-all ${paper.currentBid ? 'border-l-4 border-l-blue-400' : ''}`}>
                                <CardContent className="p-4 sm:p-5">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <button type="button" onClick={() => setExpandedPaper(isExpanded ? null : paper.paperId)} className="text-left">
                                                    <h3 className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">{paper.title}</h3>
                                                </button>
                                                {paper.isDoubleBlind ? (
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                                                            <Lock className="h-3 w-3 mr-1" />
                                                            Đã ẩn do chế độ Double-Blind
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    paper.authorNames && paper.authorNames.length > 0 && (
                                                        <p className="mt-1 text-xs text-muted-foreground">{paper.authorNames.join(', ')}</p>
                                                    )
                                                )}
                                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                    {paper.trackName && <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-purple-50">{paper.trackName}</Badge>}
                                                    {paper.primarySubjectArea && <Badge variant="secondary" className="text-xs">{paper.primarySubjectArea}</Badge>}
                                                    {paper.secondarySubjectAreas?.slice(0, 2).map((sa, i) => <Badge key={i} variant="outline" className="text-xs">{sa}</Badge>)}
                                                    {(paper.secondarySubjectAreas?.length || 0) > 2 && <span className="text-xs text-gray-400">+{paper.secondarySubjectAreas!.length - 2}</span>}
                                                </div>
                                                {paper.keywords && paper.keywords.length > 0 && (
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                        <Tag className="h-3 w-3 text-gray-400" />
                                                        {paper.keywords.slice(0, 5).map((kw, i) => <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{kw}</span>)}
                                                        {paper.keywords.length > 5 && <span className="text-xs text-gray-400">+{paper.keywords.length - 5}</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-xs text-gray-500 mb-1">Relevance</p>
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-16 h-2 rounded-full bg-gray-200 overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all ${paper.relevanceScore >= 0.7 ? 'bg-emerald-500' : paper.relevanceScore >= 0.4 ? 'bg-indigo-500' : 'bg-gray-400'}`} style={{ width: `${(paper.relevanceScore || 0) * 100}%` }} />
                                                    </div>
                                                    <span className="text-sm font-mono font-semibold">{Math.round((paper.relevanceScore || 0) * 100)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        {isExpanded && paper.abstractText && (
                                            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4 border">
                                                <p className="font-medium text-gray-700 mb-1">Abstract</p>
                                                <p className="leading-relaxed">{paper.abstractText}</p>
                                            </div>
                                        )}
                                        {paper.currentBid && editingBidPaperId !== paper.paperId ? (
                                            <div className="flex items-center gap-2">
                                                {(() => { const opt = BID_OPTIONS.find(o => o.value === paper.currentBid); if (!opt) return null; return <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${opt.activeColor}`}>{opt.icon}<span>{opt.label}</span></div> })()}
                                                {!activityClosed && (
                                                    <>
                                                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-indigo-600" onClick={() => setEditingBidPaperId(paper.paperId)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                                                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-red-600" disabled={submitting === paper.paperId} onClick={() => handleCancelBid(paper.paperId)}>
                                                            {submitting === paper.paperId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Cancel
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap items-center gap-2">
                                                {BID_OPTIONS.map(opt => (
                                                    <button key={opt.value} type="button" disabled={submitting === paper.paperId || !!activityClosed} onClick={() => handleBid(paper.paperId, opt.value)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${paper.currentBid === opt.value ? opt.activeColor : opt.color} ${(submitting === paper.paperId || !!activityClosed) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                        {opt.icon}<span className="hidden sm:inline">{opt.label}</span><span className="sm:hidden">{opt.shortLabel}</span>
                                                    </button>
                                                ))}
                                                {editingBidPaperId === paper.paperId && !activityClosed && <Button variant="ghost" size="sm" className="text-xs text-gray-500" onClick={() => setEditingBidPaperId(null)}>Cancel</Button>}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border bg-muted/20 mt-4 rounded-xl">
                            <div className="text-sm text-muted-foreground">
                                Page {currentPage + 1} of {totalPages} · {filteredPapers.length} papers matching criteria
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage((p) => p - 1)}>
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                </Button>
                                <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage((p) => p + 1)}>
                                    Next <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
