"use client"

import { Fragment, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StandardPagination } from "@/components/ui/standard-pagination"
import {
    Loader2, FileText, Check, AlertTriangle, Search, Trash2, Plus,
    UserPlus, Edit, Eye, Gavel, ChevronDown, ChevronRight
} from "lucide-react"
import { UserLink } from "@/components/shared/user-link"
import type { PaperResponse } from "@/types/paper"
import type { ReviewStatus } from "@/types/review"
import type { PaperConflictResponse } from "@/types/conflict"
import type { BiddingResponse } from "@/types/bidding"
import type { AssignmentPreviewItem } from "@/app/api/assignment.api"
import type { ReviewAggregate } from "@/app/api/review-aggregate.api"

interface SimpleReviewer {
    id: number
    name: string
    email: string
    quota: number | null
    trackIds: number[]
}

interface AssignmentOverviewTableProps {
    papers: PaperResponse[]
    paperAuthors: Record<number, string>
    subjectAreaMap: Record<number, string>
    allPaperBidSummary: Record<number, { eager: number; willing: number; inAPinch: number; notWilling: number; total: number }>
    currentAssignments: AssignmentPreviewItem[]
    reviewerCountPerPaper: Record<number, number>
    conflictCountPerPaper: Record<number, number>
    showAggregateColumns: boolean
    aggregateMap: Record<number, ReviewAggregate>
    minReviewers: number
    currentPage: number
    totalPages: number
    pageSize: number
    filteredPapersCount: number
    paginatedPapers: PaperResponse[]
    // Expanded row state
    expandedPaperId: number | null
    expandedBids: BiddingResponse[]
    expandedReviewStatus: Record<number, { status: ReviewStatus; reviewId: number }>
    expandedLoading: boolean
    inlineAssigning: number | null
    // Reviewers data
    reviewers: SimpleReviewer[]
    allConflicts: PaperConflictResponse[]
    assignmentCountPerReviewer: Record<number, number>
    // Search
    paperSearchQuery: string
    // Callbacks
    onToggleExpand: (paperId: number) => void
    onInlineAssign: (paperId: number, reviewerId: number) => void
    onInlineRemove: (paperId: number, reviewId: number | undefined) => void
    onOpenAssignDialog: (paperId: number) => void
    onOpenBidSheet: (paperId: number) => void
    onOpenEditPaper: (paperId: number) => void
    onSearchChange: (query: string) => void
    onPageChange: (page: number) => void
    onViewReviewerInfo: (reviewerId: number) => void
    onViewReview: (reviewId: number) => void
}

const STATUS_LABELS: Record<string, string> = {
    ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress', COMPLETED: 'Reviewed', DECLINED: 'Declined'
}
const STATUS_COLORS: Record<string, string> = {
    ASSIGNED: 'text-gray-600', IN_PROGRESS: 'text-amber-600', COMPLETED: 'text-emerald-600', DECLINED: 'text-red-600'
}
const BID_LABELS: Record<string, { label: string; color: string }> = {
    EAGER: { label: 'Eager', color: 'text-emerald-600' },
    WILLING: { label: 'Willing', color: 'text-indigo-600' },
    IN_A_PINCH: { label: 'In a pinch', color: 'text-amber-600' },
    NOT_WILLING: { label: 'Not willing', color: 'text-red-600' },
}

export function AssignmentOverviewTable({
    papers, paperAuthors, subjectAreaMap, allPaperBidSummary,
    currentAssignments, reviewerCountPerPaper, conflictCountPerPaper,
    showAggregateColumns, aggregateMap, minReviewers,
    currentPage, totalPages, pageSize, filteredPapersCount, paginatedPapers,
    expandedPaperId, expandedBids, expandedReviewStatus, expandedLoading, inlineAssigning,
    reviewers, allConflicts, assignmentCountPerReviewer,
    paperSearchQuery,
    onToggleExpand, onInlineAssign, onInlineRemove,
    onOpenAssignDialog, onOpenBidSheet, onOpenEditPaper,
    onSearchChange, onPageChange, onViewReviewerInfo, onViewReview,
}: AssignmentOverviewTableProps) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        Submitted Papers
                    </CardTitle>
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-9 h-9 text-sm"
                            placeholder="Search papers..."
                            value={paperSearchQuery}
                            onChange={e => onSearchChange(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-12">#</th>
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[200px]">Title</th>
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[150px]">Authors</th>
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[120px]">Subject Area</th>
                                <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-28"># Reviewers</th>
                                <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-16">
                                    <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Eager</span>
                                </th>
                                <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-16">
                                    <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Willing</span>
                                </th>
                                <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-16">
                                    <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Pinch</span>
                                </th>
                                <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-20">
                                    <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Not willing</span>
                                </th>
                                <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-24">Conflicts</th>
                                {showAggregateColumns && (
                                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-24">Avg Score</th>
                                )}
                                <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-24">Actions</th>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedPapers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={showAggregateColumns ? 12 : 11} className="text-center py-8 text-muted-foreground">
                                        {paperSearchQuery ? "No papers match your search." : "No papers submitted yet."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedPapers.map((paper, idx) => {
                                    const revCount = reviewerCountPerPaper[paper.id] || 0
                                    const conflictCount = conflictCountPerPaper[paper.id] || 0
                                    const saName = subjectAreaMap[paper.primarySubjectAreaId] || "—"
                                    const insufficient = revCount < minReviewers
                                    const isExpanded = expandedPaperId === paper.id
                                    const shortage = minReviewers - revCount

                                    // Data for expanded panel
                                    const paperAssignments = currentAssignments.filter(a => a.paperId === paper.id)
                                    const assignedIds = new Set(paperAssignments.map(a => a.reviewerId))
                                    const paperConflictIds = new Set(allConflicts.filter(c => c.paper.id === paper.id).map(c => c.user.id))

                                    // Build bid map for this paper from expandedBids
                                    const bidMap: Record<number, string> = {}
                                    if (isExpanded) {
                                        expandedBids.forEach(b => { bidMap[b.reviewerId] = b.bidValue })
                                    }

                                    // Suggested reviewers (not assigned, no conflict), sorted by relevance
                                    const suggestedReviewers = isExpanded ? reviewers
                                        .filter(r => !assignedIds.has(r.id) && !paperConflictIds.has(r.id))
                                        .map(r => {
                                            const bid = bidMap[r.id]
                                            const bidScore = bid === 'EAGER' ? 1 : bid === 'WILLING' ? 0.75 : bid === 'IN_A_PINCH' ? 0.25 : 0
                                            return { ...r, bid, bidScore }
                                        })
                                        .sort((a, b) => b.bidScore - a.bidScore)
                                        .slice(0, 10) : []

                                    return (
                                        <Fragment key={paper.id}>
                                            <tr
                                                className={`transition-colors cursor-pointer ${
                                                    isExpanded ? "bg-indigo-50/40" : "hover:bg-muted/30"
                                                }`}
                                                onClick={() => onToggleExpand(paper.id)}
                                            >
                                                <td className="px-4 py-3 font-mono text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                                        {currentPage * pageSize + idx + 1}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium line-clamp-2">{paper.title}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-muted-foreground text-xs line-clamp-2">
                                                        {paperAuthors[paper.id] || "Loading..."}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-muted-foreground">{saName}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`font-semibold text-sm ${insufficient ? "text-red-600" : "text-emerald-600"}`}>
                                                        {revCount}<span className="text-muted-foreground font-normal">/</span>{minReviewers}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    {(allPaperBidSummary[paper.id]?.eager || 0) > 0 ? (
                                                        <span className="font-semibold text-xs text-emerald-600">{allPaperBidSummary[paper.id].eager}</span>
                                                    ) : <span className="text-muted-foreground text-xs">0</span>}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    {(allPaperBidSummary[paper.id]?.willing || 0) > 0 ? (
                                                        <span className="font-semibold text-xs text-indigo-600">{allPaperBidSummary[paper.id].willing}</span>
                                                    ) : <span className="text-muted-foreground text-xs">0</span>}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    {(allPaperBidSummary[paper.id]?.inAPinch || 0) > 0 ? (
                                                        <span className="font-semibold text-xs text-amber-600">{allPaperBidSummary[paper.id].inAPinch}</span>
                                                    ) : <span className="text-muted-foreground text-xs">0</span>}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    {(allPaperBidSummary[paper.id]?.notWilling || 0) > 0 ? (
                                                        <span className="font-semibold text-xs text-red-600">{allPaperBidSummary[paper.id].notWilling}</span>
                                                    ) : <span className="text-muted-foreground text-xs">0</span>}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {conflictCount > 0 ? (
                                                        <span className="font-semibold text-xs text-amber-600">{conflictCount}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">0</span>
                                                    )}
                                                </td>
                                                {showAggregateColumns && (
                                                    <td className="px-4 py-3 text-center">
                                                        {(() => {
                                                            const agg = aggregateMap[paper.id]
                                                            if (!agg || agg.completedReviewCount === 0) {
                                                                return <span className="text-muted-foreground text-xs">—</span>
                                                            }
                                                            const score = agg.averageTotalScore
                                                            const color = score >= 3.5 ? "text-emerald-600" : score >= 2 ? "text-indigo-600" : "text-red-600"
                                                            return (
                                                                <span className={`font-mono text-xs font-semibold ${color}`}>
                                                                    {score.toFixed(2)}
                                                                </span>
                                                            )
                                                        })()}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="h-7 text-xs gap-1"
                                                            onClick={() => onOpenAssignDialog(paper.id)}
                                                        >
                                                            <UserPlus className="h-3 w-3" />
                                                            Manage
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0"
                                                            onClick={() => onOpenBidSheet(paper.id)}
                                                            title="View Bids"
                                                        >
                                                            <Gavel className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Inline Panel */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={showAggregateColumns ? 12 : 11} className="p-0">
                                                        <div className="bg-indigo-50/30 border-t border-b border-indigo-200 px-6 py-4">
                                                            {expandedLoading ? (
                                                                <div className="flex items-center justify-center py-6">
                                                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-4">
                                                                    {/* Shortfall banner */}
                                                                    {insufficient ? (
                                                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                                                                            <AlertTriangle className="h-4 w-4 shrink-0" />
                                                                            <span>Needs <strong>{shortage}</strong> more reviewer(s) ({revCount}/{minReviewers})</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                                                                            <Check className="h-4 w-4 shrink-0" />
                                                                            <span>Fully assigned ({revCount}/{minReviewers})</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Assigned reviewers */}
                                                                    {paperAssignments.length > 0 && (
                                                                        <div>
                                                                            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                                                                <Check className="h-3 w-3" /> Assigned ({paperAssignments.length})
                                                                            </p>
                                                                            <div className="space-y-1.5">
                                                                                {paperAssignments.map(a => {
                                                                                    const rev = reviewers.find(r => r.id === a.reviewerId)
                                                                                    const revStatus = expandedReviewStatus[a.reviewerId]
                                                                                    const st = revStatus?.status || 'ASSIGNED'
                                                                                    return (
                                                                                        <div key={a.reviewerId} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border text-sm">
                                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                                <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[10px] font-bold text-emerald-700 shrink-0">
                                                                                                    {rev?.name?.charAt(0)?.toUpperCase() || '?'}
                                                                                                </div>
                                                                                                <span className="font-medium truncate"><UserLink userId={a.reviewerId} name={rev?.name || `Reviewer #${a.reviewerId}`} className="font-medium text-sm" /></span>
                                                                                                <span className={`text-xs ${STATUS_COLORS[st]}`}>• {STATUS_LABELS[st] || st}</span>
                                                                                                <span className="text-xs text-muted-foreground">Relevance: {(a.relevanceScore * 100).toFixed(0)}%</span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-1 shrink-0">
                                                                                                <Button
                                                                                                    variant="ghost" size="sm"
                                                                                                    className="h-6 w-6 p-0 text-indigo-500 hover:text-indigo-700"
                                                                                                    onClick={() => onViewReviewerInfo(a.reviewerId)}
                                                                                                    title="View reviewer profile"
                                                                                                >
                                                                                                    <Eye className="h-3.5 w-3.5" />
                                                                                                </Button>
                                                                                                {revStatus?.reviewId && (
                                                                                                    <Button
                                                                                                        variant="ghost" size="sm"
                                                                                                        className="h-6 w-6 p-0 text-indigo-500 hover:text-indigo-700"
                                                                                                        onClick={() => onViewReview(revStatus.reviewId)}
                                                                                                        title="View review"
                                                                                                    >
                                                                                                        <FileText className="h-3.5 w-3.5" />
                                                                                                    </Button>
                                                                                                )}
                                                                                                <Button
                                                                                                    variant="ghost" size="sm"
                                                                                                    className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                                                                                                    onClick={() => onInlineRemove(paper.id, a.reviewId)}
                                                                                                    title="Remove assignment"
                                                                                                >
                                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                                </Button>
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Suggested reviewers */}
                                                                    <div>
                                                                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                                                            <UserPlus className="h-3 w-3" /> Suggested Reviewers
                                                                        </p>
                                                                        {suggestedReviewers.length === 0 ? (
                                                                            <p className="text-xs text-muted-foreground px-3 py-2">No suitable reviewers found.</p>
                                                                        ) : (
                                                                            <div className="space-y-1.5">
                                                                                {suggestedReviewers.map(r => {
                                                                                    const bidInfo = r.bid ? BID_LABELS[r.bid] : null
                                                                                    const totalAssign = assignmentCountPerReviewer[r.id] || 0
                                                                                    return (
                                                                                        <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border text-sm hover:border-indigo-300 transition-colors">
                                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                                <div className="w-6 h-6 rounded-full bg-gray-100 border flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                                                                                                    {r.name?.charAt(0)?.toUpperCase() || '?'}
                                                                                                </div>
                                                                                                <span className="font-medium truncate"><UserLink userId={r.id} name={r.name} className="font-medium text-sm" /></span>
                                                                                                {bidInfo && (
                                                                                                    <span className={`text-xs font-medium ${bidInfo.color}`}>• {bidInfo.label}</span>
                                                                                                )}
                                                                                                <span className="text-xs text-muted-foreground">Workload: {totalAssign}</span>
                                                                                                {r.quota !== null && (
                                                                                                    <span className="text-xs text-muted-foreground">Quota: {r.quota}</span>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="flex items-center gap-1 shrink-0">
                                                                                                <Button
                                                                                                    variant="ghost" size="sm"
                                                                                                    className="h-6 w-6 p-0 text-indigo-500 hover:text-indigo-700"
                                                                                                    onClick={() => onViewReviewerInfo(r.id)}
                                                                                                    title="View profile"
                                                                                                >
                                                                                                    <Eye className="h-3.5 w-3.5" />
                                                                                                </Button>
                                                                                                <Button
                                                                                                    size="sm"
                                                                                                    className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                                                    onClick={() => onInlineAssign(paper.id, r.id)}
                                                                                                    disabled={inlineAssigning === r.id}
                                                                                                >
                                                                                                    {inlineAssigning === r.id ? (
                                                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                                                    ) : (
                                                                                                        <Plus className="h-3 w-3" />
                                                                                                    )}
                                                                                                    Assign
                                                                                                </Button>
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Link to full edit view */}
                                                                    <div className="pt-2 border-t">
                                                                        <Button
                                                                            variant="outline" size="sm"
                                                                            className="text-xs gap-1"
                                                                            onClick={() => onOpenEditPaper(paper.id)}
                                                                        >
                                                                            <Edit className="h-3 w-3" />
                                                                            View All Reviewers (Full View)
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
                <StandardPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalElements={filteredPapersCount}
                    entityName="papers"
                    onPageChange={onPageChange}
                />
            </CardContent>
        </Card>
    )
}
