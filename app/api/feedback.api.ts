import http from '@/lib/http'

export interface ConferenceFeedbackRequest {
    rating: number
    comment?: string
}

export interface ConferenceFeedbackResponse {
    id: number
    conferenceId: number
    userId: number
    userFirstName: string
    userLastName: string
    userAvatarUrl?: string
    rating: number
    comment?: string
    createdAt: string
}

export interface ConferenceFeedbackSummary {
    averageRating: number | null
    totalCount: number
    rating5: number
    rating4: number
    rating3: number
    rating2: number
    rating1: number
}

export const getConferenceFeedback = async (conferenceId: number): Promise<ConferenceFeedbackResponse[]> => {
    const response = await http.get<ConferenceFeedbackResponse[]>(`/conferences/${conferenceId}/feedback`)
    return response.data
}

export const getConferenceFeedbackSummary = async (conferenceId: number): Promise<ConferenceFeedbackSummary> => {
    const response = await http.get<ConferenceFeedbackSummary>(`/conferences/${conferenceId}/feedback/summary`)
    return response.data
}

export const getMyFeedback = async (conferenceId: number): Promise<ConferenceFeedbackResponse | null> => {
    try {
        const response = await http.get<ConferenceFeedbackResponse>(`/conferences/${conferenceId}/feedback/me`)
        return response.data
    } catch {
        return null
    }
}

export const submitFeedback = async (conferenceId: number, data: ConferenceFeedbackRequest): Promise<ConferenceFeedbackResponse> => {
    const response = await http.post<ConferenceFeedbackResponse>(`/conferences/${conferenceId}/feedback`, data)
    return response.data
}

export const deleteMyFeedback = async (conferenceId: number): Promise<void> => {
    await http.delete(`/conferences/${conferenceId}/feedback`)
}
