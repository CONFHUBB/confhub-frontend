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
    bannerImageUrl: string
    area: string
    country: string
    province: string
    contactInformation: string
    paperDeadline: string
    cameraReadyDeadline: string
    societySponsor?: string
    chairEmails?: string
    programSchedule?: string | Record<string, any>
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
    bannerImageUrl: string
    area: string
    country: string
}

export interface CreateTrackRequest {
    name: string
    description: string
    conferenceId: number
}

export interface TrackResponse {
    id: number
    name: string
    description: string
    conferenceId: number
}

export interface UpdateConferenceRequest extends CreateConferenceRequest {
    id: number
}

export interface UpdateTrackRequest extends CreateTrackRequest {
    id: number
}

export interface ConferenceActivityDTO {
    id: number;
    conferenceId: number;
    activityType: string;
    name: string;
    isEnabled: boolean;
    deadline: string | null;
}

export interface ActivityAuditLogDTO {
    id: number;
    conferenceId: number;
    activityType: string;
    activityLabel: string;
    action: string;        // "ENABLED" | "DISABLED" | "DEADLINE_CHANGED"
    oldValue: string | null;
    newValue: string | null;
    performedBy: string;
    createdAt: string;
}
