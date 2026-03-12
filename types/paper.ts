export interface PaperResponse {
    id: number
    trackId: number
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
    keyword1: string
    keyword2: string
    keyword3: string
    keyword4: string
    submissionTime: string
    isPassedPlagiarism: boolean
    status: string
}

export interface CreatePaperRequest {
    conferenceTrackId: number,
    primarySubjectAreaId: number,
    secondarySubjectAreaIds: number[],
    title: string,
    abstractField: string,
    keyword1: string,
    keyword2: string,
    keyword3: string,
    keyword4: string,
    submissionTime: string,
    isPassedPlagiarism: boolean,
    status: string
}

export interface PaperFileResponse {
    id: number
    url: string
    isActive: boolean
    paper: {
        id: number
    }
}