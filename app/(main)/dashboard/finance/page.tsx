"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import {
    Area,
    AreaChart,
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts"
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { CreditCard, Download, Search } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/dashboard/stat-card"
import { getConferencePaymentHistory, getTicketTypes, exportAllInvoices } from "@/app/api/registration.api"
import type { PaymentHistoryResponse, TicketTypeResponse } from "@/app/api/registration.api"
import { getConferences } from "@/app/api/conference.api"

const revenueChartConfig: ChartConfig = {
    paid:   { label: "Paid Revenue (VND)", color: "hsl(262 83% 58%)" },
    failed: { label: "Failed Transactions", color: "hsl(0 84% 60%)" },
}

const OUTCOME_COLOR: Record<string, string> = {
    PAID:    "bg-emerald-100 text-emerald-700 border-emerald-200",
    FAILED:  "bg-rose-100 text-rose-700 border-rose-200",
    INVALID: "bg-gray-100 text-gray-600 border-gray-200",
}

function groupByMonth(payments: PaymentHistoryResponse[]) {
    const map: Record<string, { month: string; paid: number; failed: number }> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" })
        map[key] = { month: key, paid: 0, failed: 0 }
    }
    payments.forEach(p => {
        if (!p.payDate) return
        const d = new Date(p.payDate)
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" })
        if (!map[key]) return
        if (p.outcome === "PAID" && p.amount) map[key].paid += p.amount
        else if (p.outcome === "FAILED") map[key].failed += 1
    })
    return Object.values(map)
}

export default function FinancePage() {
    const searchParams = useSearchParams()
    const activeTab = searchParams.get("tab") ?? "revenue"

    const [payments, setPayments] = useState<PaymentHistoryResponse[]>([])
    const [tickets, setTickets] = useState<TicketTypeResponse[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [outcomeFilter, setOutcomeFilter] = useState("ALL")
    const [exportConf, setExportConf] = useState<number | null>(null)
    const [conferences, setConferences] = useState<{ id: number; name: string; acronym: string }[]>([])

    const load = useCallback(async () => {
        try {
            setIsLoading(true)
            const confs = await getConferences()
            setConferences(confs.map(c => ({ id: c.id, name: c.name, acronym: c.acronym })))
            const sample = confs.slice(0, 10)

            const [paymentResults, ticketResults] = await Promise.all([
                Promise.allSettled(sample.map(c => getConferencePaymentHistory(c.id))),
                Promise.allSettled(sample.map(c => getTicketTypes(c.id, false))),
            ])

            const allPayments: PaymentHistoryResponse[] = []
            paymentResults.forEach(r => { if (r.status === "fulfilled") allPayments.push(...r.value) })
            allPayments.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())

            const allTickets: TicketTypeResponse[] = []
            ticketResults.forEach(r => { if (r.status === "fulfilled") allTickets.push(...r.value) })

            setPayments(allPayments)
            setTickets(allTickets)
        } catch {
            toast.error("Failed to load finance data")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const filteredPayments = payments.filter(p => {
        if (outcomeFilter !== "ALL" && p.outcome !== outcomeFilter) return false
        if (search.trim()) {
            const q = search.toLowerCase()
            return p.vnpTxnRef?.toLowerCase().includes(q) || p.bankCode?.toLowerCase().includes(q)
        }
        return true
    })

    const totalRevenue = payments.filter(p => p.outcome === "PAID").reduce((s, p) => s + (p.amount ?? 0), 0)
    const completedCount = payments.filter(p => p.outcome === "PAID").length
    const failedCount = payments.filter(p => p.outcome === "FAILED").length
    const pendingRevenue = tickets.reduce((s, t) => s + t.price * (t.quantitySold ?? 0), 0)

    const handleExportInvoices = async (conferenceId: number) => {
        try {
            setExportConf(conferenceId)
            const blob = await exportAllInvoices(conferenceId)
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `invoices-${conferenceId}.pdf`
            a.click()
            URL.revokeObjectURL(url)
            toast.success("Invoices exported")
        } catch {
            toast.error("Failed to export invoices")
        } finally {
            setExportConf(null)
        }
    }

    const chartData = groupByMonth(payments)

    return (
        <div className="flex flex-col gap-6 pb-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
                <p className="text-muted-foreground text-sm mt-0.5">Revenue, payments, and ticket management</p>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Revenue"
                    value={(totalRevenue / 1_000_000).toFixed(2)}
                    suffix="M VND"
                    icon={CreditCard} iconBg="bg-indigo-50" iconColor="text-indigo-600" isLoading={isLoading}
                />
                <StatCard label="Completed" value={completedCount} icon={CreditCard} iconBg="bg-emerald-50" iconColor="text-emerald-600" isLoading={isLoading} />
                <StatCard label="Failed" value={failedCount} icon={CreditCard} iconBg="bg-rose-50" iconColor="text-rose-600" isLoading={isLoading} />
                <StatCard label="Ticket Types" value={tickets.length} icon={CreditCard} iconBg="bg-amber-50" iconColor="text-amber-600" isLoading={isLoading} />
            </div>

            {/* Revenue Chart */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-indigo-600" />
                        Revenue Trend (Last 6 Months)
                    </CardTitle>
                    <CardDescription>VNPay payment outcomes aggregated by month</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">Loading chart…</div>
                    ) : (
                        <ChartContainer config={revenueChartConfig} className="h-52 w-full">
                            <AreaChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                                    tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v.toString()} />
                                <ChartTooltip content={<ChartTooltipContent />}
                                    formatter={(v, name) => [
                                        name === "paid" ? `${Number(v).toLocaleString()} VND` : `${v} txns`, name,
                                    ]}
                                />
                                <Area type="monotone" dataKey="paid" stroke="hsl(262 83% 58%)" fill="url(#colorPaid)" strokeWidth={2} />
                                <ChartLegend content={<ChartLegendContent />} />
                            </AreaChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>

            {/* Payments Table */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold">Payment History</CardTitle>
                            <CardDescription>{filteredPayments.length} transactions</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input placeholder="Search ref, bank…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 w-40 text-sm" />
                            </div>
                            {conferences[0] && (
                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                                    onClick={() => handleExportInvoices(conferences[0].id)}
                                    disabled={exportConf !== null}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Export Invoices
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                        {["ALL", "PAID", "FAILED", "INVALID"].map(o => (
                            <button key={o} onClick={() => setOutcomeFilter(o)}
                                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                                    outcomeFilter === o ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                            >{o}</button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-muted-foreground bg-muted/30">
                                    <th className="text-left py-3 px-6 font-medium">Tx Ref</th>
                                    <th className="text-right py-3 pr-4 font-medium">Amount</th>
                                    <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">Bank</th>
                                    <th className="text-left py-3 pr-4 font-medium">Outcome</th>
                                    <th className="text-left py-3 pr-6 font-medium hidden lg:table-cell">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading
                                    ? Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            {[5, 3, 2, 2, 3].map((_, j) => (
                                                <td key={j} className="py-3 px-4"><Skeleton className="h-4 w-full" /></td>
                                            ))}
                                        </tr>
                                    ))
                                    : filteredPayments.length === 0
                                        ? <tr><td colSpan={5} className="py-16 text-center text-muted-foreground">No transactions found</td></tr>
                                        : filteredPayments.slice(0, 50).map((p, i) => (
                                            <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-6 font-mono text-xs">{p.vnpTxnRef}</td>
                                                <td className="py-3 pr-4 text-right font-semibold">
                                                    {p.amount ? `${(p.amount / 1000).toLocaleString()}K` : "—"}
                                                </td>
                                                <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">{p.bankCode || "—"}</td>
                                                <td className="py-3 pr-4">
                                                    <Badge variant="outline" className={`text-[10px] font-medium border ${OUTCOME_COLOR[p.outcome]}`}>
                                                        {p.outcome}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 pr-6 text-muted-foreground text-xs hidden lg:table-cell">
                                                    {p.payDate ? new Date(p.payDate).toLocaleDateString() : p.recordedAt ? new Date(p.recordedAt).toLocaleDateString() : "—"}
                                                </td>
                                            </tr>
                                        ))
                                }
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
