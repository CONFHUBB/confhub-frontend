'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPapersForBidding, submitBid, getBidsSummary } from '@/app/api/bidding.api'
import type { PaperForBidding, BidValue, BidsSummary } from '@/types/bidding'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, ArrowLeft, Search, Zap, ThumbsUp, Minus, ThumbsDown, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

const BID_OPTIONS: { value: BidValue; label: string; shortLabel: string; color: string; activeColor: string; icon: React.ReactNode }[] = [
    { value: 'EAGER', label: 'Eager to review', shortLabel: 'Eager', color: 'border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600', activeColor: 'bg-emerald-100 border-emerald-400 text-emerald-700 ring-1 ring-emerald-300', icon: <Zap className="h-3.5 w-3.5" /> },
    { value: 'WILLING', label: 'Willing', shortLabel: 'Willing', color: 'border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600', activeColor: 'bg-blue-100 border-blue-400 text-blue-700 ring-1 ring-blue-300', icon: <ThumbsUp className="h-3.5 w-3.5" /> },
    { value: 'IN_A_PINCH', label: 'In a Pinch', shortLabel: 'Pinch', color: 'border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600', activeColor: 'bg-amber-100 border-amber-400 text-amber-700 ring-1 ring-amber-300', icon: <Minus className="h-3.5 w-3.5" /> },
    { value: 'NOT_WILLING', label: 'Not Willing', shortLabel: 'No', color: 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600', activeColor: 'bg-red-100 border-red-400 text-red-700 ring-1 ring-red-300', icon: <ThumbsDown className="h-3.5 w-3.5" /> },
]

type SortKey = 'relevance' | 'title' | 'bid'
type FilterBid = 'all' | BidValue | 'NOT_BID'

export default function BiddingPage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [papers, setPapers] = useState<PaperForBidding[]>([])
    const [summary, setSummary] = useState<BidsSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState<number | null>(null) // paperId being submitted
    const [searchQuery, setSearchQuery] = useState('')
    const [sortKey, setSortKey] = useState<SortKey>('relevance')
    const [sortAsc, setSortAsc] = useState(false)
    const [filterBid, setFilterBid] = useState<FilterBid>('all')
    const [expandedPaper, setExpandedPaper] = useState<number | null>(null)
    const [reviewerId, setReviewerId] = useState<number | null>(null)

    useEffect(() => {
        try {
            const token = localStorage.getItem('accessToken')
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]))
                setReviewerId(payload.userId || payload.id)
            }
        } catch { /* ignore */ }
    }, [])

    const fetchData = useCallback(async () => {
        if (!reviewerId) return
        try {
            setLoading(true)
            const [papersData, summaryData] = await Promise.all([
                getPapersForBidding(reviewerId, conferenceId),
                getBidsSummary(reviewerId, conferenceId).catch(() => null),
            ])
            setPapers(papersData)
            setSummary(summaryData)
        } catch (err) {
            console.error('Failed to load bidding data:', err)
            toast.error('Failed to load papers')
        } finally {
            setLoading(false)
        }
    }, [reviewerId, conferenceId])

    useEffect(() => {
        if (reviewerId) fetchData()
    }, [reviewerId, fetchData])

    const handleBid = async (paperId: number, bidValue: BidValue) => {
        if (!reviewerId) return
        setSubmitting(paperId)
        try {
            await submitBid({ paperId, reviewerId, bidValue })
            // Update local state
            setPapers(prev => prev.map(p =>
                p.paperId === paperId ? { ...p, currentBid: p.currentBid === bidValue ? null : bidValue } : p
            ))
            // Refresh summary
            const newSummary = await getBidsSummary(reviewerId, conferenceId).catch(() => null)
            if (newSummary) setSummary(newSummary)
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to submit bid'
            toast.error(msg)
        } finally {
            setSubmitting(null)
        }
    }

    // Filter + Sort
    const filteredPapers = papers
        .filter(p => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase()
                if (!p.title.toLowerCase().includes(q) &&
                    !(p.abstractText || '').toLowerCase().includes(q) &&
                    !p.primarySubjectArea.toLowerCase().includes(q)) {
                    return false
                }
            }
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div className="space-y-4">
                <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push(`/conference/${conferenceId}/reviewer`)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Reviewer Console
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bidding Papers</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Rate your interest in reviewing each paper. Bid on <strong>{bidCount}</strong>/{papers.length} papers.
                    </p>
                </div>
            </div>

            {/* Summary bar */}
            {summary && (
                <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-gray-50 border">
                    {BID_OPTIONS.map(opt => (
                        <div key={opt.value} className="flex items-center gap-1.5 text-sm">
                            {opt.icon}
                            <span className="font-semibold">{summary.bidCounts?.[opt.value] || 0}</span>
                            <span className="text-gray-500">{opt.shortLabel}</span>
                            <span className="text-gray-300 mx-1">|</span>
                        </div>
                    ))}
                    <span className="text-sm text-gray-600">
                        Not bid: <strong>{papers.length - bidCount}</strong>
                    </span>
                </div>
            )}

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        className="pl-10 h-10"
                        placeholder="Search by title, abstract, subject area..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        className="h-10 rounded-md border px-3 text-sm"
                        value={filterBid}
                        onChange={e => setFilterBid(e.target.value as FilterBid)}
                    >
                        <option value="all">All</option>
                        <option value="NOT_BID">Not Bid</option>
                        <option value="EAGER">Eager</option>
                        <option value="WILLING">Willing</option>
                        <option value="IN_A_PINCH">In a Pinch</option>
                        <option value="NOT_WILLING">Not Willing</option>
                    </select>
                    <select
                        className="h-10 rounded-md border px-3 text-sm"
                        value={sortKey}
                        onChange={e => setSortKey(e.target.value as SortKey)}
                    >
                        <option value="relevance">Relevance</option>
                        <option value="title">Title</option>
                        <option value="bid">Bid status</option>
                    </select>
                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setSortAsc(!sortAsc)}>
                        {sortAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Papers List */}
            {filteredPapers.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        {searchQuery || filterBid !== 'all'
                            ? 'No papers match your search.'
                            : 'No papers available for bidding.'}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredPapers.map(paper => {
                        const isExpanded = expandedPaper === paper.paperId
                        return (
                            <Card key={paper.paperId} className={`transition-all ${paper.currentBid ? 'border-l-4 border-l-blue-400' : ''}`}>
                                <CardContent className="p-4 sm:p-5">
                                    <div className="flex flex-col gap-3">
                                        {/* Paper info */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedPaper(isExpanded ? null : paper.paperId)}
                                                    className="text-left"
                                                >
                                                    <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                                                        {paper.title}
                                                    </h3>
                                                </button>
                                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                    <Badge variant="secondary" className="text-xs">{paper.primarySubjectArea}</Badge>
                                                    {paper.secondarySubjectAreas?.slice(0, 2).map((sa, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">{sa}</Badge>
                                                    ))}
                                                    {(paper.secondarySubjectAreas?.length || 0) > 2 && (
                                                        <span className="text-xs text-gray-400">+{paper.secondarySubjectAreas!.length - 2}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Relevance Score */}
                                            <div className="shrink-0 text-right">
                                                <p className="text-xs text-gray-500 mb-1">Relevance</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 rounded-full bg-gray-200 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${
                                                                paper.relevanceScore >= 0.7 ? 'bg-emerald-500' :
                                                                paper.relevanceScore >= 0.4 ? 'bg-blue-500' : 'bg-gray-400'
                                                            }`}
                                                            style={{ width: `${(paper.relevanceScore || 0) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-mono font-semibold">{Math.round((paper.relevanceScore || 0) * 100)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded abstract */}
                                        {isExpanded && paper.abstractText && (
                                            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4 border">
                                                <p className="font-medium text-gray-700 mb-1">Abstract</p>
                                                <p className="leading-relaxed">{paper.abstractText}</p>
                                            </div>
                                        )}
                                        {isExpanded && !paper.abstractText && paper.isDoubleBlind && (
                                            <div className="text-sm text-gray-400 italic bg-gray-50 rounded-lg p-4 border">
                                                Abstract hidden (Double Blind Review)
                                            </div>
                                        )}

                                        {/* Bid buttons */}
                                        <div className="flex flex-wrap gap-2">
                                            {BID_OPTIONS.map(opt => {
                                                const isActive = paper.currentBid === opt.value
                                                const isLoading = submitting === paper.paperId
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        disabled={isLoading}
                                                        onClick={() => handleBid(paper.paperId, opt.value)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                            isActive ? opt.activeColor : opt.color
                                                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                    >
                                                        {opt.icon}
                                                        <span className="hidden sm:inline">{opt.label}</span>
                                                        <span className="sm:hidden">{opt.shortLabel}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
