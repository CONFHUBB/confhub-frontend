'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentAssignments, type AssignmentPreviewItem } from '@/app/api/assignment.api'
import { ExternalLink, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface AssignmentsTabProps {
    paperId: number
    conferenceId: number
}

export function AssignmentsTab({ paperId, conferenceId }: AssignmentsTabProps) {
    const router = useRouter()
    const [assignments, setAssignments] = useState<AssignmentPreviewItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            const assignData = await getCurrentAssignments(conferenceId).catch(() => null)
            const paperAssignments = (assignData?.assignments || []).filter((a: AssignmentPreviewItem) => a.paperId === paperId)
            setAssignments(paperAssignments)
            setLoading(false)
        }
        fetch()
    }, [paperId, conferenceId])

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

    return (
        <div className="max-w-3xl space-y-6">
            {/* Context Banner */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 flex items-start gap-4 shadow-sm">
                <div className="p-2 bg-indigo-100 rounded-lg shrink-0">
                    <ExternalLink className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-indigo-900 mb-1">Centralized Assignment Matrix</h3>
                    <p className="text-xs text-indigo-700/80 mb-3 max-w-xl">
                        Reviewer assignments are managed globally to ensure balanced workloads and proper conflict resolution across all papers.
                    </p>
                    <Button 
                        size="sm" 
                        className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                        onClick={() => router.push(`/conference/${conferenceId}/update?tab=features-review-management`)}
                    >
                        Manage Assignments in Settings <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Current Assignments (Read-Only) */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    Current Reviewers 
                    <Badge variant="secondary" className="font-mono text-[10px]">{assignments.length}</Badge>
                </h3>
                
                {assignments.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                        <p className="text-sm text-muted-foreground font-medium">No reviewers assigned yet</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[40%] font-semibold text-slate-700">Reviewer Name</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Email Address</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignments.map((a: AssignmentPreviewItem) => (
                                    <TableRow key={a.reviewerId} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="font-medium text-slate-900">{a.reviewerName}</TableCell>
                                        <TableCell className="text-slate-600">{a.reviewerEmail}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    )
}
