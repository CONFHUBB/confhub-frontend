"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Users, Eye } from "lucide-react"
import { UserLink } from "@/components/shared/user-link"
import type { ReviewStatus } from "@/types/review"

export interface DetailReviewerInfo {
    reviewerId: number
    reviewerName: string
    reviewId: number | undefined
    status: ReviewStatus | null
    relevanceScore: number
    bidScore: number
    totalScore: number | null
}

interface AssignmentDetailSheetProps {
    paperId: number | null
    paperTitle: string | undefined
    paperAuthors: string | undefined
    detailReviewers: DetailReviewerInfo[]
    loading: boolean
    onClose: () => void
    onViewReview: (reviewId: number) => void
}

const STATUS_LABELS: Record<string, string> = {
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    DECLINED: 'Declined',
}

const STATUS_COLORS: Record<string, string> = {
    ASSIGNED: 'bg-gray-100 text-gray-700 border-gray-300',
    IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-300',
    COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    DECLINED: 'bg-red-100 text-red-700 border-red-300',
}

export function AssignmentDetailSheet({
    paperId, paperTitle, paperAuthors,
    detailReviewers, loading,
    onClose, onViewReview,
}: AssignmentDetailSheetProps) {
    return (
        <Sheet open={paperId !== null} onOpenChange={v => !v && onClose()}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
                <SheetHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-white z-10">
                    <SheetTitle className="text-lg">
                        #{paperId} — Assignment Details
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {paperTitle}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="text-muted-foreground">
                            Authors: <strong>{paperAuthors || "—"}</strong>
                        </span>
                    </div>
                </SheetHeader>

                <div className="p-6 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : detailReviewers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            <p className="text-sm">No reviewers assigned to this paper yet.</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-lg border p-3 text-center">
                                    <p className="text-lg font-bold">{detailReviewers.length}</p>
                                    <p className="text-[10px] text-muted-foreground">Total Assigned</p>
                                </div>
                                <div className="rounded-lg border p-3 text-center bg-indigo-50 border-indigo-200">
                                    <p className="text-lg font-bold text-indigo-600">
                                        {detailReviewers.filter(r => r.status === 'COMPLETED').length}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">Completed</p>
                                </div>
                                <div className="rounded-lg border p-3 text-center bg-amber-50 border-amber-200">
                                    <p className="text-lg font-bold text-amber-600">
                                        {detailReviewers.filter(r => r.status !== 'COMPLETED').length}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">Pending</p>
                                </div>
                            </div>

                            {/* Reviewer list */}
                            <div className="space-y-2">
                                {detailReviewers.map((r, i) => {
                                    const status = r.status || 'ASSIGNED'
                                    return (
                                        <div
                                            key={r.reviewerId}
                                            className="rounded-lg border p-3 bg-white hover:shadow-sm transition-shadow"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}.</span>
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 border flex items-center justify-center text-xs font-bold text-gray-600">
                                                        {r.reviewerName?.charAt(0)?.toUpperCase() || "?"}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium"><UserLink userId={r.reviewerId} name={r.reviewerName || `Reviewer #${r.reviewerId}`} className="text-sm font-medium" /></p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Badge className={`text-[10px] ${STATUS_COLORS[status]}`}>
                                                                {STATUS_LABELS[status] || status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {r.totalScore !== null && (
                                                        <span className={`text-sm font-mono font-semibold ${
                                                            r.totalScore >= 3.5 ? 'text-emerald-600' :
                                                            r.totalScore >= 2 ? 'text-indigo-600' : 'text-red-600'
                                                        }`}>
                                                            {r.totalScore.toFixed(1)}
                                                        </span>
                                                    )}
                                                    {r.reviewId && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 text-indigo-500 hover:text-indigo-700"
                                                            onClick={() => onViewReview(r.reviewId!)}
                                                            title="View review"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Scores */}
                                            <div className="flex items-center gap-3 mt-2 ml-11">
                                                <span className="text-[11px] text-muted-foreground">
                                                    Relevance: <strong>{(r.relevanceScore * 100).toFixed(0)}%</strong>
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    Bid: <strong>{(r.bidScore * 100).toFixed(0)}%</strong>
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
