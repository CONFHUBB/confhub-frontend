import http from '@/lib/http'

export const downloadDocument = async (url: string, filename: string) => {
  try {
    const response = await http.get(url, { responseType: 'blob' })
    const urlBlob = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = urlBlob
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.parentNode?.removeChild(link)
  } catch (error) {
    console.error('Download failed:', error)
    throw error
  }
}

export const downloadAcceptanceLetter = (paperId: number) => {
  return downloadDocument(`/documents/papers/${paperId}/acceptance-letter`, `Acceptance_Letter_${paperId}.pdf`)
}

export const downloadInvoice = (ticketId: number) => {
  return downloadDocument(`/documents/tickets/${ticketId}/invoice`, `Invoice_${ticketId}.pdf`)
}

export const downloadVisaLetter = (ticketId: number) => {
  return downloadDocument(`/documents/tickets/${ticketId}/visa-letter`, `Visa_Letter_${ticketId}.pdf`)
}

export const downloadCertificate = (ticketId: number) => {
  return downloadDocument(`/documents/tickets/${ticketId}/certificate`, `Certificate_${ticketId}.pdf`)
}
