import http from '@/lib/http'
import type { SendEmailRequest } from '@/types/email'

export const sendEmail = async (body: SendEmailRequest): Promise<void> => {
    await http.post('/email', body)
}
