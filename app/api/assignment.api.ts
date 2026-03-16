import http from '@/lib/http'

// ==================== Types ====================

export interface AutoAssignConfig {
    conferenceId: number
    minReviewersPerPaper: number
    maxPapersPerReviewer: number
    bidWeight?: number
    relevanceWeight?: number
    loadBalancing?: boolean
}

export interface AssignmentPreviewItem {
    reviewId?: number       // Review entity ID (for remove)
    paperId: number
    paperTitle: string
    reviewerId: number
    reviewerName: string
    reviewerEmail: string
    score: number
    bidScore: number
    relevanceScore: number
}

export interface AssignmentPreview {
    conferenceId: number
    totalPapers: number
    totalReviewers: number
    totalAssignments: number
    unassignedPapers: number
    overloadedReviewers: number
    assignments: AssignmentPreviewItem[]
    reviewersPerPaper: Record<number, number>
    papersPerReviewer: Record<number, number>
}

// ==================== API Functions ====================

export const runAutoAssign = async (config: AutoAssignConfig): Promise<AssignmentPreview> => {
    const response = await http.post<AssignmentPreview>(
        `/conferences/${config.conferenceId}/assignments/auto-assign`,
        config
    )
    return response.data
}

export const confirmAssignments = async (
    conferenceId: number,
    assignments: AssignmentPreviewItem[]
): Promise<AssignmentPreviewItem[]> => {
    const response = await http.post<AssignmentPreviewItem[]>(
        `/conferences/${conferenceId}/assignments/confirm`,
        assignments
    )
    return response.data
}

export const getCurrentAssignments = async (conferenceId: number): Promise<AssignmentPreview> => {
    const response = await http.get<AssignmentPreview>(
        `/conferences/${conferenceId}/assignments`
    )
    return response.data
}

export const manualAssign = async (
    conferenceId: number,
    paperId: number,
    reviewerId: number
): Promise<AssignmentPreviewItem> => {
    const response = await http.post<AssignmentPreviewItem>(
        `/conferences/${conferenceId}/assignments/manual?paperId=${paperId}&reviewerId=${reviewerId}`
    )
    return response.data
}

export const removeAssignment = async (
    conferenceId: number,
    reviewId: number
): Promise<void> => {
    await http.delete(`/conferences/${conferenceId}/assignments/${reviewId}`)
}
