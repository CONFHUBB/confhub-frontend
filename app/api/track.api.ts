import http from '@/lib/http'
import { TopicResponse } from '@/types/topic'
import { TrackResponse, TrackReviewSetting, ReviewQuestionDTO } from '@/types/track'

export const getTracks = async (): Promise<TrackResponse[]> => {
    const response = await http.get<any>('/conferences-track')
    if (Array.isArray(response.data)) {
        return response.data
    }
    return response.data.content || []
}

export const getTracksByConference = async (conferenceId: number): Promise<TrackResponse[]> => {
    const response = await http.get<any>(`/conferences-track/conferenceId/${conferenceId}`)
    if (Array.isArray(response.data)) {
        return response.data
    }
    return response.data.content || []
}

export const getTrack = async (id: number): Promise<TrackResponse> => {
    const response = await http.get<TrackResponse>(`/conferences-track/${id}`)
    return response.data
}

export const getTopicsByTrack = async (trackId: number): Promise<TopicResponse[]> => {
    const response = await http.get<any>(`/conference-track-topics/track/${trackId}`)
    // Smartly handle both flat array and Spring Data paginated { content: [] } structures
    if (Array.isArray(response.data)) {
        return response.data
    }
    return response.data.content || []
}

// ── Track Review Settings ──

export const getTrackReviewSettings = async (trackId: number): Promise<TrackReviewSetting> => {
    const response = await http.get<TrackReviewSetting>(`/tracks/${trackId}/review-settings`)
    return response.data
}

export const updateTrackReviewSettings = async (
    trackId: number,
    data: Partial<TrackReviewSetting>
): Promise<TrackReviewSetting> => {
    const response = await http.put<TrackReviewSetting>(`/tracks/${trackId}/review-settings`, data)
    return response.data
}

export const copyTrackReviewSettings = async (
    trackId: number,
    sourceTrackId: number
): Promise<TrackReviewSetting> => {
    const response = await http.post<TrackReviewSetting>(
        `/tracks/${trackId}/review-settings/copy?sourceTrackId=${sourceTrackId}`
    )
    return response.data
}

// ── Track Review Questions ──

export const getTrackReviewQuestions = async (trackId: number): Promise<ReviewQuestionDTO[]> => {
    const response = await http.get<ReviewQuestionDTO[]>(`/tracks/${trackId}/review-questions`)
    return response.data
}

export const createTrackReviewQuestion = async (trackId: number, data: ReviewQuestionDTO): Promise<ReviewQuestionDTO> => {
    const response = await http.post<ReviewQuestionDTO>(`/tracks/${trackId}/review-questions`, data)
    return response.data
}

export const updateTrackReviewQuestion = async (
    trackId: number,
    questionId: number,
    data: ReviewQuestionDTO
): Promise<ReviewQuestionDTO> => {
    const response = await http.put<ReviewQuestionDTO>(`/tracks/${trackId}/review-questions/${questionId}`, data)
    return response.data
}

export const deleteTrackReviewQuestion = async (trackId: number, questionId: number): Promise<void> => {
    await http.delete(`/tracks/${trackId}/review-questions/${questionId}`)
}

export const reorderTrackReviewQuestions = async (trackId: number, questionIds: number[]): Promise<void> => {
    await http.put(`/tracks/${trackId}/review-questions/reorder`, questionIds)
}

export const copyTrackReviewQuestions = async (trackId: number, targetTrackId: number): Promise<void> => {
    await http.post(`/tracks/${trackId}/review-questions/copy/${targetTrackId}`)
}
