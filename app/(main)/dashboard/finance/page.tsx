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
import { StatCard } from "@/components/dashboard/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { getConferencePaymentHistory, getTicketTypes, exportAllInvoices } from "@/app/api/registration.api"
import type { PaymentHistoryResponse, TicketTypeResponse } from "@/app/api/registration.api"
import { getConferences } from "@/app/api/conference.api"
import { cn } from "@/lib/utils"
import { fmtDate } from "@/lib/utils"
import type { ColumnDef } from "@tanstack/react-table"

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
    payments.forEach((p) => {
        if (!p.payDate) return
        const d = new Date(p.payDate)
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" })
        if (!map[key]) return
        if (p.outcome === "PAID" && p.amount) map[key].paid += p.amount
        else if (p.outcome === "FAILED") map[key].failed += 1
    })
    return Object.values(map)
}

// ── Payment Table Columns ──
const paymentColumns: ColumnDef<PaymentHistoryResponse>[] = [
    {
        accessorKey: "vnpTxnRef",
        id: "vnpTxnRef",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Transaction Ref" />,
        cell: ({ row }) => (
            <span className="font-mono text-xs text-muted-foreground">
                {row.original.vnpTxnRef || "—"}
            </span>
        ),
    },
    {
        accessorKey: "amount",
        id: "amount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => (
            <span className="text-sm font-medium">
                {row.original.amount
                    ? `${(row.original.amount / 1000).toLocaleString()}K`
                    : "—"}
            </span>
        ),
    },
    {
        accessorKey: "bankCode",
        id: "bankCode",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Bank" />,
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
                {row.original.bankCode || "—"}
            </span>
        ),
    },
    {
        accessorKey: "outcome",
        id: "outcome",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Outcome" />,
        cell: ({ row }) => (
            <Badge
                variant="outline"
                className={cn(
                    "text-[10px] font-medium border",
                    OUTCOME_COLOR[row.original.outcome] || "bg-gray-100 text-gray-600"
                )}
            >
                {row.original.outcome}
            </Badge>
        ),
    },
    {
        accessorKey: "payDate",
        id: "payDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
                {row.original.payDate
                    ? fmtDate(row.original.payDate)
                    : row.original.recordedAt
                    ? fmtDate(row.original.recordedAt)
                    : "—"}
            </span>
        ),
    },
]

export default function FinancePage() {
    const searchParams = useSearchParams()
    const activeTab = searchParams.get("tab") ?? "revenue"

    const [payments, setPayments] = useState<PaymentHistoryResponse[]>([])
    const [tickets, setTickets] = useState<TicketTypeResponse[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [exportConf, setExportConf] = useState<number | null>(null)
    const [conferences, setConferences] = useState<{ id: number; name: string; acronym: string }[]>([])

    const load = useCallback(async () => {
        try {
            setIsLoading(true)
            const confs = await getConferences()
            setConferences(confs.map((c) => ({ id: c.id, name: c.name, acronym: c.acronym })))
            const sample = confs.slice(0, 10)

            const [paymentResults, ticketResults] = await Promise.all([
                Promise.allSettled(sample.map((c) => getConferencePaymentHistory(c.id))),
                Promise.allSettled(sample.map((c) => getTicketTypes(c.id, false))),
            ])

            const allPayments: PaymentHistoryResponse[] = []
            paymentResults.forEach((r) => {
                if (r.status === "fulfilled") allPayments.push(...r.value)
            })
            // Sort newest first
            allPayments.sort(
                (a, b) =>
                    new Date(b.recordedAt ?? b.payDate ?? 0).getTime() -
                    new Date(a.recordedAt ?? a.payDate ?? 0).getTime()
            )

            const allTickets: TicketTypeResponse[] = []
            ticketResults.forEach((r) => {
                if (r.status === "fulfilled") allTickets.push(...r.value)
            })

            setPayments(allPayments)
            setTickets(allTickets)
        } catch {
            toast.error("Failed to load finance data")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const totalRevenue = payments
        .filter((p) => p.outcome === "PAID")
        .reduce((s, p) => s + (p.amount ?? 0), 0)
    const completedCount = payments.filter((p) => p.outcome === "PAID").length
    const failedCount = payments.filter((p) => p.outcome === "FAILED").length

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
        <div className="flex flex-col gap-6 pb-8 min-w-0 overflow-hidden">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                    Revenue, payments, and ticket management
                </p>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Revenue"
                    value={(totalRevenue / 1_000_000).toFixed(2)}
                    suffix="M VND"
                    icon={CreditCard}
                    iconBg="bg-indigo-50"
                    iconColor="text-indigo-600"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Completed"
                    value={completedCount}
                    icon={CreditCard}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Failed"
                    value={failedCount}
                    icon={CreditCard}
                    iconBg="bg-rose-50"
                    iconColor="text-rose-600"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Ticket Types"
                    value={tickets.length}
                    icon={CreditCard}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-600"
                    isLoading={isLoading}
                />
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
                <CardContent className="p-0 min-w-0 overflow-x-auto">
                    {isLoading ? (
                        <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                            Loading chart…
                        </div>
                    ) : (
                        <ChartContainer config={revenueChartConfig} className="h-52 w-full min-w-[500px]">
                            <AreaChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) =>
                                        v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v.toString()
                                    }
                                />
                                <ChartTooltip
                                    content={<ChartTooltipContent />}
                                    formatter={(v, name) => [
                                        name === "paid"
                                            ? `${Number(v).toLocaleString()} VND`
                                            : `${v} txns`,
                                        name,
                                    ]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="paid"
                                    stroke="hsl(262 83% 58%)"
                                    fill="url(#colorPaid)"
                                    strokeWidth={2}
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                            </AreaChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>

            {/* Payments Table */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold">Payment History</CardTitle>
                            <CardDescription>
                                {isLoading
                                    ? "Loading…"
                                    : `${payments.length} transaction${payments.length !== 1 ? "s" : ""}`}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {conferences[0] && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1.5"
                                    onClick={() => handleExportInvoices(conferences[0].id)}
                                    disabled={exportConf !== null}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Export Invoices
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 min-w-0 overflow-x-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                            Loading payments…
                        </div>
                    ) : (
                        <DataTable
                            columns={paymentColumns}
                            data={payments}
                            searchColumn="vnpTxnRef"
                            searchPlaceholder="Search by ref, bank…"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
