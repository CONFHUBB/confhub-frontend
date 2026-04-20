export type PaperStatus =
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "AWAITING_DECISION"
    | "ACCEPTED"
    | "REJECTED"
    | "AWAITING_REGISTRATION"
    | "REGISTERED"
    | "AWAITING_CAMERA_READY"
    | "CAMERA_READY_SUBMITTED"
    | "CAMERA_READY_REJECTED"
    | "PUBLISHED"
    | "WITHDRAWN"

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
    }
    primarySubjectAreaId: number
    secondarySubjectAreaIds: number[]
    title: string
    abstractField: string
    keywords: string[]
    submissionTime: string
    status: PaperStatus
    authorNames?: string[]
    isDoubleBlind?: boolean
    plagiarismScore?: number | null
    plagiarismStatus?: 'PENDING' | 'CHECKING' | 'COMPLETED' | 'FAILED' | null
    plagiarismDetailsJson?: string | null
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
    isCameraReady: boolean
    isSupplementary?: boolean
    uploadedAt: string
}