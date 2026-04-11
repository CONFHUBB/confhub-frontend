import http from '@/lib/http'
import type { ImportResult } from '@/app/api/conference.api'

export interface TicketTypeResponse {
  id: number
  conferenceId: number
  name: string
  description: string | null
  price: number
  currency: string
  deadline: string | null
  maxQuantity: number | null
  quantitySold: number
  availableSlots: number | null
  category: 'AUTHOR' | 'STUDENT' | 'STANDARD' | 'STAFF' | 'VIP'
  isActive: boolean
  isSoldOut: boolean
  isDeadlinePassed: boolean
}

export interface TicketTypeRequest {
  name: string
  description?: string
  price: number
  currency?: string
  deadline?: string | null
  maxQuantity?: number | null
  category: 'AUTHOR' | 'STUDENT' | 'STANDARD' | 'STAFF' | 'VIP'
  isActive?: boolean
}

export interface TicketResponse {
  id: number
  userId: number
  userName: string
  userEmail: string
  conferenceId: number
  conferenceName: string
  ticketTypeId: number | null
  ticketTypeName: string
  price: number
  currency: string
  paperId: number | null
  registrationNumber: string
  qrCode: string | null
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  isCheckedIn: boolean
  checkInTime: string | null
  createdAt: string
}

export interface RegistrationRequest {
  ticketTypeId: number
  paperId?: number | null
}

export interface RegistrationResponse {
  ticket: TicketResponse
  paymentUrl: string | null
}

export interface CheckInResponse {
  ticketId: number
  registrationNumber: string
  attendeeName: string
  attendeeEmail: string
  ticketTypeName: string
  isCheckedIn: boolean
  message: string
}

export interface PagedResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

// ── Ticket Types ──

export const getTicketTypes = async (conferenceId: number, activeOnly = true): Promise<TicketTypeResponse[]> => {
  const res = await http.get<TicketTypeResponse[]>(`/conferences/${conferenceId}/ticket-types?activeOnly=${activeOnly}`)
  return res.data
}

export const getTicketTypesForUser = async (conferenceId: number, userId: number): Promise<TicketTypeResponse[]> => {
  const res = await http.get<TicketTypeResponse[]>(`/conferences/${conferenceId}/ticket-types/for-user?userId=${userId}`)
  return res.data
}

export const createTicketType = async (conferenceId: number, body: TicketTypeRequest): Promise<TicketTypeResponse> => {
  const res = await http.post<TicketTypeResponse>(`/conferences/${conferenceId}/ticket-types`, body)
  return res.data
}

export const updateTicketType = async (id: number, body: TicketTypeRequest): Promise<TicketTypeResponse> => {
  const res = await http.put<TicketTypeResponse>(`/ticket-types/${id}`, body)
  return res.data
}

export const deleteTicketType = async (id: number): Promise<void> => {
  await http.delete(`/ticket-types/${id}`)
}

// ── Ticket Type Import ──

const uploadImportFile = (url: string, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return http.post<ImportResult>(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
}

const downloadImportBlob = async (url: string): Promise<Blob> => {
  const response = await http.get(url, { responseType: 'blob' })
  return new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export const downloadTicketTypeTemplate = (conferenceId: number) => downloadImportBlob(`/conferences/${conferenceId}/ticket-types/import/template`)
export const previewTicketTypeImport = (conferenceId: number, file: File) => uploadImportFile(`/conferences/${conferenceId}/ticket-types/import/preview`, file).then(r => r.data)
export const importTicketTypes = (conferenceId: number, file: File) => uploadImportFile(`/conferences/${conferenceId}/ticket-types/import`, file).then(r => r.data)

// ── Registration ──

export const registerForConference = async (
  conferenceId: number,
  userId: number,
  body: RegistrationRequest
): Promise<RegistrationResponse> => {
  const res = await http.post<RegistrationResponse>(`/conferences/${conferenceId}/register?userId=${userId}`, body)
  return res.data
}

export const retryPayment = async (conferenceId: number, userId: number): Promise<RegistrationResponse> => {
  const res = await http.post<RegistrationResponse>(`/conferences/${conferenceId}/retry-payment?userId=${userId}`)
  return res.data
}

export const cancelPendingTicket = async (conferenceId: number, userId: number): Promise<void> => {
  await http.delete(`/conferences/${conferenceId}/cancel-pending?userId=${userId}`)
}

export const refundTicket = async (conferenceId: number, ticketId: number): Promise<void> => {
  await http.post(`/conferences/${conferenceId}/refund?ticketId=${ticketId}`)
}

export const getMyTicket = async (conferenceId: number, userId: number): Promise<TicketResponse> => {
  const res = await http.get<TicketResponse>(`/conferences/${conferenceId}/my-ticket?userId=${userId}`)
  return res.data
}

export const getMyTickets = async (userId: number): Promise<TicketResponse[]> => {
  const res = await http.get<TicketResponse[]>(`/my-tickets?userId=${userId}`)
  return res.data
}

export const getAttendees = async (
  conferenceId: number,
  params?: { page?: number; size?: number; search?: string; status?: string }
): Promise<PagedResponse<TicketResponse>> => {
  const query = new URLSearchParams()
  if (params?.page !== undefined) query.append('page', String(params.page))
  if (params?.size !== undefined) query.append('size', String(params.size))
  if (params?.search) query.append('search', params.search)
  if (params?.status && params.status !== 'ALL') query.append('status', params.status)
  const res = await http.get<PagedResponse<TicketResponse>>(
    `/conferences/${conferenceId}/attendees?${query.toString()}`
  )
  return res.data
}

export const checkIn = async (code: string): Promise<CheckInResponse> => {
  const res = await http.post<CheckInResponse>(`/check-in?code=${encodeURIComponent(code)}`)
  return res.data
}

// ── Payment History ──

export interface PaymentHistoryResponse {
  id: number
  ticketId: number | null
  registrationNumber: string | null
  vnpTxnRef: string
  vnpTransactionNo: string | null
  vnpTransactionStatus: string | null
  vnpResponseCode: string | null
  amount: number | null
  bankCode: string | null
  payDate: string | null
  signatureValid: boolean
  outcome: 'PAID' | 'FAILED' | 'INVALID'
  recordedAt: string
}

export const getConferencePaymentHistory = async (conferenceId: number): Promise<PaymentHistoryResponse[]> => {
  const res = await http.get<PaymentHistoryResponse[]>(`/conferences/${conferenceId}/payment-history`)
  return res.data
}

export const getTicketPaymentHistory = async (ticketId: number): Promise<PaymentHistoryResponse[]> => {
  const res = await http.get<PaymentHistoryResponse[]>(`/tickets/${ticketId}/payment-history`)
  return res.data
}

export const getMyPaymentHistory = async (userId: number): Promise<PaymentHistoryResponse[]> => {
  const res = await http.get<PaymentHistoryResponse[]>(`/my-payment-history?userId=${userId}`)
  return res.data
}

export const exportAllInvoices = async (conferenceId: number): Promise<Blob> => {
  const res = await http.get(`/documents/conferences/${conferenceId}/invoices`, {
    responseType: 'blob',
  })
  return res.data
}
