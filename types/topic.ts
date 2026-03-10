export interface CreateTopicRequest {
    trackId: number
    title: string
    description: string
}

export interface TopicResponse {
    id: number
    trackId: number
    title: string
    description: string
}

export interface UpdateTopicRequest extends CreateTopicRequest {
    id: number
}