import http from '@/lib/http'
import { CreatePaperRequest, PaperResponse } from '@/types/paper'
import { User } from '@/types/user'

import { PaperSubmissionRequest } from '@/types/submission-form'

export const createPaper = async (body: CreatePaperRequest | PaperSubmissionRequest): Promise<PaperResponse> => {
    const response = await http.post<PaperResponse>('/paper', body)
    return response.data
}

export const getPapersByAuthor = async (userId: number): Promise<PaperResponse[]> => {
    const response = await http.get<{ content: PaperResponse[] }>(`/paper/author/${userId}`)
    return response.data.content
}

export const assignAuthorToPaper = async (paperId: number, authorId: number): Promise<void> => {
    const response = await http.post<void>(`/paper-author`, { paperId, userId: authorId })
    return response.data
}

export const getAuthorsByPaper = async (paperId: number): Promise<User[]> => {
    const response = await http.get<{ content: User[] }>(`/paper-author/paper/${paperId}`)
    return response.data.content
}