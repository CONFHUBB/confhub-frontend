'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getTicketTypes, getTicketTypesForUser, registerForConference, getMyTicket, retryPayment, cancelPendingTicket, TicketTypeResponse, TicketResponse } from '@/app/api/registration.api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, CreditCard, Users, Calendar, Ticket, AlertTriangle, RotateCcw, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { getCurrentUserId } from '@/lib/auth'
import { toast } from 'sonner'

const CATEGORY_LABELS: Record<string, string> = {
  AUTHOR: 'Author / Presenter',
  STUDENT: 'Student',
  STANDARD: 'Standard',
  STAFF: 'Staff / Organizer',
  VIP: 'VIP',
}

const CATEGORY_COLORS: Record<string, string> = {
  AUTHOR: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  STUDENT: 'bg-green-100 text-green-800 border-green-200',
  STANDARD: 'bg-gray-100 text-gray-800 border-gray-200',
  STAFF: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  VIP: 'bg-amber-100 text-amber-800 border-amber-200',
}

function RegisterContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const conferenceId = Number(params.conferenceId)
  const userId = Number(searchParams.get('userId')) || getCurrentUserId() || 0

  const [ticketTypes, setTicketTypes] = useState<TicketTypeResponse[]>([])
  const [selected, setSelected] = useState<TicketTypeResponse | null>(null)
  const [paperId, setPaperId] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Existing ticket state — handles pending/failed recovery flow
  const [existingTicket, setExistingTicket] = useState<TicketResponse | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const loadTicketTypes = async () => {
    let tickets: TicketTypeResponse[] = []
    if (userId) {
      try {
        tickets = await getTicketTypesForUser(conferenceId, userId)
      } catch {
        tickets = await getTicketTypes(conferenceId, true)
      }
    } else {
      tickets = await getTicketTypes(conferenceId, true)
    }
    // Exclude AUTHOR tickets — those are only available via Camera-Ready Submission Wizard
    setTicketTypes(tickets.filter(t => t.category !== 'AUTHOR'))
  }

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Check if user already has a ticket for this conference
        if (userId) {
          try {
            const ticket = await getMyTicket(conferenceId, userId)
            if (ticket) {
              if (ticket.paymentStatus === 'COMPLETED') {
                router.replace(`/conference/${conferenceId}/my-ticket`)
                return
              }
              if (ticket.paymentStatus === 'PENDING' || ticket.paymentStatus === 'FAILED') {
                setExistingTicket(ticket)
                setLoading(false)
                return
              }
            }
          } catch {
            // No existing ticket → continue to normal registration flow
          }
        }

        // 2. Load ticket types for new registration
        await loadTicketTypes()
      } catch {
        setError('Failed to load ticket types.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [conferenceId, userId])

  const handleRegister = async () => {
    if (!selected) return
    if (!userId) {
      setError('You must be logged in to register. Please sign in and try again.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await registerForConference(conferenceId, userId, {
        ticketTypeId: selected.id,
        paperId: paperId || null,
      })
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl
      } else {
        router.push(`/conference/${conferenceId}/my-ticket?userId=${userId}&status=success`)
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || ''
      // If backend says already registered, switch to recovery flow
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already has') || e?.response?.status === 409) {
        try {
          const ticket = await getMyTicket(conferenceId, userId)
          if (ticket) {
            setExistingTicket(ticket)
            return
          }
        } catch { /* ignore */ }
      }
      setError(msg || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetryPayment = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await retryPayment(conferenceId, userId)
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl
      } else {
        router.push(`/conference/${conferenceId}/my-ticket?userId=${userId}&status=success`)
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to retry payment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelAndReregister = async () => {
    if (!confirm('Cancel your current registration and choose a different ticket?')) return
    setCancelling(true)
    setError(null)
    try {
      await cancelPendingTicket(conferenceId, userId)
      setExistingTicket(null)
      toast.success('Registration cancelled. You can now choose a new ticket.')
      await loadTicketTypes()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to cancel registration.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // ═══════ Existing ticket recovery UI ═══════
  if (existingTicket) {
    const isPending = existingTicket.paymentStatus === 'PENDING'
    return (
      <div className="page-narrow">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Register to Attend</h1>
          <p className="text-gray-500 mt-2">Choose your ticket type to confirm your registration.</p>
        </div>

        <Card className={`border-2 ${isPending ? 'border-amber-300 bg-amber-50/30' : 'border-red-300 bg-red-50/30'}`}>
          <CardContent className="p-8 text-center space-y-5">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${isPending ? 'bg-amber-100' : 'bg-red-100'}`}>
              {isPending ? (
                <CreditCard className="w-7 h-7 text-amber-600" />
              ) : (
                <AlertTriangle className="w-7 h-7 text-red-600" />
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isPending ? 'Payment Pending' : 'Payment Failed'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isPending
                  ? 'You have an existing registration that hasn\'t been paid yet.'
                  : 'Your previous payment was unsuccessful.'}
              </p>
            </div>

            {/* Ticket summary */}
            <div className="bg-white rounded-xl border p-4 text-left max-w-md mx-auto space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Ticket</span>
                <span className="font-semibold text-gray-900">{existingTicket.ticketTypeName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Amount</span>
                <span className="font-semibold text-gray-900">
                  {existingTicket.price === 0 ? 'Free' : `${existingTicket.price.toLocaleString()} ${existingTicket.currency}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Badge className={isPending
                  ? 'bg-amber-100 text-amber-700 border-amber-200 border'
                  : 'bg-red-100 text-red-700 border-red-200 border'
                }>
                  {isPending ? 'Pending Payment' : 'Payment Failed'}
                </Badge>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <Button
                size="lg"
                onClick={handleRetryPayment}
                disabled={submitting || cancelling}
                className="min-w-[200px]"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                Retry Payment
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleCancelAndReregister}
                disabled={submitting || cancelling}
                className="min-w-[200px] text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Cancel & Choose Different Ticket
              </Button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ═══════ Normal registration UI ═══════
  return (
    <div className="page-narrow">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Register to Attend</h1>
        <p className="text-gray-500 mt-2">Choose your ticket type to confirm your registration.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-8 text-sm font-medium text-gray-500">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs">1</span>
          Select Ticket
        </div>
        <div className="h-px flex-1 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs">2</span>
          Pay
        </div>
        <div className="h-px flex-1 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs">3</span>
          Done
        </div>
      </div>

      {/* Ticket Types Grid */}
      {ticketTypes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No ticket types available yet.</p>
          <p className="text-sm">Please check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {ticketTypes.map((tt) => {
            const isDisabled = tt.isSoldOut || tt.isDeadlinePassed || !tt.isActive
            const isSelected = selected?.id === tt.id
            return (
              <div
                key={tt.id}
                onClick={() => !isDisabled && setSelected(tt)}
                className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200
                  ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:shadow-md hover:-translate-y-0.5'}
                  ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-lg' : 'border-gray-200 bg-white'}
                `}
              >
                {tt.category === 'AUTHOR' && !isDisabled && (
                  <span className="absolute -top-3 left-4 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    ✦ Your Author Ticket
                  </span>
                )}
                {tt.category === 'STAFF' && !isDisabled && (
                  <span className="absolute -top-3 left-4 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    ✦ Staff Exclusive
                  </span>
                )}
                {tt.category === 'STUDENT' && !isDisabled && (
                  <span className="absolute -top-3 left-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Student Discount
                  </span>
                )}
                {isSelected && (
                  <CheckCircle className="absolute top-4 right-4 w-5 h-5 text-primary" />
                )}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{tt.name}</h3>
                    <Badge className={`mt-1 text-xs border ${CATEGORY_COLORS[tt.category]}`}>
                      {CATEGORY_LABELS[tt.category]}
                    </Badge>
                  </div>
                  <div className="text-right">
                    {tt.price === 0 ? (
                      <span className="text-2xl font-bold text-green-600">Free</span>
                    ) : (
                      <span className="text-2xl font-bold text-gray-900">
                        {tt.price.toLocaleString()} {tt.currency}
                      </span>
                    )}
                  </div>
                </div>
                {tt.description && (
                  <p className="text-sm text-gray-500 mb-3">{tt.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                  {tt.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Until {formatDate(tt.deadline)}
                    </div>
                  )}
                  {tt.maxQuantity !== null && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {tt.availableSlots ?? 0} slots left
                    </div>
                  )}
                </div>
                {tt.isSoldOut && (
                  <div className="mt-2 text-xs font-semibold text-red-500">SOLD OUT</div>
                )}
                {tt.isDeadlinePassed && !tt.isSoldOut && (
                  <div className="mt-2 text-xs font-semibold text-orange-500">DEADLINE PASSED</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Paper selection (for Authors) */}
      {selected?.category === 'AUTHOR' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Link to Your Paper (Optional)</CardTitle>
            <CardDescription>Enter your paper ID to associate this registration with a presenter slot.</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="paper-id" className="text-sm font-medium mb-1">Paper ID</Label>
            <input
              id="paper-id"
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. 42"
              onChange={(e) => setPaperId(e.target.value ? Number(e.target.value) : undefined)}
            />
          </CardContent>
        </Card>
      )}

      {/* Summary + Action */}
      {selected && (
        <div className="bg-gray-50 rounded-xl border p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">{selected.name}</p>
            <p className="text-sm text-gray-500">
              {selected.price === 0 ? 'Free registration' : `${selected.price.toLocaleString()} ${selected.currency}`}
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleRegister}
            disabled={submitting}
            className="min-w-[160px]"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : selected.price === 0 ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : (
              <CreditCard className="w-4 h-4 mr-2" />
            )}
            {selected.price === 0 ? 'Register Free' : 'Pay with VNPay'}
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <RegisterContent />
    </Suspense>
  )
}
