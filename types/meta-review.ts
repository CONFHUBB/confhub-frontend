// ── Meta-Review Types ──

export type Decision = "APPROVE" | "REJECT"

export interface MetaReviewRequest {
    paperId: number
    userId: number
    finalDecision: Decision
    reason: string
}

export interface MetaReviewResponse {
    id: number
    paper: {
        id: number
        title: string
        status: string
        trackId: number
        trackName: string
    }
    user: {
        id: number
        firstName: string
        lastName: string
        email: string
    }
    finalDecision: Decision
    reason: string
}
