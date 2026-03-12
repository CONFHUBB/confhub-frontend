export interface CreateSubjectAreaRequest {
    trackId: number
    name: string
    description: string
    parentId: number | null
}

export interface SubjectAreaResponse {
    id: number
    trackId: number
    name: string
    description: string
    parentId: number | null
}

export interface UpdateSubjectAreaRequest extends CreateSubjectAreaRequest {
    id: number
}