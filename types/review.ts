// ── Review Types ──

export type ReviewStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "DECLINED"


// ── Review ──

export interface ReviewRequest {
    paperId: number
    reviewerId: number
    status: ReviewStatus
    totalScore?: number
}

export interface ReviewResponse {
    id: number
    paper: {
        id: number
        title: string
        abstractField: string
        keywordsJson: string
        status: string
        trackId?: number
        authorNames?: string[]
        isDoubleBlind?: boolean
    }
    reviewer: {
        id: number
        firstName: string
        lastName: string
        email: string
    }
    status: ReviewStatus
    totalScore: number | null
}

// ── Review Answer ──

export interface ReviewAnswerRequest {
    reviewId: number
    questionId: number
    answerValue?: string
    selectedChoiceId?: number
}

export interface ReviewAnswerResponse {
    id: number
    reviewId: number
    questionId: number
    questionText: string
    questionType: string
    answerValue: string | null
    selectedChoiceId: number | null
    selectedChoiceText: string | null
    createdAt: string
    updatedAt: string
}

// ── Review Versions (History) ──

export interface ReviewVersionAnswerResponse {
    id: number
    reviewVersionId: number
    questionId: number
    questionText: string
    questionType: string
    answerValue: string | null
    selectedChoiceId: number | null
    selectedChoiceText: string | null
}

export interface ReviewVersionResponse {
    id: number
    reviewId: number
    versionNumber: number
    totalScore: number
    submittedAt: string
    answers: ReviewVersionAnswerResponse[]
}

// ── Reviewer Interest ──

export interface ReviewerInterestRequest {
    reviewerId: number
    subjectAreaId: number
    isPrimary: boolean
}

export interface ReviewerInterestResponse {
    id: number
    reviewerId: number
    subjectAreaId: number
    isPrimary: boolean
}

// ── Assignment ──

export interface AutoAssignConfig {
    conferenceId: number
    minReviewersPerPaper: number
    maxPapersPerReviewer: number
    bidWeight?: number
    relevanceWeight?: number
}

export interface AssignmentPreviewItem {
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
