import http from '@/lib/http'

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

// ── Ticket Types ──

export const getTicketTypes = async (conferenceId: number, activeOnly = true): Promise<TicketTypeResponse[]> => {
  const res = await http.get<TicketTypeResponse[]>(`/conferences/${conferenceId}/ticket-types?activeOnly=${activeOnly}`)
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

// ── Registration ──

export const registerForConference = async (
  conferenceId: number,
  userId: number,
  body: RegistrationRequest
): Promise<RegistrationResponse> => {
  const res = await http.post<RegistrationResponse>(`/conferences/${conferenceId}/register?userId=${userId}`, body)
  return res.data
}

export const getMyTicket = async (conferenceId: number, userId: number): Promise<TicketResponse> => {
  const res = await http.get<TicketResponse>(`/conferences/${conferenceId}/my-ticket?userId=${userId}`)
  return res.data
}

export const getAttendees = async (conferenceId: number): Promise<TicketResponse[]> => {
  const res = await http.get<TicketResponse[]>(`/conferences/${conferenceId}/attendees`)
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
