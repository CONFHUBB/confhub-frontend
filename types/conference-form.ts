// Form data types for the conference creation flow

export interface ConferenceData {
    name: string
    acronym: string
    description: string
    location: string
    startDate: string
    endDate: string
    websiteUrl: string
    area: string
    societySponsor: string[]
    conferenceIdNumber: string
    country: string
    province: string
    bannerImageUrl: string
    contactInformation: string
    chairEmails: string
}

export interface TrackData {
    name: string
    description: string
    maxSubmissions: string
}

export interface SubjectAreaData {
    id: number
    name: string
    description: string
    parentId: number | null
}

export interface TrackWithSubjectAreas {
    track: TrackData
    subjectAreas: SubjectAreaData[]
}

export interface RoleAssignmentData {
    id: number
    userId: string
    role: string
    isExternal: boolean
    externalEmail: string
}

export interface TemplateData {
    id: number
    templateType: string
    subject: string
    body: string
    isDefault: boolean
}

export interface ReviewTypeData {
    reviewOption: string
    isRebuttal: boolean
}
