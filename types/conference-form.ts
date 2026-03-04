// Form data types for the conference creation flow

export interface ConferenceData {
    name: string
    acronym: string
    description: string
    location: string
    startDate: string
    endDate: string
    websiteUrl: string
}

export interface TrackData {
    name: string
    description: string
    submissionStart: string
    submissionEnd: string
    registrationStart: string
    registrationEnd: string
    cameraReadyStart: string
    cameraReadyEnd: string
    biddingStart: string
    biddingEnd: string
    reviewStart: string
    reviewEnd: string
    maxSubmissions: string
}

export interface TopicData {
    id: number
    title: string
    description: string
}

export interface TrackWithTopics {
    track: TrackData
    topics: TopicData[]
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

// Default track dates to remember across multiple track additions
export interface DefaultTrackDates {
    submissionStart: string
    submissionEnd: string
    registrationStart: string
    registrationEnd: string
    cameraReadyStart: string
    cameraReadyEnd: string
    biddingStart: string
    biddingEnd: string
    reviewStart: string
    reviewEnd: string
}
