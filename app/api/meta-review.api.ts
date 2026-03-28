import http from '@/lib/http'
import type { MetaReviewRequest, MetaReviewResponse } from '@/types/meta-review'

export const getMetaReviewsByConference = async (conferenceId: number): Promise<MetaReviewResponse[]> => {
    const response = await http.get<MetaReviewResponse[]>(`/review-meta-review/by-conference/${conferenceId}`)
    return response.data
}

export const getMetaReviewByPaper = async (paperId: number): Promise<MetaReviewResponse | null> => {
    try {
        const response = await http.get<MetaReviewResponse>(`/review-meta-review/by-paper/${paperId}`)
        return response.data
    } catch {
        return null
    }
}

export const createMetaReview = async (dto: MetaReviewRequest): Promise<MetaReviewResponse> => {
    const response = await http.post<MetaReviewResponse>('/review-meta-review', dto)
    return response.data
}

export const updateMetaReview = async (id: number, dto: MetaReviewRequest): Promise<MetaReviewResponse> => {
    const response = await http.put<MetaReviewResponse>(`/review-meta-review/${id}`, dto)
    return response.data
}

export const deleteMetaReview = async (id: number): Promise<void> => {
    await http.delete(`/review-meta-review/${id}`)
}
