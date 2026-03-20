export type PaperStatus =
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "ACCEPTED"
    | "REJECTED"
    | "WITHDRAWN"
    | "CAMERA_READY"
    | "PUBLISHED"

export interface PaperResponse {
    id: number
    conferenceId: number
    trackId: number
    trackName: string
    track: {
        createdAt: string
        updatedAt: string
        createdBy: string
        updatedBy: string
        id: number
        name: string
        description: string
        conference: {
            createdAt: string
            updatedAt: string
            createdBy: string
            updatedBy: string
            id: number
            name: string
            acronym: string
            description: string
            websiteUrl: string
            location: string
            status: string
            startDate: string
            endDate: string
        }
        maxSubmissions: number
    }
    primarySubjectAreaId: number
    secondarySubjectAreaIds: number[]
    title: string
    abstractField: string
    keywords: string[]
    submissionTime: string
    status: PaperStatus
}

export interface CreatePaperRequest {
    conferenceTrackId: number
    primarySubjectAreaId: number
    secondarySubjectAreaIds: number[]
    title: string
    abstractField: string
    keywords: string[]
    submissionTime: string
    status: string
}

export interface PaperFileResponse {
    id: number
    paperId: number
    url: string
    isActive: boolean
}