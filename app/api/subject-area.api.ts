import http from '@/lib/http'
import type { CreateSubjectAreaRequest, SubjectAreaResponse, UpdateSubjectAreaRequest } from '@/types/subject-area'

export const createSubjectArea = async (body: CreateSubjectAreaRequest): Promise<SubjectAreaResponse> => {
    const response = await http.post<SubjectAreaResponse>('/subject-areas', body)
    return response.data
}

export const updateSubjectArea = async (body: UpdateSubjectAreaRequest): Promise<SubjectAreaResponse> => {
    const response = await http.put<SubjectAreaResponse>(`/subject-areas/${body.id}`, body)
    return response.data
}

export const deleteSubjectArea = async (id: number): Promise<void> => {
    await http.delete(`/subject-areas/${id}`)
}
