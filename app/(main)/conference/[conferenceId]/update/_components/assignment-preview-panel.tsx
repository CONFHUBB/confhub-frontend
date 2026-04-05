"use client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Check, X } from "lucide-react"
import { UserLink } from '@/components/shared/user-link'
import type { AssignmentPreview } from "@/app/api/assignment.api"

interface AssignmentPreviewPanelProps {
    previewData: AssignmentPreview
    confirming: boolean
    onConfirm: () => void
    onCancel: () => void
}

export function AssignmentPreviewPanel({
    previewData,
    confirming,
    onConfirm,
    onCancel,
}: AssignmentPreviewPanelProps) {
    return (
        <Card className="border-emerald-200 bg-emerald-50/30">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Check className="h-5 w-5 text-emerald-600" />
                    Auto-Assign Results Preview
                </CardTitle>
                <CardDescription>
                    Review and confirm before saving to the system
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg border p-3 text-center bg-white">
                        <p className="text-2xl font-bold text-emerald-600">{previewData.totalAssignments}</p>
                        <p className="text-xs text-muted-foreground">New Assignments</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center bg-white">
                        <p className="text-2xl font-bold">{previewData.totalPapers}</p>
                        <p className="text-xs text-muted-foreground">Papers</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center bg-white">
                        <p className="text-2xl font-bold text-amber-600">{previewData.unassignedPapers}</p>
                        <p className="text-xs text-muted-foreground">Insufficient Reviewers</p>
                    </div>
                </div>

                {previewData.assignments.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto rounded-lg border bg-white divide-y">
                        {previewData.assignments.map((a, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{a.paperTitle}</p>
                                    <p className="text-xs text-muted-foreground">
                                        → <UserLink userId={a.reviewerId} name={a.reviewerName} className="text-xs font-medium" /> ({a.reviewerEmail})
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-xs shrink-0 ml-4">
                                    <span title="Combined Score" className="font-mono font-semibold">
                                        {(a.score * 100).toFixed(0)}%
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                        Bid: {(a.bidScore * 100).toFixed(0)}%
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                        SA: {(a.relevanceScore * 100).toFixed(0)}%
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center py-4 text-muted-foreground">
                        No suitable assignments found. Try adjusting the parameters.
                    </p>
                )}

                <div className="flex gap-3 mt-4">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onCancel}
                    >
                        <X className="h-4 w-4 mr-1" />
                        Cancel & Reconfigure
                    </Button>
                    <Button
                        className="flex-1 gap-2"
                        disabled={confirming || previewData.assignments.length === 0}
                        onClick={onConfirm}
                    >
                        {confirming ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}
                        {confirming ? "Saving..." : `Confirm ${previewData.assignments.length} Assignments`}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
