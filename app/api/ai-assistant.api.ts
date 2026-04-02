import http from '@/lib/http'

// ═══════════════ TYPES ═══════════════

export interface SuggestKeywordsRequest {
    abstractText: string
}

export interface SuggestKeywordsResponse {
    keywords: string[]
}

export interface CheckTrackFitRequest {
    abstractText: string
    keywords?: string
    trackId: number
}

export interface TrackFitResponse {
    matchScore: number
    explanation: string
    suggestedTrack: string | null
}

export interface CheckWritingRequest {
    title?: string
    abstractText: string
}

export interface WritingSuggestion {
    original: string
    suggested: string
    reason: string
    type: 'SPELLING' | 'GRAMMAR' | 'TONE' | 'CLARITY'
}

export interface WritingCheckResponse {
    suggestions: WritingSuggestion[]
    overallAssessment: string
}

export interface PaperSummaryResponse {
    summary: string
    keyContributions: string[]
    methodology: string
}

export interface StrengthWeaknessResponse {
    strengths: string[]
    weaknesses: string[]
}

export interface ConsensusResponse {
    agreementScore: number
    recommendation: string
    agreements: string[]
    disagreements: string[]
}

// ═══════════════ AUTHOR FEATURES ═══════════════

export const suggestKeywords = async (body: SuggestKeywordsRequest): Promise<SuggestKeywordsResponse> => {
    const response = await http.post<SuggestKeywordsResponse>('/ai/assistant/suggest-keywords', body)
    return response.data
}

export const checkTrackFit = async (body: CheckTrackFitRequest): Promise<TrackFitResponse> => {
    const response = await http.post<TrackFitResponse>('/ai/assistant/check-track-fit', body)
    return response.data
}

export const checkWriting = async (body: CheckWritingRequest): Promise<WritingCheckResponse> => {
    const response = await http.post<WritingCheckResponse>('/ai/assistant/check-writing', body)
    return response.data
}

// ═══════════════ REVIEWER FEATURES ═══════════════

export const summarizePaper = async (paperId: number): Promise<PaperSummaryResponse> => {
    const response = await http.get<PaperSummaryResponse>(`/ai/assistant/paper/${paperId}/summary`)
    return response.data
}

export const analyzeStrengthsWeaknesses = async (paperId: number): Promise<StrengthWeaknessResponse> => {
    const response = await http.get<StrengthWeaknessResponse>(`/ai/assistant/paper/${paperId}/strengths-weaknesses`)
    return response.data
}

// ═══════════════ CHAIR FEATURES ═══════════════

export const analyzeReviewConsensus = async (paperId: number): Promise<ConsensusResponse> => {
    const response = await http.get<ConsensusResponse>(`/ai/assistant/paper/${paperId}/review-consensus`)
    return response.data
}
