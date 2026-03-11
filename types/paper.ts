export interface PaperResponse {
    id: number
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
        maxSubmissions: number
    }
    topic: {
        createdAt: string
        updatedAt: string
        createdBy: string
        updatedBy: string
        id: number
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
            maxSubmissions: number
        }
        title: string
        description: string
    }
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
    topicId: number,
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