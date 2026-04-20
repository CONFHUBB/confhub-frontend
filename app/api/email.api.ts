import http from '@/lib/http'
import type { SendEmailRequest, BulkEmailRequest, EmailHistoryResponse } from '@/types/email'

export const sendEmail = async (body: SendEmailRequest): Promise<void> => {
    await http.post('/email', body)
}

export const sendInvitationEmail = async (formData: FormData): Promise<void> => {
    await http.post('/email/invite', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
}

export const sendExternalInvitation = async (body: {
    email: string
    recipientName: string
    conferenceId: number
    assignedRole: string
    trackId?: number
    trackName?: string
    conferenceName?: string
}): Promise<void> => {
    await http.post('/email/external-invite', body)
}

export const sendBulkEmail = async (body: BulkEmailRequest): Promise<void> => {
    await http.post('/email/bulk', body)
}

export const getEmailHistory = async (
    conferenceId: number,
    page: number = 0,
    size: number = 20,
    emailType?: string
) => {
    const response = await http.get<{
        content: EmailHistoryResponse[]
        totalElements: number
        totalPages: number
        number: number
        size: number
    }>(`/email-history/conference/${conferenceId}`, {
        params: { page, size, emailType },
    })
    return response.data
}
