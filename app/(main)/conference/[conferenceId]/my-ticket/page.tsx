'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getMyTicket, retryPayment, cancelPendingTicket, TicketResponse } from '@/app/api/registration.api'
import { getUserByEmail } from '@/app/api/user.api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, Clock, Download, CreditCard } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import QRCode from 'qrcode'
import { downloadAcceptanceLetter, downloadInvoice, downloadCertificate } from '@/app/api/document.api'
import { toast } from 'sonner'
import { getCurrentUserEmail } from '@/lib/auth'

const STATUS_CONFIG = {
  COMPLETED: {
    icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    label: 'Confirmed',
    className: 'bg-green-100 text-green-700',
  },
  PENDING: {
    icon: <Clock className="w-5 h-5 text-yellow-600" />,
    label: 'Pending Payment',
    className: 'bg-yellow-100 text-yellow-700',
  },
  FAILED: {
    icon: <XCircle className="w-5 h-5 text-red-600" />,
    label: 'Payment Failed',
    className: 'bg-red-100 text-red-700',
  },
  REFUNDED: {
    icon: <XCircle className="w-5 h-5 text-gray-500" />,
    label: 'Refunded',
    className: 'bg-gray-100 text-gray-600',
  },
}

function MyTicketContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const conferenceId = Number(params.conferenceId)
  const statusParam = searchParams.get('status')

  const [ticket, setTicket] = useState<TicketResponse | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const handleDownload = async (type: string, id: number) => {
    try {
      setDownloading(type)
      if (type === 'acceptance') await downloadAcceptanceLetter(id)
      if (type === 'invoice') await downloadInvoice(id)
      if (type === 'certificate') await downloadCertificate(id)
    } catch (e) {
      toast.error('Failed to download document')
    } finally {
      setDownloading(null)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const email = getCurrentUserEmail()
        if (!email) { setError('Please log in first.'); setLoading(false); return }
        const user = await getUserByEmail(email)
        if (!user?.id) { setError('User not found.'); setLoading(false); return }
        setUserId(user.id)

        const t = await getMyTicket(conferenceId, user.id)
        setTicket(t)
        if (t.qrCode) {
          const url = await QRCode.toDataURL(t.qrCode, { width: 200, margin: 2 })
          setQrDataUrl(url)
        }
      } catch {
        setError('No registration found for this conference.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [conferenceId])

  const handleRetryPayment = async () => {
    if (!userId) return
    setRetrying(true)
    try {
      const res = await retryPayment(conferenceId, userId)
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl
      } else {
        toast.error('Could not generate a payment link. Please try again.')
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to initiate payment. Please try again.')
    } finally {
      setRetrying(false)
    }
  }

  const handleCancelRegistration = async () => {
    if (!userId) return
    if (!confirm('Are you sure you want to cancel this pending registration? You will be able to register again with a different ticket type.')) return
    setCancelling(true)
    try {
      await cancelPendingTicket(conferenceId, userId)
      toast.success('Registration cancelled. You can now register again.')
      window.location.href = `/conference/${conferenceId}/register`
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to cancel registration.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (error || !ticket) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 text-gray-500">
        <XCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <h2 className="text-xl font-semibold mb-2">{error || 'Ticket Not Found'}</h2>
        <Button className="mt-4" onClick={() => window.location.href = `/conference/${conferenceId}/register`}>
          Register Now
        </Button>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[ticket.paymentStatus] ?? STATUS_CONFIG.PENDING

  return (
    <div className="page-narrow">
      {/* Success banner */}
      {statusParam === 'success' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 font-medium">Registration confirmed! Check your email for the QR code.</p>
        </div>
      )}

      {/* Ticket Card */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        {/* Top stripe */}
        <div className="h-3 bg-primary" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{ticket.conferenceName}</h1>
              <p className="text-gray-500 text-sm mt-1">{ticket.ticketTypeName}</p>
            </div>
            <Badge className={`flex items-center gap-1 px-3 py-1 ${statusCfg.className}`}>
              {statusCfg.icon}
              {statusCfg.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p className="text-gray-400 uppercase text-xs font-semibold">Attendee</p>
              <p className="font-medium text-gray-800 mt-0.5">{ticket.userName}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase text-xs font-semibold">Registration ID</p>
              <p className="font-mono font-semibold text-gray-800 mt-0.5">{ticket.registrationNumber}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase text-xs font-semibold">Amount Paid</p>
              <p className="font-medium text-gray-800 mt-0.5">
                {ticket.price === 0 ? 'Free' : `${ticket.price.toLocaleString()} ${ticket.currency}`}
              </p>
            </div>
            <div>
              <p className="text-gray-400 uppercase text-xs font-semibold">Registered On</p>
              <p className="font-medium text-gray-800 mt-0.5">{formatDate(ticket.createdAt)}</p>
            </div>
            {ticket.isCheckedIn && (
              <div className="col-span-2">
                <p className="text-gray-400 uppercase text-xs font-semibold">Checked In</p>
                <p className="font-medium text-green-700 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {ticket.checkInTime ? formatDate(ticket.checkInTime) : 'Yes'}
                </p>
              </div>
            )}
          </div>

          {/* QR Code */}
          {ticket.paymentStatus === 'COMPLETED' && (
            <div className="border-t pt-6 flex flex-col items-center">
              <p className="text-sm font-medium text-gray-500 mb-4">Show this QR code at the venue for check-in</p>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded-xl shadow" />
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2 font-mono">{ticket.registrationNumber}</p>
            </div>
          )}

          {/* Retry payment for PENDING or FAILED */}
          {(ticket.paymentStatus === 'PENDING' || ticket.paymentStatus === 'FAILED') && (
            <div className="border-t pt-5 mt-4">
              <div className={`rounded-lg border p-4 mb-4 ${ticket.paymentStatus === 'FAILED' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className={`text-sm font-semibold mb-1 ${ticket.paymentStatus === 'FAILED' ? 'text-red-800' : 'text-amber-800'}`}>
                  {ticket.paymentStatus === 'FAILED' ? '❌ Payment Failed' : '⏳ Payment Incomplete'}
                </p>
                <p className={`text-sm ${ticket.paymentStatus === 'FAILED' ? 'text-red-700' : 'text-amber-700'}`}>
                  {ticket.paymentStatus === 'FAILED'
                    ? 'Your previous payment was unsuccessful. You can retry the payment or cancel and re-register with a different ticket.'
                    : 'Your registration is reserved but payment has not been completed. Resume payment to confirm your ticket, or cancel to start over.'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleRetryPayment}
                  disabled={retrying || cancelling}
                >
                  {retrying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  {retrying ? 'Redirecting to payment...' : ticket.paymentStatus === 'FAILED' ? 'Retry Payment' : 'Resume Payment'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={handleCancelRegistration}
                  disabled={retrying || cancelling}
                >
                  {cancelling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                  {cancelling ? 'Cancelling...' : 'Cancel & Re-register'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documents */}
      {ticket.paymentStatus === 'COMPLETED' && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Acceptance Letter', type: 'acceptance', id: ticket.paperId, disabled: !ticket.paperId },
            { label: 'Invoice', type: 'invoice', id: ticket.id, disabled: false },
            { label: 'Certificate', type: 'certificate', id: ticket.id, disabled: !ticket.isCheckedIn },
          ].map((doc) => (
            <button
              key={doc.label}
              onClick={() => !doc.disabled && doc.id && handleDownload(doc.type, doc.id)}
              disabled={doc.disabled || downloading === doc.type || !doc.id}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-center text-sm font-medium transition-all min-h-[90px]
                ${doc.disabled
                  ? 'opacity-40 cursor-not-allowed bg-gray-50 text-gray-400'
                  : downloading === doc.type
                    ? 'bg-primary/5 border-primary text-gray-700 opacity-70 cursor-wait'
                    : 'hover:bg-primary/5 hover:border-primary text-gray-700 cursor-pointer'}
              `}
            >
              {downloading === doc.type
                ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
                : <Download className="w-5 h-5 text-primary" />
              }
              {doc.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MyTicketPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <MyTicketContent />
    </Suspense>
  )
}
