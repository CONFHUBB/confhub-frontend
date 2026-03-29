import http from '@/lib/http'

// ── Session Bookmarks ──

export const getBookmarks = async (conferenceId: number): Promise<string[]> => {
    const res = await http.get<string[]>(`/session-bookmarks/${conferenceId}`)
    return res.data
}

export const addBookmark = async (conferenceId: number, sessionId: string): Promise<void> => {
    await http.post(`/session-bookmarks/${conferenceId}/${sessionId}`)
}

export const removeBookmark = async (conferenceId: number, sessionId: string): Promise<void> => {
    await http.delete(`/session-bookmarks/${conferenceId}/${sessionId}`)
}

export const clearBookmarks = async (conferenceId: number): Promise<void> => {
    await http.delete(`/session-bookmarks/${conferenceId}`)
}

// ── Session Ratings ──

export interface SessionRatingRequest {
    sessionId: string
    conferenceId: number
    rating: number
    comment?: string
}

export interface SessionRatingResponse {
    id?: number
    sessionId: string
    conferenceId?: number
    userId?: number
    userName?: string
    rating?: number
    comment?: string
    createdAt?: string
    averageRating?: number | null
    ratingCount?: number
}

export const rateSession = async (body: SessionRatingRequest): Promise<SessionRatingResponse> => {
    const res = await http.post<SessionRatingResponse>(`/session-ratings`, body)
    return res.data
}

export const getSessionRatings = async (sessionId: string): Promise<SessionRatingResponse[]> => {
    const res = await http.get<SessionRatingResponse[]>(`/session-ratings/session/${sessionId}`)
    return res.data
}

export const getSessionRatingSummary = async (sessionId: string): Promise<SessionRatingResponse> => {
    const res = await http.get<SessionRatingResponse>(`/session-ratings/session/${sessionId}/summary`)
    return res.data
}

export const getMySessionRating = async (conferenceId: number, sessionId: string): Promise<SessionRatingResponse | null> => {
    try {
        const res = await http.get<SessionRatingResponse>(`/session-ratings/conference/${conferenceId}/my-rating/${sessionId}`)
        return res.data
    } catch {
        return null
    }
}
