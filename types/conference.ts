export interface CreateConferenceRequest {
    name: string
    acronym: string
    description: string
    location: string
    startDate: string
    endDate: string
    websiteUrl: string
    area: string
    societySponsor: string
    conferenceIdNumber: string
    country: string
    province: string
    bannerImageUrl: string
    contactInformation: string
    chairEmails: string
}

export interface ConferenceResponse {
    id: number
    name: string
    acronym: string
    description: string
    location: string
    startDate: string
    endDate: string
    status: string
    websiteUrl: string
}

export interface ConferenceListResponse {
    id: number
    name: string
    acronym: string
    description: string
    location: string
    startDate: string
    endDate: string
    status: string
}

export interface CreateTrackRequest {
    name: string
    description: string
    conferenceId: number
    maxSubmissions: number
}

export interface TrackResponse {
    id: number
    name: string
    description: string
    conferenceId: number
    maxSubmissions: number
}

export interface UpdateConferenceRequest extends CreateConferenceRequest {
    id: number
}

export interface UpdateTrackRequest extends CreateTrackRequest {
    id: number
}