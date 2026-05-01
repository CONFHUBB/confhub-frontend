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
    source?: 'scholar' | 'web'
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

// Raw API response uses detailsJson (string), we parse it into details (object)
interface PlagiarismApiResponse {
    paperId: number
    score: number | null
    status: 'PENDING' | 'CHECKING' | 'COMPLETED' | 'FAILED' | null
    detailsJson: string | null
}

function parseApiResponse(raw: PlagiarismApiResponse): PlagiarismResult {
    let details: PlagiarismDetails | null = null
    if (raw.detailsJson) {
        try {
            details = JSON.parse(raw.detailsJson)
        } catch {
            details = null
        }
    }
    return {
        paperId: raw.paperId,
        score: raw.score,
        status: raw.status,
        details,
    }
}

export const getPlagiarismResult = async (paperId: number): Promise<PlagiarismResult> => {
    const response = await http.get<PlagiarismApiResponse>(`/plagiarism/paper/${paperId}`, {
        params: { _t: Date.now() }, // cache-bust to avoid stale HTTP-cached responses
    })
    return parseApiResponse(response.data)
}

export const recheckPlagiarism = async (paperId: number): Promise<PlagiarismResult> => {
    const response = await http.post<PlagiarismApiResponse>(`/plagiarism/paper/${paperId}/recheck`)
    return parseApiResponse(response.data)
}

export const resetPlagiarism = async (paperId: number): Promise<void> => {
    await http.delete(`/plagiarism/paper/${paperId}`)
}
