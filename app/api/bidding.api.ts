import http from '@/lib/http'
import type { BiddingRequest, BiddingResponse, PaperForBidding, BidsSummary } from '@/types/bidding'

// Get papers list for reviewer bidding
export const getPapersForBidding = async (reviewerId: number, conferenceId: number): Promise<PaperForBidding[]> => {
    const response = await http.get<PaperForBidding[]>('/bidding/papers-for-bidding', {
        params: { reviewerId, conferenceId }
    })
    return response.data
}

// Submit or update a bid
export const submitBid = async (dto: BiddingRequest): Promise<BiddingResponse> => {
    const response = await http.post<BiddingResponse>('/bidding', dto)
    return response.data
}

// Get bids summary for a reviewer
export const getBidsSummary = async (reviewerId: number, conferenceId: number): Promise<BidsSummary> => {
    const response = await http.get<BidsSummary>(`/bidding/summary/${reviewerId}/conference/${conferenceId}`)
    return response.data
}

// Get bids by reviewer in a conference
export const getBidsByReviewerAndConference = async (reviewerId: number, conferenceId: number): Promise<BiddingResponse[]> => {
    const response = await http.get<BiddingResponse[]>(`/bidding/reviewer/${reviewerId}/conference/${conferenceId}`)
    return response.data
}

// Get bids for a paper (used by Chair)
export const getBidsByPaper = async (paperId: number): Promise<BiddingResponse[]> => {
    const response = await http.get<BiddingResponse[]>(`/bidding/paper/${paperId}`)
    return response.data
}

// Delete a bid
export const deleteBid = async (id: number): Promise<void> => {
    await http.delete(`/bidding/${id}`)
}
