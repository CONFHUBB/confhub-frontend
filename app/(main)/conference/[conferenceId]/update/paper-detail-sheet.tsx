"use client"

import { useEffect, useState, useCallback } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
    Loader2, FileText, Users, Gavel, Shield, MessageSquare, Eye,
    Check, X, ChevronDown, ChevronRight, Plus, Trash2, Send, Reply, UserPlus, ExternalLink, Sparkles
} from "lucide-react"
import { toast } from 'sonner'

// APIs
import { getAuthorsByPaper, type PaperAuthorItem } from "@/app/api/paper.api"
import { getAggregateByPaper, type ReviewAggregate } from "@/app/api/review-aggregate.api"
import { getBidsByPaper } from "@/app/api/bidding.api"
import { getConflictsByPaper, createPaperConflict, deletePaperConflict } from "@/app/api/conflict.api"
import { getDiscussionByPaper, getReplies, createDiscussionPost } from "@/app/api/discussion.api"
import { PaperDiscussion } from "@/components/paper-discussion"
import { createMetaReview, updateMetaReview } from "@/app/api/meta-review.api"
import { manualAssign, removeAssignment, getCurrentAssignments, type AssignmentPreviewItem } from "@/app/api/assignment.api"
import { getConferenceUsersWithRoles } from "@/app/api/conference-user-track.api"
import { getReviewById, getAnswersByReview, getReviewQuestionsByTrack, getReviewsByPaper, getReviewVersions } from "@/app/api/review.api"
import { analyzeReviewConsensus, type ConsensusResponse } from "@/app/api/ai-assistant.api"
import Link from "next/link"
import { paperStatusClass, getPaperStatus } from '@/lib/constants/status'
import { UserLink } from '@/components/shared/user-link'

// Types
import type { BiddingResponse } from "@/types/bidding"
import type { PaperConflictResponse, ConflictType } from "@/types/conflict"
import { CONFLICT_TYPE_LABELS } from "@/types/conflict"
import type { DiscussionPost } from "@/types/discussion"
import type { MetaReviewResponse, Decision } from "@/types/meta-review"
import type { ReviewResponse, ReviewAnswerResponse } from "@/types/review"
import type { EnrichedPaper } from "./paper-management"

interface PaperDetailSheetProps {
    paperId: number | null
    conferenceId: number
    userId: number | null
    defaultTab: string
    enrichedPaper: EnrichedPaper | null
    metaReview: MetaReviewResponse | null
    onClose: () => void
    onDataChanged: () => void
}

type TabKey = "info" | "reviews" | "assignments" | "decision" | "conflicts" | "discussion"

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "info", label: "Info", icon: <FileText className="h-3.5 w-3.5" /> },
    { key: "reviews", label: "Reviews", icon: <Eye className="h-3.5 w-3.5" /> },
    { key: "assignments", label: "Assignments", icon: <Users className="h-3.5 w-3.5" /> },
    { key: "decision", label: "Decision", icon: <Gavel className="h-3.5 w-3.5" /> },
    { key: "conflicts", label: "Conflicts", icon: <Shield className="h-3.5 w-3.5" /> },
    { key: "discussion", label: "Discussion", icon: <MessageSquare className="h-3.5 w-3.5" /> },
]



export function PaperDetailSheet({
    paperId, conferenceId, userId, defaultTab,
    enrichedPaper, metaReview, onClose, onDataChanged
}: PaperDetailSheetProps) {
    const [activeTab, setActiveTab] = useState<TabKey>("info")
    const open = paperId !== null

    // Reset tab when opening
    useEffect(() => {
        if (open) setActiveTab((defaultTab as TabKey) || "info")
    }, [open, defaultTab])

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
                <SheetHeader className="px-6 pt-6 pb-3 border-b sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <SheetTitle className="text-lg truncate">
                            #{enrichedPaper?.id} — {enrichedPaper?.title || "Paper Detail"}
                        </SheetTitle>
                        {enrichedPaper && (
                            <Badge className={`shrink-0 text-[10px] ${paperStatusClass(enrichedPaper.status)}`}>
                                {getPaperStatus(enrichedPaper.status).label}
                            </Badge>
                        )}
                    </div>
                    {/* Tabs */}
                    <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                                    activeTab === tab.key
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted"
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </SheetHeader>

                <div className="p-6">
                    {!enrichedPaper ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            {activeTab === "info" && <InfoTab paper={enrichedPaper} paperId={paperId!} />}
                            {activeTab === "reviews" && <ReviewsTab paperId={paperId!} paper={enrichedPaper} conferenceId={conferenceId} />}
                            {activeTab === "assignments" && (
                                <AssignmentsTab paperId={paperId!} conferenceId={conferenceId} onChanged={onDataChanged} />
                            )}
                            {activeTab === "decision" && (
                                <DecisionTab
                                    paperId={paperId!}
                                    conferenceId={conferenceId}
                                    userId={userId}
                                    metaReview={metaReview}
                                    paper={enrichedPaper}
                                    onChanged={onDataChanged}
                                />
                            )}
                            {activeTab === "conflicts" && (
                                <ConflictsTab paperId={paperId!} conferenceId={conferenceId} />
                            )}
                            {activeTab === "discussion" && userId && (
                                <PaperDiscussion
                                    paperId={paperId!}
                                    currentUserId={userId}
                                    isChair={true}
                                    anonymize={false}
                                />
                            )}
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}

// ═══════════════════════════════════════════════
// TAB: Info
// ═══════════════════════════════════════════════
function InfoTab({ paper, paperId }: { paper: EnrichedPaper; paperId: number }) {
    const [authors, setAuthors] = useState<PaperAuthorItem[]>([])
    const [bids, setBids] = useState<BiddingResponse[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            const [a, b] = await Promise.all([
                getAuthorsByPaper(paperId).catch(() => []),
                getBidsByPaper(paperId).catch(() => []),
            ])
            setAuthors(a || [])
            setBids(b || [])
            setLoading(false)
        }
        fetch()
    }, [paperId])

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>

    const BID_LABELS: Record<string, string> = { EAGER: "Eager", WILLING: "Willing", IN_A_PINCH: "In a pinch", NOT_WILLING: "Not willing" }
    const BID_COLORS: Record<string, string> = {
        EAGER: "bg-emerald-100 text-emerald-700",
        WILLING: "bg-indigo-100 text-indigo-700",
        IN_A_PINCH: "bg-amber-100 text-amber-700",
        NOT_WILLING: "bg-red-100 text-red-700",
    }

    return (
        <div className="space-y-5">
            {/* Review Progress — at top */}
            <div className="rounded-lg border p-4 bg-indigo-50/30">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Review Progress</p>
                    {paper.averageTotalScore !== null && (
                        <Badge variant="outline" className="text-xs">
                            Avg: {paper.averageTotalScore.toFixed(1)}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${
                        paper.completedReviewCount === paper.reviewCount && paper.reviewCount > 0
                            ? "text-green-600" : "text-gray-700"
                    }`}>
                        {paper.completedReviewCount}/{paper.reviewCount} reviews completed
                    </span>
                </div>
                {paper.reviewCount > 0 && (
                    <div className="w-full h-2 rounded-full bg-gray-200 mt-2 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${
                                paper.completedReviewCount === paper.reviewCount ? "bg-green-500" : "bg-indigo-400"
                            }`}
                            style={{ width: `${(paper.completedReviewCount / paper.reviewCount) * 100}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Paper Info */}
            <div className="space-y-3">
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Track</p>
                    <p className="text-sm">{paper.trackName}</p>
                </div>
                {paper.abstractField && (
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Abstract</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{paper.abstractField}</p>
                    </div>
                )}
                {paper.keywords.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Keywords</p>
                        <div className="flex flex-wrap gap-1">
                            {paper.keywords.map((kw, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{kw}</span>
                            ))}
                        </div>
                    </div>
                )}
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Submitted</p>
                    <p className="text-sm">{paper.submissionTime ? new Date(paper.submissionTime).toLocaleString("vi-VN") : "—"}</p>
                </div>
            </div>

            {/* Authors */}
            <div className="border-t pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Authors ({authors.length})</p>
                {authors.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No authors found</p>
                ) : (
                    <div className="space-y-1.5">
                        {authors.map(a => (
                            <div key={a.paperAuthorId} className="flex items-center gap-2 text-sm">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                    {(a.user.firstName?.[0] || "").toUpperCase()}
                                </div>
                                <UserLink userId={a.user.id} name={a.user.fullName || `${a.user.firstName} ${a.user.lastName}`} className="font-medium" />
                                <span className="text-xs text-muted-foreground">{a.user.email}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bids */}
            <div className="border-t pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Bids ({bids.length})</p>
                {bids.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No bids received</p>
                ) : (
                    <div className="space-y-1.5">
                        {bids.map(b => (
                            <div key={b.id} className="flex items-center justify-between text-sm">
                                <span><UserLink userId={b.reviewerId} name={b.reviewerName || `Reviewer #${b.reviewerId}`} className="text-sm font-medium" /></span>
                                <Badge className={`text-[10px] ${BID_COLORS[b.bidValue] || ""}`}>
                                    {BID_LABELS[b.bidValue] || b.bidValue}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════
// TAB: Reviews
// ═══════════════════════════════════════════════
function ReviewsTab({ paperId, paper, conferenceId }: { paperId: number; paper: EnrichedPaper; conferenceId: number }) {
    const [aggregate, setAggregate] = useState<ReviewAggregate | null>(null)
    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set())
    
    // Store versions for each reviewId
    const [reviewVersions, setReviewVersions] = useState<Record<number, any[]>>({})
    // Store selected version index for each reviewId
    const [selectedVersionIdx, setSelectedVersionIdx] = useState<Record<number, number>>({})

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            const [agg, revs] = await Promise.all([
                getAggregateByPaper(paperId).catch(() => null),
                getReviewsByPaper(paperId).catch(() => [])
            ])
            setAggregate(agg)
            setReviews(revs)
            setLoading(false)
        }
        fetch()
    }, [paperId])

    const toggleReview = async (reviewId: number, trackId: number) => {
        if (expandedReviews.has(reviewId)) {
            setExpandedReviews(prev => { const n = new Set(prev); n.delete(reviewId); return n })
            return
        }
        if (!reviewVersions[reviewId]) {
            try {
                // Also import getReviewVersions if needed, assume it's imported
                const versions = await getReviewVersions(reviewId)
                setReviewVersions(prev => ({ ...prev, [reviewId]: versions }))
                setSelectedVersionIdx(prev => ({ ...prev, [reviewId]: versions.length > 0 ? versions.length - 1 : 0 }))
            } catch {
                toast.error("Failed to load review versions")
                return
            }
        }
        setExpandedReviews(prev => new Set(prev).add(reviewId))
    }

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
    if (!aggregate || aggregate.reviewCount === 0) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground py-8 text-center">No reviews yet for this paper.</p>
                <div className="border-t pt-4">
                    <Link href={`/conference/${conferenceId}/update?tab=reviewer-assignment`}>
                        <Button variant="outline" className="w-full gap-2 text-sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Go to Reviewer Assignment
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    // We need to get actual review IDs - use assignments data
    return (
        <div className="space-y-4">
            {/* Score summary */}
            <div className="rounded-lg border p-4 bg-muted/20">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold">{aggregate.completedReviewCount}/{aggregate.reviewCount}</p>
                        <p className="text-xs text-muted-foreground">Reviews</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{aggregate.averageTotalScore?.toFixed(1) || "—"}</p>
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{aggregate.questionAggregates?.length || 0}</p>
                        <p className="text-xs text-muted-foreground">Questions</p>
                    </div>
                </div>
            </div>

            {/* Per-question breakdown */}
            {aggregate.questionAggregates && aggregate.questionAggregates.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Score Breakdown</p>
                    {aggregate.questionAggregates.map((qa, i) => (
                        <div key={qa.questionId} className="flex items-center justify-between text-sm border rounded-lg px-3 py-2">
                            <span className="text-xs text-muted-foreground line-clamp-1 flex-1 mr-2">
                                Q{i + 1}: {qa.questionText}
                            </span>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-muted-foreground">
                                    {qa.minScore?.toFixed(1)} – {qa.maxScore?.toFixed(1)}
                                </span>
                                <span className="font-mono font-semibold text-xs">
                                    avg {qa.averageScore?.toFixed(1)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Individual Reviews */}
            <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Individual Reviews ({reviews.length})</p>
                {reviews.length === 0 && (
                    <p className="text-xs text-muted-foreground">No review assignments yet.</p>
                )}
                {reviews.map(rev => {
                    const isExpanded = expandedReviews.has(rev.id)
                    const versions = reviewVersions[rev.id] || []
                    const activeIdx = selectedVersionIdx[rev.id] !== undefined ? selectedVersionIdx[rev.id] : versions.length - 1
                    const activeVersion = versions[activeIdx]

                    return (
                        <div key={rev.id} className="border rounded-lg overflow-hidden flex flex-col">
                            <button
                                onClick={() => toggleReview(rev.id, paper.trackId || 0)}
                                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <div className="text-left">
                                    <UserLink userId={rev.reviewer.id} name={`${rev.reviewer.firstName} ${rev.reviewer.lastName}`} className="text-sm font-semibold" />
                                    <p className="text-xs text-muted-foreground">{rev.status}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {rev.totalScore !== null && (
                                        <Badge variant="secondary" className="font-mono">{rev.totalScore}</Badge>
                                    )}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="p-4 bg-white border-t">
                                    {versions.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">No review versions submitted yet.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Version Selector */}
                                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border">
                                                <span className="text-xs font-medium text-slate-500 uppercase">Version History:</span>
                                                <select
                                                    value={activeIdx}
                                                    onChange={e => setSelectedVersionIdx(prev => ({ ...prev, [rev.id]: Number(e.target.value) }))}
                                                    className="text-sm border rounded p-1 flex-1 bg-white"
                                                >
                                                    {versions.map((v, i) => (
                                                        <option key={v.id} value={i}>
                                                            Version {v.versionNumber} ({new Date(v.submittedAt).toLocaleString()}) - Score: {v.totalScore}
                                                            {i === versions.length - 1 ? ' (Latest)' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Answers for Selected Version */}
                                            {activeVersion && (
                                                <div className="space-y-3">
                                                    {activeVersion.answers.map((ans: any, idx: number) => (
                                                        <div key={ans.id} className="text-sm space-y-1 bg-white border rounded p-3">
                                                            <p className="font-medium text-slate-800">
                                                                <span className="text-slate-400 mr-2">Q{idx + 1}.</span>
                                                                {ans.questionText}
                                                            </p>
                                                            <div className="pl-6 text-slate-600">
                                                                {ans.questionType === 'COMMENT' && <p className="whitespace-pre-wrap">{ans.answerValue || "—"}</p>}
                                                                {ans.questionType === 'AGREEMENT' && <p className="font-semibold">{ans.answerValue || "—"}</p>}
                                                                {(ans.questionType === 'OPTIONS' || ans.questionType === 'OPTIONS_WITH_VALUE') && (
                                                                    <p className="font-semibold text-indigo-600">{ans.selectedChoiceText || "—"}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Redirect to Review Management */}
            <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-2">
                    Need to reassign reviewers or manage review settings?
                </p>
                <Link href={`/conference/${conferenceId}/update?tab=reviewer-assignment`}>
                    <Button variant="outline" className="w-full gap-2 text-sm">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Manage in Reviewer Assignment
                    </Button>
                </Link>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════
// TAB: Assignments
// ═══════════════════════════════════════════════
function AssignmentsTab({ paperId, conferenceId, onChanged }: { paperId: number; conferenceId: number; onChanged: () => void }) {
    const [assignments, setAssignments] = useState<AssignmentPreviewItem[]>([])
    const [reviewers, setReviewers] = useState<{ id: number; name: string; email: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [assigning, setAssigning] = useState(false)
    const [search, setSearch] = useState("")

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            const [assignData, usersData] = await Promise.all([
                getCurrentAssignments(conferenceId).catch(() => null),
                getConferenceUsersWithRoles(conferenceId, 0, 200).catch(() => ({ content: [] })),
            ])
            const paperAssignments = (assignData?.assignments || []).filter(a => a.paperId === paperId)
            setAssignments(paperAssignments)

            const content = (usersData as any)?.content || usersData || []
            const revs = (Array.isArray(content) ? content : [])
                .filter((u: any) => (u.roles || []).some((r: any) => r.assignedRole === "REVIEWER"))
                .map((u: any) => ({
                    id: u.user?.id || u.userId || u.id,
                    name: `${u.user?.firstName || ""} ${u.user?.lastName || ""}`.trim() || "Unknown",
                    email: u.user?.email || u.userEmail || "",
                }))
            setReviewers(revs)
            setLoading(false)
        }
        fetch()
    }, [paperId, conferenceId])

    const assignedIds = new Set(assignments.map(a => a.reviewerId))

    const handleAssign = async (reviewerId: number) => {
        try {
            setAssigning(true)
            await manualAssign(conferenceId, paperId, reviewerId)
            toast.success("Reviewer assigned!")
            // Refresh
            const data = await getCurrentAssignments(conferenceId).catch(() => null)
            setAssignments((data?.assignments || []).filter(a => a.paperId === paperId))
            onChanged()
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to assign")
        } finally {
            setAssigning(false)
        }
    }

    const handleRemove = async (reviewId: number | undefined) => {
        if (!reviewId) return
        if (!confirm("Remove this assignment?")) return
        try {
            await removeAssignment(conferenceId, reviewId)
            toast.success("Assignment removed")
            const data = await getCurrentAssignments(conferenceId).catch(() => null)
            setAssignments((data?.assignments || []).filter(a => a.paperId === paperId))
            onChanged()
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to remove")
        }
    }

    const filteredReviewers = reviewers.filter(r => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    })

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>

    return (
        <div className="space-y-5">
            {/* Current assignments */}
            <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Assigned Reviewers ({assignments.length})
                </p>
                {assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">No reviewers assigned yet</p>
                ) : (
                    <div className="space-y-1.5">
                        {assignments.map(a => (
                            <div key={a.reviewerId} className="flex items-center justify-between rounded-lg border px-3 py-2 bg-emerald-50/50">
                                <div>
                                    <p className="text-sm font-medium"><UserLink userId={a.reviewerId} name={a.reviewerName || `Reviewer #${a.reviewerId}`} className="text-sm font-medium" /></p>
                                    <p className="text-xs text-muted-foreground">{a.reviewerEmail}</p>
                                </div>
                                <Button
                                    variant="ghost" size="sm"
                                    className="text-destructive hover:text-destructive h-7"
                                    onClick={() => handleRemove(a.reviewId)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add reviewer */}
            <div className="border-t pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Add Reviewer</p>
                <Input
                    placeholder="Search reviewers..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-8 text-xs mb-2"
                />
                <div className="max-h-60 overflow-y-auto space-y-1">
                    {filteredReviewers
                        .filter(r => !assignedIds.has(r.id))
                        .slice(0, 20)
                        .map(r => (
                            <div key={r.id} className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/30">
                                <div>
                                    <p className="text-sm">{r.name}</p>
                                    <p className="text-xs text-muted-foreground">{r.email}</p>
                                </div>
                                <Button
                                    variant="outline" size="sm"
                                    className="h-7 text-xs"
                                    disabled={assigning}
                                    onClick={() => handleAssign(r.id)}
                                >
                                    <UserPlus className="h-3 w-3 mr-1" /> Assign
                                </Button>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════
// TAB: Decision
// ═══════════════════════════════════════════════
function DecisionTab({
    paperId, conferenceId, userId, metaReview, paper, onChanged
}: { paperId: number; conferenceId: number; userId: number | null; metaReview: MetaReviewResponse | null; paper: EnrichedPaper; onChanged: () => void }) {
    const [decision, setDecision] = useState<Decision | "">(metaReview?.finalDecision || "")
    const [reason, setReason] = useState(metaReview?.reason || "")
    const [saving, setSaving] = useState(false)
    const [consensus, setConsensus] = useState<ConsensusResponse | null>(null)
    const [loadingConsensus, setLoadingConsensus] = useState(false)
    const [showConsensus, setShowConsensus] = useState(false)

    useEffect(() => {
        setDecision(metaReview?.finalDecision || "")
        setReason(metaReview?.reason || "")
    }, [metaReview])

    const handleSave = async () => {
        if (!userId) {
            toast.error("User session not found. Please refresh the page (F5).")
            return
        }
        if (!decision) {
            toast.error("Please select a final decision (Accept/Reject).")
            return
        }
        if (!reason.trim()) {
            toast.error("Please provide a reason or comments for this decision.")
            return
        }
        try {
            setSaving(true)
            if (metaReview) {
                await updateMetaReview(metaReview.id, { paperId, userId, finalDecision: decision, reason })
                toast.success("Decision updated!")
            } else {
                await createMetaReview({ paperId, userId, finalDecision: decision, reason })
                toast.success("Decision saved!")
            }
            onChanged()
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to save decision")
        } finally {
            setSaving(false)
        }
    }

    const DECISIONS: { value: Decision; label: string; color: string; desc: string }[] = [
        { value: "APPROVE", label: "Accept", color: "border-green-400 bg-green-50 text-green-800", desc: "Paper accepted for publication" },
        { value: "REJECT", label: "Reject", color: "border-red-400 bg-red-50 text-red-800", desc: "Paper rejected" },
    ]

    return (
        <div className="space-y-5">
            {/* Review Summary */}
            <div className="rounded-lg border p-4 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Review Summary</p>
                <div className="flex items-center gap-4 text-sm">
                    <span>Reviews: <strong>{paper.completedReviewCount}/{paper.reviewCount}</strong></span>
                    {paper.averageTotalScore !== null && (
                        <span>Avg Score: <strong>{paper.averageTotalScore.toFixed(1)}</strong></span>
                    )}
                </div>
            </div>

            {/* AI Review Consensus */}
            <div className="rounded-lg border p-4 bg-amber-50/30 border-amber-200">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-amber-700 uppercase flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Review Consensus
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={loadingConsensus || (paper.completedReviewCount || 0) === 0}
                        className="gap-1.5 text-xs text-amber-600 border-amber-200 hover:bg-amber-100"
                        onClick={async () => {
                            if (consensus) { setShowConsensus(!showConsensus); return }
                            setLoadingConsensus(true)
                            try {
                                const result = await analyzeReviewConsensus(paperId)
                                setConsensus(result)
                                setShowConsensus(true)
                            } catch { toast.error('Failed to analyze consensus') }
                            finally { setLoadingConsensus(false) }
                        }}
                    >
                        {loadingConsensus ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {loadingConsensus ? 'Analyzing...' : consensus ? (showConsensus ? 'Hide' : 'Show') : 'Analyze'}
                    </Button>
                </div>
                {showConsensus && consensus && (
                    <div className="mt-3 space-y-3">
                        {/* Agreement Score */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-2.5 rounded-full bg-gray-200 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        consensus.agreementScore >= 70 ? 'bg-emerald-500' :
                                        consensus.agreementScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${consensus.agreementScore}%` }}
                                />
                            </div>
                            <span className="text-sm font-bold text-gray-700">{consensus.agreementScore}%</span>
                        </div>
                        {/* Recommendation */}
                        <div className="p-2.5 rounded-lg bg-white border text-sm text-gray-700">
                            <p className="text-[10px] font-semibold text-amber-600 uppercase mb-0.5">AI Recommendation</p>
                            {consensus.recommendation}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[10px] font-semibold text-emerald-600 uppercase mb-1">Agreements</p>
                                {consensus.agreements.map((a, i) => (
                                    <div key={i} className="p-1.5 text-xs text-emerald-800 bg-emerald-50 rounded mb-1 flex items-start gap-1.5">
                                        <Check className="h-3 w-3 mt-0.5 shrink-0 text-emerald-500" />{a}
                                    </div>
                                ))}
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-red-600 uppercase mb-1">Disagreements</p>
                                {consensus.disagreements.map((d, i) => (
                                    <div key={i} className="p-1.5 text-xs text-red-800 bg-red-50 rounded mb-1 flex items-start gap-1.5">
                                        <X className="h-3 w-3 mt-0.5 shrink-0 text-red-500" />{d}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {(paper.completedReviewCount || 0) === 0 && (
                    <p className="text-[10px] text-amber-500 mt-1">Requires at least 1 completed review</p>
                )}
            </div>

            {/* Decision selection */}
            <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Final Decision</p>
                <div className="grid grid-cols-3 gap-2">
                    {DECISIONS.map(d => (
                        <button
                            key={d.value}
                            onClick={() => setDecision(d.value)}
                            className={`rounded-lg border-2 p-3 text-center transition-all ${
                                decision === d.value
                                    ? `${d.color} ring-2 ring-offset-1`
                                    : "border-gray-200 hover:border-gray-300"
                            }`}
                        >
                            <p className="font-semibold text-sm">{d.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{d.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Reason */}
            <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Reason / Comments *</p>
                <Textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Explain the decision rationale..."
                    className="min-h-[120px]"
                />
            </div>

            {/* Save */}
            <Button
                onClick={handleSave}
                disabled={saving || !decision || !reason.trim()}
                className="w-full"
            >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {metaReview ? "Update Decision" : "Save Decision"}
            </Button>

            {/* Existing decision info */}
            {metaReview && (
                <div className="border-t pt-4 text-xs text-muted-foreground">
                    Last updated by: <UserLink userId={metaReview.user.id} name={`${metaReview.user.firstName} ${metaReview.user.lastName}`} className="text-xs font-medium" /> ({metaReview.user.email})
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════
// TAB: Conflicts
// ═══════════════════════════════════════════════
function ConflictsTab({ paperId, conferenceId }: { paperId: number; conferenceId: number }) {
    const [conflicts, setConflicts] = useState<PaperConflictResponse[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            const data = await getConflictsByPaper(paperId).catch(() => [])
            setConflicts(data || [])
            setLoading(false)
        }
        fetch()
    }, [paperId])

    const handleDelete = async (id: number) => {
        try {
            await deletePaperConflict(id)
            setConflicts(prev => prev.filter(c => c.id !== id))
            toast.success("Conflict removed")
        } catch {
            toast.error("Failed to remove conflict")
        }
    }

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>

    return (
        <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
                Conflicts ({conflicts.length})
            </p>
            {conflicts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
                    No conflicts for this paper.
                </p>
            ) : (
                <div className="space-y-1.5">
                    {conflicts.map(c => (
                        <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                            <div>
                                <p className="text-sm font-medium"><UserLink userId={c.user?.id} name={`${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim() || 'Unknown'} className="text-sm font-medium" /></p>
                                <p className="text-xs text-muted-foreground">{c.user?.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-300">
                                    {CONFLICT_TYPE_LABELS[c.conflictType] || c.conflictType}
                                </Badge>
                                <Button
                                    variant="ghost" size="sm"
                                    className="text-destructive hover:text-destructive h-7"
                                    onClick={() => handleDelete(c.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════
// TAB: Discussion — now uses shared PaperDiscussion component
// See: components/paper-discussion.tsx
