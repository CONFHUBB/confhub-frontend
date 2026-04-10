// ── Bidding Types ──

export type BidValue = "EAGER" | "WILLING" | "IN_A_PINCH" | "NOT_WILLING"

export interface BiddingRequest {
    paperId: number
    reviewerId: number
    bidValue: BidValue
}

export interface BiddingResponse {
    id: number
    paperId: number
    paperTitle: string
    reviewerId: number
    reviewerName: string
    bidValue: BidValue
    createdAt: string
    updatedAt: string
}

export interface PaperForBidding {
    paperId: number
    title: string
    abstractText: string | null   // abstract of the paper (always provided for bidding)
    primarySubjectArea: string
    secondarySubjectAreas: string[]
    keywords: string[]
    trackName: string
    relevanceScore: number        // 0.0 - 1.0
    currentBid: BidValue | null   // null = no bid yet
    isDoubleBlind: boolean
    authorNames: string[]
}

export interface BidsSummary {
    reviewerId: number
    conferenceId: number
    bidCounts: Record<string, number>
    totalBids: number
    totalPapers: number
}
