"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getMyPaymentHistory, PaymentHistoryResponse } from "@/app/api/registration.api"
import { getUserByEmail } from "@/app/api/user.api"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, CreditCard } from "lucide-react"
import { toast } from 'sonner'
import { getCurrentUserEmail } from '@/lib/auth'

export default function GlobalPaymentHistoryPage() {
    const router = useRouter()
    const [history, setHistory] = useState<PaymentHistoryResponse[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const email = getCurrentUserEmail()
            if (!email) return router.push("/auth/login")
            const user = await getUserByEmail(email)
            if (!user || !user.id) return
            
            const data = await getMyPaymentHistory(user.id)
            setHistory(data || [])
        } catch (error) {
            console.error(error)
            toast.error("Failed to load payment history. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="page-base space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Payment History</h1>
                <p className="text-sm text-muted-foreground mt-1">Audit log of all your transactions across conferences</p>
            </div>

            {history.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground bg-white border rounded-xl">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <h2 className="text-lg font-semibold text-gray-900">No Transactions Found</h2>
                    <p className="text-sm mt-1">You haven't made any payments yet.</p>
                </div>
            ) : (
                <div className="rounded-xl border overflow-hidden bg-white shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead>Type</TableHead>
                                <TableHead>Conference</TableHead>
                                <TableHead className="w-32">Amount (VND)</TableHead>
                                <TableHead>VNPay Ref</TableHead>
                                <TableHead>Date / Time</TableHead>
                                <TableHead>Bank</TableHead>
                                <TableHead className="w-28 text-center">Status</TableHead>
                                <TableHead className="w-28 text-center">Outcome</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map(item => (
                                <TableRow key={item.id} className="hover:bg-muted/30">
                                    <TableCell>
                                        {item.paymentType === 'SUBSCRIPTION' ? (
                                            <Badge className="bg-purple-100 text-purple-800 border-purple-200">Subscription</Badge>
                                        ) : (
                                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                                Ticket {item.ticketId ? `#${item.ticketId}` : ''}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium max-w-[200px] truncate">
                                        {item.conferenceName || '—'}
                                    </TableCell>
                                    <TableCell className="font-semibold text-indigo-700">
                                        {item.amount?.toLocaleString() || '—'}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {item.vnpTxnRef}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {new Date(item.recordedAt).toLocaleString('en-US', {
                                            month: 'short', day: 'numeric', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {item.bankCode || '—'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {item.vnpTransactionStatus === '00' ? (
                                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Success</Badge>
                                        ) : item.vnpTransactionStatus ? (
                                            <Badge className="bg-red-100 text-red-800 border-red-200">Failed ({item.vnpTransactionStatus})</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={item.outcome === 'PAID' ? 'default' : 'destructive'} 
                                            className={item.outcome === 'PAID' ? "bg-emerald-600" : ""}>
                                            {item.outcome}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
