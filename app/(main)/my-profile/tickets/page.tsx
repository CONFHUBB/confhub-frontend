"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getMyTickets, retryPayment, cancelPendingTicket, TicketResponse } from "@/app/api/registration.api"
import { getPapersByAuthor } from "@/app/api/paper.api"
import { getUserByEmail } from "@/app/api/user.api"
import { PaperResponse } from "@/types/paper"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, CreditCard, Download, Loader2, Ticket, XCircle } from "lucide-react"
import QRCode from "qrcode"
import { downloadAcceptanceLetter, downloadCertificate, downloadInvoice } from "@/app/api/document.api"
import { toast } from 'sonner'
import { getCurrentUserEmail } from '@/lib/auth'

export default function MyGlobalTicketsPage() {
    const router = useRouter()
    const [tickets, setTickets] = useState<TicketResponse[]>([])
    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<number | null>(null)
    const [qrDataUrls, setQrDataUrls] = useState<Record<number, string>>({})
    const [downloading, setDownloading] = useState<{ type: string; id: number } | null>(null)
    const [actionState, setActionState] = useState<{ id: number; type: 'retry' | 'cancel' } | null>(null)
    const [currentUserId, setCurrentUserId] = useState<number | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const email = getCurrentUserEmail()
            if (!email) return router.push("/auth/login")
            const user = await getUserByEmail(email)
            if (!user || !user.id) return
            setCurrentUserId(user.id)

            const [tData, pData] = await Promise.all([
                getMyTickets(user.id),
                getPapersByAuthor(user.id)
            ])
            setTickets(tData || [])
            setPapers(pData || [])
        } catch (error) {
            console.error(error)
            toast.error("Failed to load tickets. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        tickets.forEach(ticket => {
            if (ticket.qrCode && !qrDataUrls[ticket.id]) {
                QRCode.toDataURL(ticket.qrCode, { width: 180, margin: 2 })
                    .then(url => setQrDataUrls(prev => ({ ...prev, [ticket.id]: url })))
                    .catch(() => { toast.error("Failed to generate QR code.") })
            }
        })
    }, [tickets, qrDataUrls])

    const handleDownload = async (type: string, id: number, ticketId: number) => {
        try {
            setDownloading({ type, id: ticketId })
            if (type === 'acceptance') await downloadAcceptanceLetter(id)
            if (type === 'invoice') await downloadInvoice(id)
            if (type === 'certificate') await downloadCertificate(id)
            toast.success('Download started')
        } catch { toast.error('Download failed') }
        finally { setDownloading(null) }
    }

    const handleRetryPayment = async (ticket: TicketResponse) => {
        if (!currentUserId) return
        setActionState({ id: ticket.id, type: 'retry' })
        try {
            const res = await retryPayment(ticket.conferenceId, currentUserId)
            if (res.paymentUrl) {
                window.location.href = res.paymentUrl
            } else {
                toast.error('Could not generate a payment link. Please try again.')
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to initiate payment.')
        } finally {
            setActionState(null)
        }
    }

    const handleCancelTicket = async (ticket: TicketResponse) => {
        if (!currentUserId) return
        if (!confirm('Cancel this pending registration? You can re-register afterwards.')) return
        setActionState({ id: ticket.id, type: 'cancel' })
        try {
            await cancelPendingTicket(ticket.conferenceId, currentUserId)
            toast.success('Registration cancelled. You can now register again.')
            await fetchData()
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to cancel registration.')
        } finally {
            setActionState(null)
        }
    }

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="page-base space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Tickets</h1>
                <p className="text-sm text-muted-foreground mt-1">Your event registrations across all conferences</p>
            </div>

            {tickets.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground bg-white border rounded-xl">
                    <Ticket className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <h2 className="text-lg font-semibold text-gray-900">No Tickets Found</h2>
                    <p className="text-sm mt-1">You haven't registered for any conferences yet.</p>
                </div>
            ) : (
                <div className="rounded-xl border overflow-hidden bg-white shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-24">ID</TableHead>
                                <TableHead>Conference</TableHead>
                                <TableHead>Ticket Type</TableHead>
                                <TableHead className="w-32 text-center">Status</TableHead>
                                <TableHead className="w-32 text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tickets.map(ticket => {
                                const isPaid = ticket.paymentStatus === 'COMPLETED'
                                const isPending = ticket.paymentStatus === 'PENDING'
                                const isFailed = ticket.paymentStatus === 'FAILED'
                                const canRetry = isPending || isFailed
                                const isExpanded = expandedId === ticket.id
                                const qrDataUrl = qrDataUrls[ticket.id]
                                const isRetrying = actionState?.id === ticket.id && actionState?.type === 'retry'
                                const isCancelling = actionState?.id === ticket.id && actionState?.type === 'cancel'
                                const isActioning = isRetrying || isCancelling
                                
                                const acceptedPaper = papers.find(p => p.conferenceId === ticket.conferenceId && ['ACCEPTED', 'PUBLISHED'].includes(p.status))

                                const ticketFields = [
                                    { label: 'Registration Number', value: <span className="font-mono font-semibold">{ticket.registrationNumber}</span> },
                                    { label: 'Ticket Type', value: ticket.ticketTypeName },
                                    { label: 'Payment Status', value: (
                                        <Badge className={
                                            isPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                            isFailed ? 'bg-red-100 text-red-800 border-red-200' :
                                            'bg-amber-100 text-amber-800 border-amber-200'
                                        }>
                                            {isPaid ? '✅ Confirmed' : isFailed ? '❌ Payment Failed' : '⏳ Pending'}
                                        </Badge>
                                    )},
                                    { label: 'Amount', value: ticket.price === 0 ? 'Free' : `${ticket.price.toLocaleString()} ${ticket.currency || 'VND'}` },
                                    { label: 'Attendee Name', value: ticket.userName },
                                    { label: 'Email', value: ticket.userEmail },
                                    { label: 'Check-in', value: ticket.isCheckedIn ? <Badge className="bg-emerald-100 text-emerald-800">Checked In</Badge> : <span className="text-muted-foreground text-sm">Not checked in</span> },
                                ]

                                return (
                                    <React.Fragment key={ticket.id}>
                                        <TableRow className="cursor-pointer hover:bg-muted/30" onClick={() => setExpandedId(isExpanded ? null : ticket.id)}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{ticket.registrationNumber || ticket.id}</TableCell>
                                            <TableCell className="font-medium text-indigo-700">{ticket.conferenceName}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{ticket.ticketTypeName}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={
                                                    isPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                                    isFailed ? 'bg-red-100 text-red-800 border-red-200' :
                                                    'bg-amber-100 text-amber-800 border-amber-200'
                                                }>
                                                    {isPaid ? '✅ Confirmed' : isFailed ? '❌ Failed' : '⏳ Pending'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : ticket.id); }}>
                                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        
                                        {isExpanded && (
                                            <TableRow className="bg-muted/10">
                                                <TableCell colSpan={5} className="py-6 px-6">
                                                    <div className="flex flex-col xl:flex-row gap-6">
                                                        {/* Ticket Fields Table */}
                                                        <div className="flex-1 rounded-lg border overflow-hidden bg-background max-w-xl shadow-sm">
                                                            <div className={`h-1.5 ${isPaid ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : canRetry ? 'bg-gradient-to-r from-amber-400 to-amber-300' : 'bg-gradient-to-r from-gray-300 to-gray-200'}`} />
                                                            <Table>
                                                                <TableBody>
                                                                    {ticketFields.map(f => (
                                                                        <TableRow key={f.label}>
                                                                            <TableCell className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-40 border-r bg-muted/10">{f.label}</TableCell>
                                                                            <TableCell className="text-sm font-medium">{f.value}</TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                            {/* Actions for PENDING or FAILED payment */}
                                                            {canRetry && (
                                                                <div className="border-t p-4 bg-amber-50">
                                                                    <p className="text-xs text-amber-700 font-medium mb-3">
                                                                        {isFailed ? '❌ Payment failed — retry payment or cancel to re-register with a different ticket.' : '⏳ Payment incomplete — complete payment or cancel to re-register.'}
                                                                    </p>
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            className="flex-1 h-8 text-xs"
                                                                            disabled={isActioning}
                                                                            onClick={(e) => { e.stopPropagation(); handleRetryPayment(ticket); }}
                                                                        >
                                                                            {isRetrying ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
                                                                            {isRetrying ? 'Redirecting...' : 'Retry Payment'}
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="flex-1 h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                                                            disabled={isActioning}
                                                                            onClick={(e) => { e.stopPropagation(); handleCancelTicket(ticket); }}
                                                                        >
                                                                            {isCancelling ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
                                                                            {isCancelling ? 'Cancelling...' : 'Cancel & Re-register'}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Documents and QR */}
                                                        {isPaid && (
                                                            <div className="flex flex-col md:flex-row gap-6 flex-1">
                                                                {/* Documents table */}
                                                                <div className="flex-1">
                                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Documents</p>
                                                                    <div className="rounded-lg border overflow-hidden bg-background shadow-sm">
                                                                        <Table>
                                                                            <TableHeader>
                                                                                <TableRow className="bg-muted/30">
                                                                                    <TableHead>Document</TableHead>
                                                                                    <TableHead className="w-24 text-center">Status</TableHead>
                                                                                    <TableHead className="w-24 text-right">Action</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {[
                                                                                    { label: 'Acceptance Letter', type: 'acceptance', docId: acceptedPaper?.id, available: !!acceptedPaper },
                                                                                    { label: 'Invoice', type: 'invoice', docId: ticket.id, available: isPaid },
                                                                                    { label: 'Certificate', type: 'certificate', docId: ticket.id, available: !!ticket.isCheckedIn },
                                                                                ].map(doc => {
                                                                                    const isDownloading = downloading?.type === doc.type && downloading?.id === ticket.id
                                                                                    return (
                                                                                        <TableRow key={doc.type}>
                                                                                            <TableCell className="text-sm font-medium">{doc.label}</TableCell>
                                                                                            <TableCell className="text-center">
                                                                                                <Badge className={doc.available ? 'bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]' : 'bg-gray-100 text-gray-500 border-gray-200 text-[10px]'}>
                                                                                                    {doc.available ? 'Available' : 'N/A'}
                                                                                                </Badge>
                                                                                            </TableCell>
                                                                                            <TableCell className="text-right">
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="sm"
                                                                                                    className="h-7 gap-1.5 text-xs"
                                                                                                    disabled={!doc.available || !doc.docId || isDownloading}
                                                                                                    onClick={() => doc.docId && handleDownload(doc.type, doc.docId, ticket.id)}
                                                                                                >
                                                                                                    {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                                                                                    Download
                                                                                                </Button>
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    )
                                                                                })}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </div>
                                                                </div>

                                                                {/* QR Code */}
                                                                <div className="flex flex-col items-center bg-background border rounded-xl p-5 shrink-0 justify-center min-w-[200px] shadow-sm">
                                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Check-in QR Code</p>
                                                                    {qrDataUrl ? (
                                                                        <img src={qrDataUrl} alt="QR Code" className="w-36 h-36 rounded-lg shadow-sm border border-gray-100" />
                                                                    ) : (
                                                                        <div className="w-36 h-36 bg-muted/50 rounded-lg flex items-center justify-center">
                                                                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                                                        </div>
                                                                    )}
                                                                    <p className="text-[10px] text-muted-foreground mt-3 font-mono">{ticket.registrationNumber}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
