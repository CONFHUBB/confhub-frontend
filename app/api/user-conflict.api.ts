import http from '@/lib/http'
import type { UserConflictRequest, UserConflictResponse } from '@/types/conflict'

// ── User Conflicts (Domain / Personal / etc.) ──

export const getUserConflicts = async (userId: number): Promise<UserConflictResponse[]> => {
    const response = await http.get<UserConflictResponse[]>(`/users/${userId}/conflicts`)
    return response.data
}

export const addUserConflict = async (userId: number, dto: UserConflictRequest): Promise<UserConflictResponse> => {
    const response = await http.post<UserConflictResponse>(`/users/${userId}/conflicts`, dto)
    return response.data
}

export const deleteUserConflict = async (userId: number, conflictId: number): Promise<void> => {
    await http.delete(`/users/${userId}/conflicts/${conflictId}`)
}

export const toggleUserConflictActive = async (userId: number, conflictId: number): Promise<UserConflictResponse> => {
    const response = await http.patch<UserConflictResponse>(`/users/${userId}/conflicts/${conflictId}/toggle-active`)
    return response.data
}
