import http from '@/lib/http'
import type { User, AssignRoleRequest, AssignRoleResponse, UserProfile, UserProfileRequest } from '@/types/user'

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

export const getUserProfile = async (userId: number): Promise<UserProfile> => {
    const response = await http.get<UserProfile>(`/users/${userId}/profile`)
    return response.data
}

export const createOrUpdateUserProfile = async (userId: number, data: UserProfileRequest): Promise<UserProfile> => {
    const response = await http.post<UserProfile>(`/users/${userId}/profile`, data)
    return response.data
}
