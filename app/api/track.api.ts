import http from '@/lib/http'
import { SubjectAreaResponse } from '@/types/subject-area'
import { TrackResponse, TrackReviewSetting, ReviewQuestionDTO } from '@/types/track'
import type { ImportResult } from '@/app/api/conference.api'

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

export const getSubjectAreasByTrack = async (trackId: number): Promise<SubjectAreaResponse[]> => {
    const response = await http.get<any>(`/subject-areas/track/${trackId}`)
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

// ── Review Question Import ──

const uploadReviewQuestionFile = (url: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return http.post<ImportResult>(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
}

const downloadReviewQuestionBlob = async (url: string): Promise<Blob> => {
    const response = await http.get(url, { responseType: 'blob' })
    return new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export const downloadReviewQuestionTemplate = (trackId: number) => downloadReviewQuestionBlob(`/tracks/${trackId}/review-questions/import/template`)
export const previewReviewQuestionImport = (trackId: number, file: File) => uploadReviewQuestionFile(`/tracks/${trackId}/review-questions/import/preview`, file).then(r => r.data)
export const importReviewQuestions = (trackId: number, file: File) => uploadReviewQuestionFile(`/tracks/${trackId}/review-questions/import`, file).then(r => r.data)
