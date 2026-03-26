"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getMyTickets, TicketResponse } from "@/app/api/registration.api"
import { getPapersByAuthor } from "@/app/api/paper.api"
import { PaperResponse } from "@/types/paper"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Download, Loader2, Ticket } from "lucide-react"
import QRCode from "qrcode"
import { downloadAcceptanceLetter, downloadCertificate, downloadInvoice, downloadVisaLetter } from "@/app/api/document.api"
import { toast } from "react-hot-toast"

export default function MyGlobalTicketsPage() {
    const router = useRouter()
    const [tickets, setTickets] = useState<TicketResponse[]>([])
    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<number | null>(null)
    const [qrDataUrls, setQrDataUrls] = useState<Record<number, string>>({})
    const [downloading, setDownloading] = useState<{ type: string; id: number } | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const token = localStorage.getItem("accessToken")
            if (!token) return router.push("/auth/login")
            const payload = JSON.parse(atob(token.split(".")[1]))
            const email = payload.sub
            // fetch user based on email (simplified, actual implementation might need user API)
            // For now, we decode userId directly if it's there or we make a call:
            // Assuming we have to get user id:
            const userRes = await fetch(`/api/v1/users/email/${email}`)
            const user = await userRes.json()
            if (!user || !user.id) return
            
            const [tData, pData] = await Promise.all([
                getMyTickets(user.id),
                getPapersByAuthor(user.id)
            ])
            setTickets(tData || [])
            setPapers(pData || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        tickets.forEach(ticket => {
            if (ticket.qrCode && !qrDataUrls[ticket.id]) {
                QRCode.toDataURL(ticket.qrCode, { width: 180, margin: 2 })
                    .then(url => setQrDataUrls(prev => ({ ...prev, [ticket.id]: url })))
                    .catch(() => {})
            }
        })
    }, [tickets, qrDataUrls])

    const handleDownload = async (type: string, id: number, ticketId: number) => {
        try {
            setDownloading({ type, id: ticketId })
            if (type === 'acceptance') await downloadAcceptanceLetter(id)
            if (type === 'invoice') await downloadInvoice(id)
            if (type === 'visa') await downloadVisaLetter(id)
            if (type === 'certificate') await downloadCertificate(id)
            toast.success('Download started')
        } catch { toast.error('Download failed') }
        finally { setDownloading(null) }
    }

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
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
                                const isExpanded = expandedId === ticket.id
                                const qrDataUrl = qrDataUrls[ticket.id]
                                
                                const acceptedPaper = papers.find(p => p.conferenceId === ticket.conferenceId && ['ACCEPTED', 'PUBLISHED'].includes(p.status))

                                const ticketFields = [
                                    { label: 'Registration Number', value: <span className="font-mono font-semibold">{ticket.registrationNumber}</span> },
                                    { label: 'Ticket Type', value: ticket.ticketTypeName },
                                    { label: 'Payment Status', value: (
                                        <Badge className={isPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                                            {isPaid ? '✅ Confirmed' : '⏳ Pending'}
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
                                                <Badge className={isPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                                                    {isPaid ? '✅ Confirmed' : '⏳ Pending'}
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
                                                            <div className={`h-1.5 ${isPaid ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-amber-400 to-amber-300'}`} />
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
                                                                                    { label: 'Visa Letter', type: 'visa', docId: ticket.id, available: isPaid },
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
