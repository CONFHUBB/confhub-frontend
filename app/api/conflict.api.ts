import http from '@/lib/http'
import type { PaperConflictRequest, PaperConflictResponse } from '@/types/conflict'

// ── Paper Conflicts ──

export const createPaperConflict = async (dto: PaperConflictRequest): Promise<PaperConflictResponse> => {
    const response = await http.post<PaperConflictResponse>('/paper-conflict', dto)
    return response.data
}

export const getConflictsByConference = async (conferenceId: number): Promise<PaperConflictResponse[]> => {
    const response = await http.get<PaperConflictResponse[]>(`/paper-conflict/conference/${conferenceId}`)
    return response.data
}

export const getConflictsByPaper = async (paperId: number): Promise<PaperConflictResponse[]> => {
    const response = await http.get<PaperConflictResponse[]>(`/paper-conflict/paper/${paperId}`)
    return response.data
}

export const deletePaperConflict = async (id: number): Promise<void> => {
    await http.delete(`/paper-conflict/${id}`)
}
