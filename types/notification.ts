// ── Notification Types ──

export interface NotificationRequest {
    userId: number
    conferenceId: number
    title: string
    message?: string
    type: string // INVITATION | DEADLINE_CHANGE | REVIEW_ASSIGNED | REVIEW_COMPLETED | STATUS_UPDATE
    link?: string
}

export interface NotificationResponse {
    id: number
    userId: number
    conferenceId: number
    conferenceName: string
    title: string
    message: string | null
    type: string
    link: string | null
    isRead: boolean
    createdAt: string
}

// ── Conference User Track (role context) ──

export type ConferenceTrackRole = 'CONFERENCE_CHAIR' | 'PROGRAM_CHAIR' | 'REVIEWER' | 'AUTHOR' | 'ATTENDEE'

export interface ConferenceUserTrackResponse {
    id: number
    userId: number
    conferenceId: number
    conferenceTrackId: number | null
    assignedRole: ConferenceTrackRole
    invitedAt: string
    isAccepted: boolean | null
    isRegistered: boolean | null
    createdAt: string
    updatedAt: string
}
