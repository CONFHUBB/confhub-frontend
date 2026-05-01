import http from '@/lib/http'
import type {
    CreateConferenceRequest,
    UpdateConferenceRequest,
    ConferenceResponse,
    CreateTrackRequest,
    UpdateTrackRequest,
    TrackResponse,
    ConferenceListResponse,
    ConferenceActivityDTO,
    ActivityAuditLogDTO
} from '@/types/conference'

export const createConference = async (body: CreateConferenceRequest): Promise<ConferenceResponse> => {
    const response = await http.post<ConferenceResponse>('/conferences', body)
    return response.data
}

export const updateConference = async (id: number, body: UpdateConferenceRequest): Promise<ConferenceResponse> => {
    const response = await http.put<ConferenceResponse>(`/conferences/${id}`, body)
    return response.data
}

export const createTrack = async (body: CreateTrackRequest): Promise<TrackResponse> => {
    const response = await http.post<TrackResponse>('/conferences-track', body)
    return response.data
}

export const updateTrack = async (id: number, body: UpdateTrackRequest): Promise<TrackResponse> => {
    const response = await http.put<TrackResponse>(`/conferences-track/${id}`, body)
    return response.data
}

export const deleteTrack = async (id: number): Promise<void> => {
    await http.delete(`/conferences-track/${id}`)
}

export const getConference = async (id: number): Promise<ConferenceResponse> => {
    const response = await http.get<ConferenceResponse>(`/conferences/${id}`)
    return response.data
}

export const getConferences = async (): Promise<ConferenceListResponse[]> => {
    const response = await http.get<{ content: ConferenceListResponse[] }>('/conferences?page=0&size=100')
    return response.data.content
}

export const getChairedConferences = async (userId: number, page = 0, size = 20): Promise<{ content: ConferenceListResponse[], totalElements: number }> => {
    const response = await http.get<{ content: ConferenceListResponse[], totalElements: number }>(
        `/conference-user-tracks/users/${userId}/organized-conferences?page=${page}&size=${size}`
    )
    return response.data
}

export const getProgramConferences = async (userId: number, page = 0, size = 20): Promise<{ content: ConferenceListResponse[], totalElements: number }> => {
    const response = await http.get<{ content: ConferenceListResponse[], totalElements: number }>(
        `/conference-user-tracks/users/${userId}/chaired-conferences?page=${page}&size=${size}`
    )
    return response.data
}

export const approveConference = async (id: number): Promise<any> => {
    const response = await http.put(`/conferences/${id}/approve-conference`)
    return response.data
}

export const getConferenceActivities = async (conferenceId: number): Promise<ConferenceActivityDTO[]> => {
    const response = await http.get<ConferenceActivityDTO[]>(`/conferences/${conferenceId}/activities`)
    return response.data
}

export const getUpcomingConferenceActivities = async (
    conferenceIds: number[],
): Promise<Record<number, ConferenceActivityDTO>> => {
    if (conferenceIds.length === 0) return {}
    const response = await http.get<Record<number, ConferenceActivityDTO>>(
        '/conferences/activities/upcoming-deadlines',
        {
            params: {
                conferenceIds: conferenceIds.join(','),
            },
        }
    )
    return response.data
}

export const updateConferenceActivities = async (conferenceId: number, body: ConferenceActivityDTO[]): Promise<ConferenceActivityDTO[]> => {
    const response = await http.put<ConferenceActivityDTO[]>(`/conferences/${conferenceId}/activities`, body)
    return response.data
}

export const getActivityAuditLogs = async (conferenceId: number): Promise<ActivityAuditLogDTO[]> => {
    const response = await http.get<ActivityAuditLogDTO[]>(`/conferences/${conferenceId}/activities/audit-logs`)
    return response.data
}

export const completeConference = async (id: number): Promise<any> => {
    const response = await http.put(`/conferences/${id}/complete`)
    return response.data
}

export const cancelConference = async (id: number): Promise<any> => {
    const response = await http.put(`/conferences/${id}/cancel`)
    return response.data
}

export const submitForApproval = async (id: number): Promise<any> => {
    const response = await http.put(`/conferences/${id}/submit-for-approval`)
    return response.data
}

export const rejectConference = async (id: number, reason: string): Promise<any> => {
    const response = await http.put(`/conferences/${id}/reject`, { reason })
    return response.data
}

export const selectSubscriptionPlan = async (id: number, plan: string): Promise<any> => {
    const response = await http.put(`/conferences/${id}/select-plan`, { plan })
    return response.data
}

export const uploadBannerImage = async (conferenceId: number, file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('file', file)
    const response = await http.post<{ url: string }>(`/conferences/${conferenceId}/upload-banner`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data.url
}

export const uploadPaperTemplateFile = async (conferenceId: number, file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('file', file)
    const response = await http.post<{ url: string }>(`/conferences/${conferenceId}/upload-paper-template`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data.url
}
// ── Data Import ──

export interface ImportError {
    sheet: string; row: number; column: string; message: string
}

export interface ImportResult {
    success: boolean
    conferenceId?: number
    conferenceName?: string
    tracksCreated: number
    subjectAreasCreated: number
    membersCreated: number
    ticketTypesCreated?: number
    reviewQuestionsCreated?: number
    errors: ImportError[]
    conferencePreview?: Record<string, string>
    trackPreviews?: Record<string, string>[]
    subjectAreaPreviews?: Record<string, string>[]
    memberPreviews?: Record<string, string>[]
    ticketTypePreview?: Record<string, string>
    ticketTypePreviews?: Record<string, string>[]
    reviewQuestionPreviews?: Record<string, string>[]
}

const uploadFile = (url: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return http.post<ImportResult>(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
}

const downloadBlob = async (url: string): Promise<Blob> => {
    const response = await http.get(url, { responseType: 'blob' })
    return new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// Conference
export const downloadConferenceTemplate = () => downloadBlob('/conferences/import/template')
export const previewConferenceImport = (file: File) => uploadFile('/conferences/import/preview', file).then(r => r.data)
export const importConference = (file: File) => uploadFile('/conferences/import', file).then(r => r.data)

// Tracks
export const downloadTrackTemplate = (conferenceId: number) => downloadBlob(`/conferences/${conferenceId}/tracks/import/template`)
export const previewTrackImport = (conferenceId: number, file: File) => uploadFile(`/conferences/${conferenceId}/tracks/import/preview`, file).then(r => r.data)
export const importTracks = (conferenceId: number, file: File) => uploadFile(`/conferences/${conferenceId}/tracks/import`, file).then(r => r.data)

// Subject Areas
export const downloadSubjectAreaTemplate = (conferenceId: number) => downloadBlob(`/conferences/${conferenceId}/subject-areas/import/template`)
export const previewSubjectAreaImport = (conferenceId: number, file: File) => uploadFile(`/conferences/${conferenceId}/subject-areas/import/preview`, file).then(r => r.data)
export const importSubjectAreas = (conferenceId: number, file: File) => uploadFile(`/conferences/${conferenceId}/subject-areas/import`, file).then(r => r.data)

// Members
export const downloadMemberTemplate = (conferenceId: number) => downloadBlob(`/conferences/${conferenceId}/members/import/template`)
export const previewMemberImport = (conferenceId: number, file: File) => uploadFile(`/conferences/${conferenceId}/members/import/preview`, file).then(r => r.data)
export const importMembers = (conferenceId: number, file: File) => uploadFile(`/conferences/${conferenceId}/members/import`, file).then(r => r.data)

// ── Conference Stats ──
export interface ConferenceStatsResponse {
    totalPapers: number
    submitted: number
    underReview: number
    accepted: number
    rejected: number
    totalReviews: number
    completedReviews: number
    totalRegistrations: number
    checkedIn: number
    acceptanceRate: number
    reviewCompletionRate: number
}

export const getConferenceStats = async (conferenceId: number): Promise<ConferenceStatsResponse> => {
    const response = await http.get<ConferenceStatsResponse>(`/conferences/${conferenceId}/stats`)
    return response.data
}

// ── Export Attendees CSV ──
export const exportAttendeesCsv = async (conferenceId: number): Promise<Blob> => {
    const response = await http.get(`/conferences/${conferenceId}/export/attendees`, { responseType: 'blob' })
    return new Blob([response.data], { type: 'text/csv' })
}
