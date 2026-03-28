export interface SendEmailRequest {
    to: string
    subject: string
    text: string
}

export interface BulkEmailRequest {
    conferenceId: number
    recipientGroup: string // REVIEWER, AUTHOR, PROGRAM_CHAIR, etc.
    subject: string
    body: string
    ccEmails?: string
}

export interface EmailHistoryResponse {
    id: number
    fromEmail: string
    toEmail: string
    ccEmails: string | null
    subject: string
    body: string
    emailType: 'INVITATION' | 'BULK' | 'INDIVIDUAL' | 'SYSTEM'
    status: 'SENT' | 'ERROR'
    errorMessage: string | null
    conferenceId: number | null
    conferenceName: string | null
    sentAt: string
    createdAt: string
}

export interface InvitationResponse {
    id: number
    userId: number
    conferenceId: number
    conferenceTrackId: number | null
    assignedRole: string
    invitedAt: string
    isAccepted: boolean | null
    isRegistered: boolean | null
    invitationToken: string
    tokenExpiresAt: string
    createdAt: string
    updatedAt: string
}

export interface EmailTemplateRequest {
    name: string
    subject: string
    body: string
    templateType: string
    conferenceId: number
}

export interface EmailTemplateResponse {
    id: number
    name: string
    subject: string
    body: string
    templateType: string
    conferenceId: number
    createdAt: string
    updatedAt: string
}
