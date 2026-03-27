import http from '@/lib/http'
import { CreatePaperRequest, PaperResponse } from '@/types/paper'
import { User } from '@/types/user'
import { getTrack } from './track.api'

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
    const response = await http.get<{ content: any[] }>(`/paper/author/${userId}`)
    let papers = response.data.content || []
    
    // Deduplicate papers by ID to prevent UI bugs if a user has multiple author roles on the same paper
    const uniquePapersMap = new Map()
    papers.forEach((p) => {
        if (!uniquePapersMap.has(p.id)) {
            uniquePapersMap.set(p.id, p)
        }
    })
    papers = Array.from(uniquePapersMap.values())
    
    // Fetch unique tracks to avoid undefined 'paper.track' on the UI
    const trackIds = Array.from(new Set(papers.map((p) => p.trackId).filter(Boolean)))
    const tracksArray = await Promise.all(trackIds.map((id: number) => getTrack(id)))
    const trackMap = Object.fromEntries(tracksArray.map(t => [t.id, t]))
    
    return papers.map((paper) => ({
        ...paper,
        track: trackMap[paper.trackId]
    })) as PaperResponse[]
}

export const assignAuthorToPaper = async (paperId: number, authorId: number): Promise<void> => {
    const response = await http.post<void>(`/paper-author`, { paperId, userId: authorId })
    return response.data
}

export interface PaperAuthorItem {
    paperAuthorId: number
    user: User
}

export const getAuthorsByPaper = async (paperId: number): Promise<PaperAuthorItem[]> => {
    try {
        const response = await http.get<any>(`/paper-author/paper/${paperId}`)
        const content = response.data?.content || response.data || []
        const items = Array.isArray(content) ? content : []
        return items.map((item: any) => {
            const u = item.user || item
            return {
                paperAuthorId: item.id,
                user: {
                    ...u,
                    fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim()
                }
            }
        })
    } catch (error) {
        console.error("Failed to fetch authors:", error)
        return []
    }
}

export const deleteAuthorFromPaper = async (paperAuthorId: number): Promise<void> => {
    await http.delete(`/paper-author/${paperAuthorId}`)
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

export const getPaperFilesByPaperId = async (paperId: number): Promise<PaperFileResponse[]> => {
    const response = await http.get<any>(`/paper-file/paper/${paperId}`)
    const data = response.data
    if (Array.isArray(data)) return data
    if (data?.content && Array.isArray(data.content)) return data.content
    return []
}

export const updatePaperFile = async (conferenceId: number, paperId: number, file: File): Promise<any> => {
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

export const withdrawPaper = async (paperId: number): Promise<PaperResponse> => {
    const response = await http.put<PaperResponse>(`/paper/${paperId}/withdraw`)
    return response.data
}

export const restorePaper = async (paperId: number): Promise<PaperResponse> => {
    const response = await http.put<PaperResponse>(`/paper/${paperId}/restore`)
    return response.data
}

export const getPapersByConference = async (
    conferenceId: number,
    trackIds?: number[]
): Promise<PaperResponse[]> => {
    const params: Record<string, any> = {}
    if (trackIds && trackIds.length > 0) {
        params.trackIds = trackIds.join(',')
    }
    const response = await http.get<PaperResponse[]>(`/paper/conference/${conferenceId}`, { params })
    return response.data
}

export const updatePaperStatus = async (paperId: number, status: string): Promise<PaperResponse> => {
    const response = await http.put<PaperResponse>(`/paper/status/${paperId}`, { status })
    return response.data
}

/**
 * Secure download list for reviewers.
 * Only returns files if the caller (identified via JWT) is assigned to review this paper.
 * Throws 400 Bad Request if not assigned.
 */
export const getReviewerPaperFiles = async (paperId: number): Promise<PaperFileResponse[]> => {
    const response = await http.get<PaperFileResponse[]>(`/paper-file/paper/${paperId}/reviewer-files`)
    return Array.isArray(response.data) ? response.data : []
}

/**
 * Task 3: Trigger async batch decision notification emails for all paper authors in a conference.
 * Returns immediately with a count message; emails sent in background.
 */
export const batchNotifyDecisions = async (conferenceId: number): Promise<string> => {
    const response = await http.post<string>(`/paper/conference/${conferenceId}/batch-notify`)
    return response.data
}
