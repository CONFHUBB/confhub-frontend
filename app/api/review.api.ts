import http from '@/lib/http'
import type { ReviewRequest, ReviewResponse, ReviewAnswerRequest, ReviewAnswerResponse } from '@/types/review'

// ── Review ──

export const getReviewById = async (id: number): Promise<ReviewResponse> => {
    const response = await http.get<ReviewResponse>(`/review/${id}`)
    return response.data
}

export const updateReview = async (id: number, dto: ReviewRequest): Promise<ReviewResponse> => {
    const response = await http.put<ReviewResponse>(`/review/${id}`, dto)
    return response.data
}

export const getAllReviews = async (page: number = 0, size: number = 20) => {
    const response = await http.get('/review', { params: { page, size } })
    return response.data
}

export const getReviewsByReviewerAndConference = async (reviewerId: number, conferenceId: number): Promise<ReviewResponse[]> => {
    const response = await http.get<ReviewResponse[]>(`/review/reviewer/${reviewerId}/conference/${conferenceId}`)
    return response.data
}

export const getReviewsByPaper = async (paperId: number): Promise<ReviewResponse[]> => {
    const response = await http.get<ReviewResponse[]>(`/review/paper/${paperId}`)
    return response.data
}

// ── Review Answers ──

export const getAnswersByReview = async (reviewId: number): Promise<ReviewAnswerResponse[]> => {
    const response = await http.get<ReviewAnswerResponse[]>(`/review-answers/review/${reviewId}`)
    return response.data
}

export const getReviewVersions = async (reviewId: number): Promise<any[]> => {
    const response = await http.get<any[]>(`/review/${reviewId}/versions`)
    return response.data
}

export const submitAnswer = async (dto: ReviewAnswerRequest): Promise<ReviewAnswerResponse> => {
    const response = await http.post<ReviewAnswerResponse>('/review-answers', dto)
    return response.data
}

export const submitBulkAnswers = async (dtos: ReviewAnswerRequest[]): Promise<ReviewAnswerResponse[]> => {
    const response = await http.post<ReviewAnswerResponse[]>('/review-answers/bulk', dtos)
    return response.data
}

// ── Review Questions (by track) ──

export const getReviewQuestionsByTrack = async (trackId: number) => {
    const response = await http.get(`/tracks/${trackId}/review-questions`)
    return response.data
}
