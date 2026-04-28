import http from '@/lib/http'

export interface UnavailableDayResponse {
    id: number
    userId: number
    startDate: string
    endDate: string
    reason: string | null
    createdAt: string
}

export interface UnavailableDayRequest {
    startDate: string
    endDate: string
    reason?: string
}

export const getUnavailableDays = async (userId: number): Promise<UnavailableDayResponse[]> => {
    const response = await http.get<UnavailableDayResponse[]>(`/users/${userId}/unavailable-days`)
    return response.data
}

export const addUnavailableDay = async (userId: number, dto: UnavailableDayRequest): Promise<UnavailableDayResponse> => {
    const response = await http.post<UnavailableDayResponse>(`/users/${userId}/unavailable-days`, dto)
    return response.data
}

export const deleteUnavailableDay = async (userId: number, id: number): Promise<void> => {
    await http.delete(`/users/${userId}/unavailable-days/${id}`)
}

export const updateUnavailableDay = async (userId: number, id: number, dto: UnavailableDayRequest): Promise<UnavailableDayResponse> => {
    const response = await http.put<UnavailableDayResponse>(`/users/${userId}/unavailable-days/${id}`, dto)
    return response.data
}
