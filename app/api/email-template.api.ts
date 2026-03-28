import http from '@/lib/http'
import type { EmailTemplateRequest, EmailTemplateResponse } from '@/types/email'

export const createEmailTemplate = async (body: EmailTemplateRequest): Promise<EmailTemplateResponse> => {
    const response = await http.post<EmailTemplateResponse>('/email-templates', body)
    return response.data
}

export const getEmailTemplatesByConference = async (conferenceId: number): Promise<EmailTemplateResponse[]> => {
    const response = await http.get<EmailTemplateResponse[]>(`/email-templates/conference/${conferenceId}`)
    return response.data
}

export const updateEmailTemplate = async (id: number, body: EmailTemplateRequest): Promise<EmailTemplateResponse> => {
    const response = await http.put<EmailTemplateResponse>(`/email-templates/${id}`, body)
    return response.data
}

export const deleteEmailTemplate = async (id: number): Promise<void> => {
    await http.delete(`/email-templates/${id}`)
}

export const getAvailablePlaceholders = async (templateType: string): Promise<string[]> => {
    const response = await http.get<string[]>(`/email-templates/placeholders/${templateType}`)
    return response.data
}
