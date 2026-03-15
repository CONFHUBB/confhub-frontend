import http from '@/lib/http'
import type { ReviewerInterestRequest, ReviewerInterestResponse } from '@/types/review'

export const createInterest = async (dto: ReviewerInterestRequest): Promise<ReviewerInterestResponse> => {
    const response = await http.post<ReviewerInterestResponse>('/reviewer-interest', dto)
    return response.data
}

export const getInterests = async (page: number = 0, size: number = 100) => {
    const response = await http.get('/reviewer-interest', { params: { page, size } })
    return response.data
}

export const deleteInterest = async (id: number): Promise<void> => {
    await http.delete(`/reviewer-interest/${id}`)
}

export const getInterestsByReviewer = async (reviewerId: number): Promise<ReviewerInterestResponse[]> => {
    const response = await http.get<ReviewerInterestResponse[]>(`/reviewer-interest/reviewer/${reviewerId}`)
    return response.data
}
