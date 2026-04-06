'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPapersForBidding, submitBid, deleteBid, getBidsByReviewerAndConference } from '@/app/api/bidding.api'
import { getInterestsByReviewer } from '@/app/api/reviewer-interest.api'
import { getConferenceActivities } from '@/app/api/conference.api'
import type { PaperForBidding, BidValue } from '@/types/bidding'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, ArrowLeft, Search, Zap, ThumbsUp, Minus, ThumbsDown, ChevronDown, ChevronUp, AlertTriangle, Target, Tag, Pencil, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getCurrentUserId } from '@/lib/auth'

const BID_OPTIONS: { value: BidValue; label: string; shortLabel: string; color: string; activeColor: string; icon: React.ReactNode }[] = [
    { value: 'EAGER', label: 'Eager to review', shortLabel: 'Eager', color: 'border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600', activeColor: 'bg-emerald-100 border-emerald-400 text-emerald-700 ring-1 ring-emerald-300', icon: <Zap className="h-3.5 w-3.5" /> },
    { value: 'WILLING', label: 'Willing', shortLabel: 'Willing', color: 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600', activeColor: 'bg-indigo-100 border-indigo-400 text-indigo-700 ring-1 ring-blue-300', icon: <ThumbsUp className="h-3.5 w-3.5" /> },
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
    const [reviewerId, setReviewerId] = useState<number | null>(null)
    const [activityClosed, setActivityClosed] = useState<string | null>(null) // null = open, string = reason

    useEffect(() => {
        setReviewerId(getCurrentUserId())
    }, [])

    const fetchData = useCallback(async () => {
        if (!reviewerId) return
        try {
            setLoading(true)
            setNeedsSubjectAreas(false)
            setActivityClosed(null)

            // Check if REVIEWER_BIDDING activity is enabled
            try {
                const activities = await getConferenceActivities(conferenceId)
                const biddingActivity = activities.find(a => a.activityType === 'REVIEWER_BIDDING')
                if (biddingActivity) {
                    if (!biddingActivity.isEnabled) {
                        setActivityClosed('Reviewer bidding is currently disabled for this conference.')
                        setLoading(false)
                        return
                    }
                    if (biddingActivity.deadline && new Date(biddingActivity.deadline) < new Date()) {
                        setActivityClosed(`Reviewer bidding deadline has passed (${new Date(biddingActivity.deadline).toLocaleString()}).`)
                        setLoading(false)
                        return
                    }
                }
            } catch { /* ignore activity check errors */ }

            // Subject areas are always required before bidding
            const interests = await getInterestsByReviewer(reviewerId).catch(() => [])
            if (!interests || interests.length === 0) {
                setNeedsSubjectAreas(true)
                setLoading(false)
                return
            }

            const [papersData, bidsData] = await Promise.all([
                getPapersForBidding(reviewerId, conferenceId),
                getBidsByReviewerAndConference(reviewerId, conferenceId).catch(() => []),
            ])
            setPapers(papersData)
            // Build bidId map: paperId -> bidId (needed for cancel/delete)
            const idMap: Record<number, number> = {}
            if (Array.isArray(bidsData)) {
                bidsData.forEach(b => { idMap[b.paperId] = b.id })
            }
            setBidIdMap(idMap)
        } catch (err: any) {
            const msg = err?.response?.data?.message || ''
            if (msg.includes('Subject Areas') || msg.includes('subject areas')) {
                setNeedsSubjectAreas(true)
            } else {
                console.error('Failed to load bidding data:', err)
                toast.error(msg || 'Failed to load papers')
            }
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
            const result = await submitBid({ paperId, reviewerId, bidValue })
            // Optimistic update: update papers state and bidId map
            setPapers(prev => prev.map(p =>
                p.paperId === paperId ? { ...p, currentBid: bidValue } : p
            ))
            setBidIdMap(prev => ({ ...prev, [paperId]: result.id }))
            setEditingBidPaperId(null)
            toast.success('Bid submitted')
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to submit bid'
            toast.error(msg)
        } finally {
            setSubmitting(null)
        }
    }

    const handleCancelBid = async (paperId: number) => {
        if (!reviewerId) return
        const bidId = bidIdMap[paperId]
        if (!bidId) {
            toast.error('Bid not found')
            return
        }
        setSubmitting(paperId)
        try {
            await deleteBid(bidId)
            setPapers(prev => prev.map(p =>
                p.paperId === paperId ? { ...p, currentBid: null } : p
            ))
            setBidIdMap(prev => {
                const updated = { ...prev }
                delete updated[paperId]
                return updated
            })
            setEditingBidPaperId(null)
            toast.success('Bid cancelled')
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to cancel bid')
        } finally {
            setSubmitting(null)
        }
    }

    // Extract unique track names for filter
    const trackNames = useMemo(() => {
        const names = new Set(papers.map(p => p.trackName).filter(Boolean))
        return Array.from(names).sort()
    }, [papers])

    // Filter + Sort
    const filteredPapers = papers
        .filter(p => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase()
                const matchesTitle = p.title.toLowerCase().includes(q)
                const matchesAbstract = (p.abstractText || '').toLowerCase().includes(q)
                const matchesSA = (p.primarySubjectArea || '').toLowerCase().includes(q)
                const matchesKeyword = p.keywords?.some(k => k.toLowerCase().includes(q))
                if (!matchesTitle && !matchesAbstract && !matchesSA && !matchesKeyword) return false
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

    // Compute bid counts from papers state (no API call needed)
    const bidCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const opt of BID_OPTIONS) {
            counts[opt.value] = papers.filter(p => p.currentBid === opt.value).length
        }
        return counts
    }, [papers])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Activity closed banner
    if (activityClosed) {
        return (
            <div className="page-narrow space-y-6">
                <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push(`/conference/${conferenceId}/reviewer`)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Reviewer Console
                </Button>

                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-red-900">Bidding Closed</h2>
                        <p className="text-red-800 max-w-md mx-auto">
                            {activityClosed}
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Subject Area requirement banner
    if (needsSubjectAreas) {
        return (
            <div className="page-narrow space-y-6">
                <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push(`/conference/${conferenceId}/reviewer`)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Reviewer Console
                </Button>

                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-amber-600" />
                        </div>
                        <h2 className="text-xl font-bold text-amber-900">Subject Areas Required</h2>
                        <p className="text-amber-800 max-w-md mx-auto">
                            Before you can bid on papers, you must first select your <strong>Subject Areas</strong> (Primary and Secondary).
                            This helps us match you with relevant papers and calculate relevance scores.
                        </p>
                        <Link href={`/conference/${conferenceId}/reviewer/interests`}>
                            <Button className="gap-2 mt-2 bg-amber-600 hover:bg-amber-700">
                                <Target className="h-4 w-4" />
                                Select Subject Areas
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="page-base space-y-6">
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
            {papers.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-gray-50 border">
                    {BID_OPTIONS.map(opt => (
                        <div key={opt.value} className="flex items-center gap-1.5 text-sm">
                            {opt.icon}
                            <span className="font-semibold">{bidCounts[opt.value] || 0}</span>
                            <span className="text-gray-500">{opt.shortLabel}</span>
                            <span className="text-gray-300 mx-1">|</span>
                        </div>
                    ))}
                    <span className="text-sm text-gray-600">
                        Not bid: <strong>{papers.length - bidCount}</strong>
                    </span>
                </div>
            )}

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        className="pl-10 h-10"
                        placeholder="Search by title, abstract, subject area, keyword..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {/* Track filter */}
                    {trackNames.length > 1 && (
                        <select
                            className="h-10 rounded-md border px-3 text-sm bg-white"
                            value={filterTrack}
                            onChange={e => setFilterTrack(e.target.value)}
                        >
                            <option value="all">All Tracks</option>
                            {trackNames.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    )}
                    <select
                        className="h-10 rounded-md border px-3 text-sm bg-white"
                        value={filterBid}
                        onChange={e => setFilterBid(e.target.value as FilterBid)}
                    >
                        <option value="all">All Bids</option>
                        <option value="NOT_BID">Not Bid</option>
                        <option value="EAGER">Eager</option>
                        <option value="WILLING">Willing</option>
                        <option value="IN_A_PINCH">In a Pinch</option>
                        <option value="NOT_WILLING">Not Willing</option>
                    </select>
                    <select
                        className="h-10 rounded-md border px-3 text-sm bg-white"
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
                        {searchQuery || filterBid !== 'all' || filterTrack !== 'all'
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
                                                    <h3 className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                                                        {paper.title}
                                                    </h3>
                                                </button>
                                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                    {paper.trackName && (
                                                        <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-purple-50">
                                                            {paper.trackName}
                                                        </Badge>
                                                    )}
                                                    {paper.primarySubjectArea && (
                                                        <Badge variant="secondary" className="text-xs">{paper.primarySubjectArea}</Badge>
                                                    )}
                                                    {paper.secondarySubjectAreas?.slice(0, 2).map((sa, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">{sa}</Badge>
                                                    ))}
                                                    {(paper.secondarySubjectAreas?.length || 0) > 2 && (
                                                        <span className="text-xs text-gray-400">+{paper.secondarySubjectAreas!.length - 2}</span>
                                                    )}
                                                </div>
                                                {/* Keywords */}
                                                {paper.keywords && paper.keywords.length > 0 && (
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                        <Tag className="h-3 w-3 text-gray-400" />
                                                        {paper.keywords.slice(0, 5).map((kw, i) => (
                                                            <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                                                {kw}
                                                            </span>
                                                        ))}
                                                        {paper.keywords.length > 5 && (
                                                            <span className="text-xs text-gray-400">+{paper.keywords.length - 5}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Relevance Score */}
                                            <div className="shrink-0 text-right">
                                                <p className="text-xs text-gray-500 mb-1">Relevance</p>
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-16 h-2 rounded-full bg-gray-200 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${paper.relevanceScore >= 0.7 ? 'bg-emerald-500' :
                                                                    paper.relevanceScore >= 0.4 ? 'bg-indigo-500' : 'bg-gray-400'
                                                                }`}
                                                            style={{ width: `${(paper.relevanceScore || 0) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-mono font-semibold">{Math.round((paper.relevanceScore || 0) * 100)}%</span>
                                                </div>
                                                <p className={`text-[10px] mt-1 leading-tight max-w-[140px] ${paper.relevanceScore >= 0.7 ? 'text-emerald-600' :
                                                        paper.relevanceScore >= 0.4 ? 'text-indigo-600' : 'text-gray-400'
                                                    }`}>
                                                    {paper.relevanceScore >= 0.7
                                                        ? 'High — your subject areas match well with this paper'
                                                        : paper.relevanceScore >= 0.4
                                                            ? 'Moderate — some overlap with your subject areas'
                                                            : 'Low — limited overlap with your subject areas'}
                                                </p>
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
                                        {paper.currentBid && editingBidPaperId !== paper.paperId ? (
                                            /* View mode: show current bid + Edit/Cancel */
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    const opt = BID_OPTIONS.find(o => o.value === paper.currentBid)
                                                    if (!opt) return null
                                                    return (
                                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${opt.activeColor}`}>
                                                            {opt.icon}
                                                            <span>{opt.label}</span>
                                                        </div>
                                                    )
                                                })()}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                    onClick={() => setEditingBidPaperId(paper.paperId)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                    Edit Bid
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    disabled={submitting === paper.paperId}
                                                    onClick={() => handleCancelBid(paper.paperId)}
                                                >
                                                    {submitting === paper.paperId ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <XCircle className="h-3.5 w-3.5" />
                                                    )}
                                                    Cancel Bid
                                                </Button>
                                            </div>
                                        ) : (
                                            /* Edit mode: show bid options */
                                            <div className="flex flex-wrap items-center gap-2">
                                                {BID_OPTIONS.map(opt => {
                                                    const isActive = paper.currentBid === opt.value
                                                    const isLoading = submitting === paper.paperId
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            disabled={isLoading}
                                                            onClick={() => handleBid(paper.paperId, opt.value)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isActive ? opt.activeColor : opt.color
                                                                } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                        >
                                                            {opt.icon}
                                                            <span className="hidden sm:inline">{opt.label}</span>
                                                            <span className="sm:hidden">{opt.shortLabel}</span>
                                                        </button>
                                                    )
                                                })}
                                                {editingBidPaperId === paper.paperId && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-xs text-gray-500"
                                                        onClick={() => setEditingBidPaperId(null)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                            </div>
                                        )}
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
