import http from '@/lib/http'
import type { ConferenceUserTrackResponse } from '@/types/notification'

// Get all role assignments for the current user
export const getUserRoleAssignments = async (userId: number): Promise<ConferenceUserTrackResponse[]> => {
    const response = await http.get<ConferenceUserTrackResponse[]>(`/conference-user-tracks/users/${userId}/my-roles`)
    return response.data
}

// Get all users with their roles for a conference (pagination)
export const getConferenceUsersWithRoles = async (conferenceId: number, page: number = 0, size: number = 20) => {
    const response = await http.get(`/conference-user-tracks/conferences/${conferenceId}/users-roles`, {
        params: { page, size }
    })
    return response.data
}

// Get reviewer conferences (accepted only)
export const getReviewerConferences = async (userId: number, page: number = 0, size: number = 20) => {
    const response = await http.get(`/conference-user-tracks/users/${userId}/reviewer-conferences`, {
        params: { page, size }
    })
    return response.data
}

// Accept invitation
export const acceptInvitation = async (userId: number, conferenceId: number) => {
    const response = await http.put('/conference-user-tracks/accept', null, {
        params: { userId, conferenceId }
    })
    return response.data
}

// Decline invitation
export const declineInvitation = async (userId: number, conferenceId: number) => {
    const response = await http.put('/conference-user-tracks/decline', null, {
        params: { userId, conferenceId }
    })
    return response.data
}

// Resend invitation (regenerate token, invalidate old link)
export const resendInvitation = async (conferenceUserTrackId: number) => {
    const response = await http.put(`/conference-user-tracks/${conferenceUserTrackId}/resend-invitation`)
    return response.data
}
