import http from '@/lib/http'
import type { User, AssignRoleRequest, AssignRoleResponse, UserProfile, UserProfileRequest, MembersPageResponse } from '@/types/user'

export const getUsers = async (): Promise<User[]> => {
    const response = await http.get<{ content: User[] }>('/users')
    return response.data.content
}

export const assignRole = async (body: AssignRoleRequest): Promise<AssignRoleResponse> => {
    const response = await http.post<AssignRoleResponse>('/conference-user-tracks/assign-role', body)
    return response.data
}

export const getUserByEmail = async (email: string): Promise<User> => {
    const response = await http.get<User>(`/users/search?email=${encodeURIComponent(email)}`)
    return response.data
}

export const getConferenceMembers = async (conferenceId: number, page = 0, size = 20): Promise<MembersPageResponse> => {
    const response = await http.get<MembersPageResponse>(
        `/conference-user-tracks/conferences/${conferenceId}/users-roles?page=${page}&size=${size}`
    )
    return response.data
}

export const deleteRoleAssignment = async (id: number): Promise<void> => {
    await http.delete(`/conference-user-tracks/${id}`)
}

export const getUserProfile = async (userId: number): Promise<UserProfile> => {
    const response = await http.get<UserProfile>(`/users/${userId}/profile`)
    return response.data
}

export const createOrUpdateUserProfile = async (userId: number, data: UserProfileRequest): Promise<UserProfile> => {
    const response = await http.post<UserProfile>(`/users/${userId}/profile`, data)
    return response.data
}
