import http from '@/lib/http'

// ==================== Types ====================

export interface AIChatRequest {
    message: string
    conferenceId?: number
    sessionId: string
}

export interface ActionSuggestion {
    label: string
    action: 'NAVIGATE' | 'CHAT' | 'UPLOAD'
    value: string
}

export interface AIChatResponse {
    reply: string
    intent: string
    sessionId: string
    suggestedActions: ActionSuggestion[]
}

export interface ConferenceMatch {
    conferenceId: number
    conferenceName: string
    acronym: string
    matchScore: number
    matchReason: string
    deadline: string
    status: string
    matchingTracks: string[]
}

export interface ManuscriptAnalysisResponse {
    summary: string
    detectedKeywords: string[]
    detectedArea: string
    recommendations: ConferenceMatch[]
}

export interface ChatHistoryItem {
    role: 'user' | 'model'
    content: string
    intent: string
    createdAt: string
}

// ==================== API Functions ====================

export const sendChatMessage = async (req: AIChatRequest): Promise<AIChatResponse> => {
    const response = await http.post<AIChatResponse>('/ai/chat', req)
    return response.data
}

export const analyzeManuscript = async (file: File, sessionId: string): Promise<ManuscriptAnalysisResponse> => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('sessionId', sessionId)
    const response = await http.post<ManuscriptAnalysisResponse>('/ai/analyze-manuscript', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
}

export const getChatHistory = async (sessionId: string): Promise<ChatHistoryItem[]> => {
    const response = await http.get<ChatHistoryItem[]>('/ai/history', {
        params: { sessionId },
    })
    return response.data
}
