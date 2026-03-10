import http from '@/lib/http'
import type { CreateTopicRequest, TopicResponse, UpdateTopicRequest } from '@/types/topic'

export const createTopic = async (body: CreateTopicRequest): Promise<TopicResponse> => {
    const response = await http.post<TopicResponse>('/conference-track-topics', body)
    return response.data
}

export const updateTopic = async (body: UpdateTopicRequest): Promise<TopicResponse> => {
    const response = await http.put<TopicResponse>(`/conference-track-topics/${body.id}`, body)
    return response.data
}
