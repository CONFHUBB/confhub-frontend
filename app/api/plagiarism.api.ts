import http from '@/lib/http'

export interface PlagiarismMatch {
    paperId: number
    title: string
    similarity: number
    matchedSnippet?: string
}

export interface WebSearchMatch {
    url: string
    title: string
    snippet: string
    similarity: number
}

export interface FlaggedSection {
    text: string
    reason: string
    source: string
    confidence: number
}

export interface PlagiarismExternalAnalysis {
    score: number
    summary: string
    flaggedSections: FlaggedSection[]
}

export interface PlagiarismDetails {
    internalScore: number
    externalScore: number
    webSearchScore: number
    finalScore: number
    internalMatches: PlagiarismMatch[]
    webSearchMatches: WebSearchMatch[]
    externalAnalysis: PlagiarismExternalAnalysis
    checkedAt: string
}

export interface PlagiarismResult {
    paperId: number
    score: number | null
    status: 'PENDING' | 'CHECKING' | 'COMPLETED' | 'FAILED' | null
    details: PlagiarismDetails | null
}

export const getPlagiarismResult = async (paperId: number): Promise<PlagiarismResult> => {
    const response = await http.get<PlagiarismResult>(`/plagiarism/paper/${paperId}`)
    return response.data
}

export const recheckPlagiarism = async (paperId: number): Promise<PlagiarismResult> => {
    const response = await http.post<PlagiarismResult>(`/plagiarism/paper/${paperId}/recheck`)
    return response.data
}
