export type ConferenceStatus =
    | "PENDING_APPROVAL"
    | "SETUP"
    | "OPEN"
    | "COMPLETED"
    | "CANCELLED"

export const CONFERENCE_STATUS_COLORS: Record<ConferenceStatus, string> = {
    PENDING_APPROVAL: "bg-amber-100 text-amber-700 border-amber-200",
    SETUP:            "bg-blue-100 text-blue-700 border-blue-200",
    OPEN:             "bg-emerald-100 text-emerald-700 border-emerald-200",
    COMPLETED:        "bg-slate-100 text-slate-700 border-slate-200",
    CANCELLED:        "bg-rose-100 text-rose-700 border-rose-200",
}

export const CONFERENCE_STATUS_CONFIG: Record<ConferenceStatus, { label: string; color: string }> = {
    PENDING_APPROVAL: { label: "Pending Approval", color: "bg-amber-500" },
    SETUP:            { label: "Setup",             color: "bg-blue-500" },
    OPEN:             { label: "Open",              color: "bg-emerald-500" },
    COMPLETED:        { label: "Completed",         color: "bg-slate-500" },
    CANCELLED:        { label: "Cancelled",         color: "bg-rose-500" },
}

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
