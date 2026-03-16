import http from '@/lib/http'
import type { NotificationRequest, NotificationResponse } from '@/types/notification'

export const getNotificationsByUser = async (userId: number, page: number = 0, size: number = 20) => {
    const response = await http.get(`/notifications/user/${userId}`, { params: { page, size } })
    return response.data
}

export const getUnreadCount = async (userId: number): Promise<number> => {
    const response = await http.get<{ count: number }>(`/notifications/user/${userId}/unread-count`)
    return response.data.count
}

export const markAsRead = async (id: number): Promise<NotificationResponse> => {
    const response = await http.put<NotificationResponse>(`/notifications/${id}/read`)
    return response.data
}

export const markAllAsRead = async (userId: number): Promise<void> => {
    await http.put(`/notifications/user/${userId}/read-all`)
}

export const createNotification = async (dto: NotificationRequest): Promise<NotificationResponse> => {
    const response = await http.post<NotificationResponse>('/notifications', dto)
    return response.data
}
