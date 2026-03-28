import http from '@/lib/http'
import type { DiscussionPost, DiscussionPostRequest } from '@/types/discussion'

export const getDiscussionByPaper = async (paperId: number): Promise<DiscussionPost[]> => {
    const response = await http.get<DiscussionPost[]>(`/review-comment/paper/${paperId}/discussion`)
    return response.data
}

export const getCommentsByReview = async (reviewId: number): Promise<DiscussionPost[]> => {
    const response = await http.get<DiscussionPost[]>(`/review-comment/review/${reviewId}`)
    return response.data
}

export const getReplies = async (parentId: number): Promise<DiscussionPost[]> => {
    const response = await http.get<DiscussionPost[]>(`/review-comment/${parentId}/replies`)
    return response.data
}

export const createDiscussionPost = async (dto: DiscussionPostRequest): Promise<DiscussionPost> => {
    const response = await http.post<DiscussionPost>('/review-comment', dto)
    return response.data
}

export const updateDiscussionPost = async (id: number, dto: Partial<DiscussionPostRequest>): Promise<DiscussionPost> => {
    const response = await http.put<DiscussionPost>(`/review-comment/${id}`, dto)
    return response.data
}

export const deleteDiscussionPost = async (id: number): Promise<void> => {
    await http.delete(`/review-comment/${id}`)
}
