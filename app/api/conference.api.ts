import http from '@/lib/http'
import type { 
    CreateConferenceRequest, 
    UpdateConferenceRequest,
    ConferenceResponse, 
    CreateTrackRequest, 
    UpdateTrackRequest,
    TrackResponse, 
    ConferenceListResponse,
    ConferenceActivityDTO
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

export const getConference = async (id: number): Promise<ConferenceResponse> => {
    const response = await http.get<ConferenceResponse>(`/conferences/${id}`)
    return response.data
}

export const getConferences = async (): Promise<ConferenceListResponse[]> => {
    const response = await http.get<{ content: ConferenceListResponse[] }>('/conferences')
    return response.data.content
}

export const getChairedConferences = async (userId: number, page = 0, size = 20): Promise<{ content: ConferenceListResponse[], totalElements: number }> => {
    const response = await http.get<{ content: ConferenceListResponse[], totalElements: number }>(
        `/conference-user-tracks/users/${userId}/organized-conferences?page=${page}&size=${size}`
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

export const updateConferenceActivities = async (conferenceId: number, body: ConferenceActivityDTO[]): Promise<ConferenceActivityDTO[]> => {
    const response = await http.put<ConferenceActivityDTO[]>(`/conferences/${conferenceId}/activities`, body)
    return response.data
}