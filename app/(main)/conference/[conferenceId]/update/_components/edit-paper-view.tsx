"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, Users, FileText, Search, Trash2, Plus, X, Eye, User2 } from "lucide-react"
import { UserLink } from "@/components/shared/user-link"
import type { PaperResponse } from "@/types/paper"
import type { ReviewStatus } from "@/types/review"
import type { AssignmentPreviewItem } from "@/app/api/assignment.api"

interface SimpleReviewer {
    id: number
    name: string
    email: string
    quota: number | null
    trackIds: number[]
}

interface EditPaperViewProps {
    editingPaper: PaperResponse
    paperAuthors: Record<number, string>
    subjectAreaMap: Record<number, string>
    editPaperAssignments: AssignmentPreviewItem[]
    assignedReviewerIds: Set<number>
    editPaperConflictUserIds: Set<number>
    filteredReviewersForEdit: SimpleReviewer[]
    bidMapForPaper: Record<number, string>
    trackAssignmentCountPerReviewer: Record<number, number>
    assignmentCountPerReviewer: Record<number, number>
    reviewStatusMap: Record<number, { status: ReviewStatus; reviewId: number }>
    assigning: boolean
    reviewerSearchQuery: string
    onAssign: (reviewerId: number) => void
    onRemove: (reviewId: number | undefined) => void
    onSearchChange: (query: string) => void
    onViewReviewerInfo: (reviewerId: number) => void
    onViewReview: (reviewId: number) => void
    getRelevanceForReviewer: (reviewerId: number) => number | null
}

const BID_COLORS: Record<string, string> = {
    EAGER: "bg-emerald-100 text-emerald-700 border-emerald-300",
    WILLING: "bg-indigo-100 text-indigo-700 border-indigo-300",
    IN_A_PINCH: "bg-amber-100 text-amber-700 border-amber-300",
    NOT_WILLING: "bg-red-100 text-red-700 border-red-300",
}

const BID_LABELS: Record<string, string> = {
    EAGER: "Eager",
    WILLING: "Willing",
    IN_A_PINCH: "In a pinch",
    NOT_WILLING: "Not willing",
}

const STATUS_LABELS: Record<string, string> = {
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Reviewed',
    DECLINED: 'Declined',
}

const STATUS_COLORS: Record<string, string> = {
    ASSIGNED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-300',
    COMPLETED: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    DECLINED: 'bg-red-100 text-red-700 border-red-300',
}

export function EditPaperView({
    editingPaper,
    paperAuthors,
    subjectAreaMap,
    editPaperAssignments,
    assignedReviewerIds,
    editPaperConflictUserIds,
    filteredReviewersForEdit,
    bidMapForPaper,
    trackAssignmentCountPerReviewer,
    assignmentCountPerReviewer,
    reviewStatusMap,
    assigning,
    reviewerSearchQuery,
    onAssign,
    onRemove,
    onSearchChange,
    onViewReviewerInfo,
    onViewReview,
    getRelevanceForReviewer,
}: EditPaperViewProps) {
    return (
        <div className="space-y-4">
            {/* Paper info banner */}
            <Card className="border-indigo-200 bg-indigo-50/30">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                            <h3 className="font-semibold text-sm">
                                Paper #{editingPaper.id}: {editingPaper.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Authors: {paperAuthors[editingPaper.id] || "—"} •
                                Subject Area: {subjectAreaMap[editingPaper.primarySubjectAreaId] || "—"} •
                                Assigned: {editPaperAssignments.length} reviewer(s)
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Reviewer table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5 text-green-600" />
                            Available Reviewers ({filteredReviewersForEdit.length})
                        </CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                className="pl-10 h-9"
                                placeholder="Search reviewers..."
                                value={reviewerSearchQuery}
                                onChange={e => onSearchChange(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[140px]">Reviewer</th>
                                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[160px]">Email</th>
                                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-20">Bid</th>
                                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-20">Quota</th>
                                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-24 text-xs">Assign. (Track)</th>
                                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-24 text-xs">Assign. (All)</th>
                                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-24">Relevance</th>
                                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-20">Status</th>
                                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-20">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredReviewersForEdit.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-8 text-muted-foreground">
                                            No reviewers found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReviewersForEdit.map((reviewer) => {
                                        const isAssigned = assignedReviewerIds.has(reviewer.id)
                                        const isConflict = editPaperConflictUserIds.has(reviewer.id)
                                        const totalAssignments = assignmentCountPerReviewer[reviewer.id] || 0
                                        const relevance = getRelevanceForReviewer(reviewer.id)
                                        const assignmentForPaper = editPaperAssignments.find(a => a.reviewerId === reviewer.id)

                                        return (
                                            <tr
                                                key={reviewer.id}
                                                className={`transition-colors ${
                                                    isConflict
                                                        ? "bg-red-50/50 hover:bg-red-50"
                                                        : isAssigned
                                                            ? "bg-emerald-50/50 hover:bg-emerald-50"
                                                            : "hover:bg-muted/30"
                                                }`}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium"><UserLink userId={reviewer.id} name={reviewer.name} className="font-medium text-sm" /></span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                            onClick={() => onViewReviewerInfo(reviewer.id)}
                                                            title="View reviewer info"
                                                        >
                                                            <User2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        {isConflict && (
                                                            <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                                                                Conflict
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground text-xs">{reviewer.email}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {(() => {
                                                        const bid = bidMapForPaper[reviewer.id]
                                                        if (!bid) return <span className="text-muted-foreground text-xs">—</span>
                                                        return (
                                                            <Badge className={`text-[10px] ${BID_COLORS[bid] || ""}`}>
                                                                {BID_LABELS[bid] || bid}
                                                            </Badge>
                                                        )
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-xs font-mono">
                                                        {reviewer.quota !== null ? reviewer.quota : "—"}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <Badge variant="outline" className="text-xs">
                                                        {trackAssignmentCountPerReviewer[reviewer.id] || 0}
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <Badge variant="outline" className="text-xs">
                                                        {totalAssignments}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {relevance !== null ? (
                                                        <span className={`font-mono text-xs font-semibold ${
                                                            relevance >= 0.7 ? "text-emerald-600" :
                                                            relevance >= 0.4 ? "text-indigo-600" : "text-gray-500"
                                                        }`}>
                                                            {(relevance * 100).toFixed(0)}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {isAssigned ? (
                                                        (() => {
                                                            const reviewInfo = reviewStatusMap[reviewer.id]
                                                            const status = reviewInfo?.status || 'ASSIGNED'
                                                            return (
                                                                <Badge className={`text-xs ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
                                                                    {STATUS_LABELS[status] || status}
                                                                </Badge>
                                                            )
                                                        })()
                                                    ) : isConflict ? (
                                                        <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                                            Blocked
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                    {isAssigned ? (
                                                        <>
                                                            {reviewStatusMap[reviewer.id] && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                                                                    onClick={() => onViewReview(reviewStatusMap[reviewer.id].reviewId)}
                                                                    title="View review details"
                                                                    aria-label="View review details"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                onClick={() => onRemove(assignmentForPaper?.reviewId)}
                                                                title="Remove assignment"
                                                                aria-label="Remove assignment"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : isConflict ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            disabled
                                                            title="Cannot assign — conflict exists"
                                                            aria-label="Cannot assign due to conflict"
                                                        >
                                                            <X className="h-4 w-4 text-gray-300" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-green-500 hover:text-green-700 hover:bg-green-50"
                                                            onClick={() => onAssign(reviewer.id)}
                                                            disabled={assigning}
                                                            title="Assign reviewer"
                                                            aria-label="Assign reviewer"
                                                        >
                                                            {assigning ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Plus className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
