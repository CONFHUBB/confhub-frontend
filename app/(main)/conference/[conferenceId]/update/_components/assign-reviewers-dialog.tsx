"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Search, Plus, Trash2, AlertTriangle, UserPlus } from "lucide-react"
import type { AssignmentPreviewItem } from "@/app/api/assignment.api"
import type { PaperResponse } from "@/types/paper"
import type { ReviewStatus } from "@/types/review"

interface SimpleReviewer {
    id: number
    name: string
    email: string
    quota: number | null
    trackIds: number[]
}

interface AssignReviewersDialogProps {
    dialogPaperId: number | null
    dialogPaper: PaperResponse | undefined
    dialogSortedReviewers: SimpleReviewer[]
    dialogPaperAssignments: AssignmentPreviewItem[]
    dialogAssignedIds: Set<number>
    dialogConflictIds: Set<number>
    dialogBidMap: Record<number, string>
    dialogReviewStatus: Record<number, { status: ReviewStatus; reviewId: number }>
    dialogLoading: boolean
    dialogReviewerSearch: string
    dialogAssigning: number | null
    assignmentCountPerReviewer: Record<number, number>
    paperAuthors: Record<number, string>
    subjectAreaMap: Record<number, string>
    minReviewers: number
    onDialogReviewerSearchChange: (val: string) => void
    onDialogAssign: (reviewerId: number) => void
    onDialogRemove: (reviewId: number | undefined) => void
    onClose: () => void
}

const BID_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    EAGER: { label: 'Eager', color: 'text-emerald-700', bg: 'bg-emerald-100' },
    WILLING: { label: 'Willing', color: 'text-indigo-700', bg: 'bg-indigo-100' },
    IN_A_PINCH: { label: 'In a pinch', color: 'text-amber-700', bg: 'bg-amber-100' },
    NOT_WILLING: { label: 'Not willing', color: 'text-red-700', bg: 'bg-red-100' },
}

const STATUS_LABELS: Record<string, string> = { ASSIGNED: 'Pending', IN_PROGRESS: 'In Progress', COMPLETED: 'Reviewed', DECLINED: 'Declined' }
const STATUS_COLORS: Record<string, string> = { ASSIGNED: 'bg-gray-100 text-gray-600', IN_PROGRESS: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-emerald-100 text-emerald-700', DECLINED: 'bg-red-100 text-red-700' }

export function AssignReviewersDialog({
    dialogPaperId,
    dialogPaper,
    dialogSortedReviewers,
    dialogPaperAssignments,
    dialogAssignedIds,
    dialogConflictIds,
    dialogBidMap,
    dialogReviewStatus,
    dialogLoading,
    dialogReviewerSearch,
    dialogAssigning,
    assignmentCountPerReviewer,
    paperAuthors,
    subjectAreaMap,
    minReviewers,
    onDialogReviewerSearchChange,
    onDialogAssign,
    onDialogRemove,
    onClose,
}: AssignReviewersDialogProps) {
    return (
        <Dialog open={dialogPaperId !== null} onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b space-y-3 shrink-0">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-indigo-600" />
                            Assign Reviewers
                        </DialogTitle>
                    </DialogHeader>
                    {dialogPaper && (
                        <div className="rounded-lg bg-indigo-50/60 border border-indigo-200 px-4 py-3">
                            <p className="font-semibold text-sm line-clamp-2">#{dialogPaper.id}: {dialogPaper.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Authors: {paperAuthors[dialogPaper.id] || '—'} · Subject: {subjectAreaMap[dialogPaper.primarySubjectAreaId] || '—'} · Assigned: <strong>{dialogPaperAssignments.length}</strong>/{minReviewers}
                            </p>
                        </div>
                    )}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-9 h-9 text-sm"
                            placeholder="Search reviewers by name or email..."
                            value={dialogReviewerSearch}
                            onChange={e => onDialogReviewerSearchChange(e.target.value)}
                        />
                    </div>
                </div>

                {/* Reviewer List */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {dialogLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                    ) : dialogSortedReviewers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No reviewers found.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {dialogSortedReviewers.map(r => {
                                const isAssigned = dialogAssignedIds.has(r.id)
                                const isConflict = dialogConflictIds.has(r.id)
                                const bid = dialogBidMap[r.id]
                                const assignment = dialogPaperAssignments.find(a => a.reviewerId === r.id)
                                const revStatus = dialogReviewStatus[r.id]
                                const workload = assignmentCountPerReviewer[r.id] || 0

                                const bidInfo = bid ? BID_LABELS[bid] : null
                                const st = revStatus?.status || 'ASSIGNED'

                                return (
                                    <div
                                        key={r.id}
                                        className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors ${
                                            isAssigned
                                                ? 'bg-emerald-50/50 border-emerald-200'
                                                : isConflict
                                                    ? 'bg-red-50/30 border-red-200 opacity-60'
                                                    : 'bg-white hover:bg-gray-50 border-gray-200'
                                        }`}
                                    >
                                        {/* Left: Reviewer info */}
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                                isAssigned ? 'bg-emerald-200 text-emerald-800 border border-emerald-300' : 'bg-gray-100 text-gray-600 border'
                                            }`}>
                                                {r.name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium truncate">{r.name}</span>
                                                    {isConflict && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">CONFLICT</span>
                                                    )}
                                                    {isAssigned && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${STATUS_COLORS[st]}`}>
                                                            {STATUS_LABELS[st] || st}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                                    <span className="truncate max-w-[180px]">{r.email}</span>
                                                    <span className="shrink-0">Load: {workload}{r.quota !== null ? `/${r.quota}` : ''}</span>
                                                    {isAssigned && assignment && (
                                                        <span className="shrink-0">Relevance: <strong>{(assignment.relevanceScore * 100).toFixed(0)}%</strong></span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Bid + Action */}
                                        <div className="flex items-center gap-2 shrink-0 ml-3">
                                            {bidInfo ? (
                                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${bidInfo.color} ${bidInfo.bg}`}>
                                                    {bidInfo.label}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] px-2 py-0.5 rounded-full text-gray-400 bg-gray-50">No bid</span>
                                            )}

                                            {isConflict ? (
                                                <Button variant="ghost" size="sm" disabled className="h-7 text-xs opacity-40" title="Conflict">
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                </Button>
                                            ) : isAssigned ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs gap-1 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                                    onClick={() => onDialogRemove(assignment?.reviewId)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                    Remove
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    onClick={() => onDialogAssign(r.id)}
                                                    disabled={dialogAssigning === r.id}
                                                >
                                                    {dialogAssigning === r.id ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Plus className="h-3 w-3" />
                                                    )}
                                                    Assign
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between shrink-0">
                    <p className="text-xs text-muted-foreground">
                        {dialogSortedReviewers.length} reviewer(s) · {dialogPaperAssignments.length} assigned · Sorted by bid → workload
                    </p>
                    <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
