import http from '@/lib/http'
import { CreatePaperRequest, PaperResponse } from '@/types/paper'
import { User } from '@/types/user'

import { PaperSubmissionRequest } from '@/types/submission-form'
import { PaperFileResponse } from '@/types/paper'

export const createPaper = async (body: CreatePaperRequest | PaperSubmissionRequest): Promise<PaperResponse> => {
    const response = await http.post<PaperResponse>('/paper', body)
    return response.data
}

export const getPaperById = async (paperId: number): Promise<PaperResponse> => {
    const response = await http.get<PaperResponse>(`/paper/${paperId}`)
    return response.data
}

export const updatePaper = async (paperId: number, body: any): Promise<PaperResponse> => {
    const response = await http.put<PaperResponse>(`/paper/${paperId}`, body)
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

export const uploadPaperFile = async (conferenceId: number, paperId: number, file: File): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await http.post(`/paper-file/upload`, formData, {
        params: { conferenceId, paperId },
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
    return response.data
}

export const getPaperFiles = async (): Promise<PaperFileResponse[]> => {
    const response = await http.get<{ content: PaperFileResponse[] }>('/paper-file')
    return response.data.content || []
}

export const updatePaperFile = async (paperId: number, file: File): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await http.post(`/paper-file/${paperId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
    return response.data
}
