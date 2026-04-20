"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
    BarChart3,
    CheckCircle2,
    CreditCard,
    ExternalLink,
    FileText,
    FolderOpen,
    Users,
    AlertCircle,
    RefreshCw,
    Eye,
    MoreHorizontal,
} from "lucide-react"
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    XAxis,
    YAxis,
    Line,
    LineChart,
} from "recharts"
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/dashboard/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { getConferences, getConferenceStats } from "@/app/api/conference.api"
import { getUsers } from "@/app/api/user.api"
import { getConferencePaymentHistory } from "@/app/api/registration.api"
import type { ConferenceListResponse } from "@/types/conference"
import type { PaymentHistoryResponse } from "@/app/api/registration.api"
import { dashboardMessages as msg } from "@/lib/dashboard-messages"
import { cn } from "@/lib/utils"
import { fmtDate } from "@/lib/utils"
import type { ColumnDef } from "@tanstack/react-table"

// ── Chart Configs ──
const barChartConfig: ChartConfig = {
    papers: { label: "Papers", color: "#8B5CF6" },
}
const pieChartConfig: ChartConfig = {
    SUBMITTED:    { label: "Submitted",    color: "hsl(217 91% 60%)" },
    UNDER_REVIEW: { label: "Under Review", color: "hsl(262 83% 58%)" },
    ACCEPTED:     { label: "Accepted",     color: "hsl(142 76% 36%)" },
    REJECTED:     { label: "Rejected",     color: "hsl(0 84% 60%)" },
    PUBLISHED:    { label: "Published",    color: "hsl(48 96% 53%)" },
    OTHER:        { label: "Other",        color: "hsl(215 16% 47%)" },
}
const revenueChartConfig: ChartConfig = {
    revenue: { label: "Revenue (VND)", color: "hsl(262 83% 58%)" },
    count:   { label: "Transactions",  color: "hsl(142 76% 36%)" },
}

const STATUS_COLOR: Record<string, string> = {
    PENDING_APPROVAL: "bg-amber-100 text-amber-700 border-amber-200",
    SETUP:            "bg-blue-100 text-blue-700 border-blue-200",
    OPEN:             "bg-emerald-100 text-emerald-700 border-emerald-200",
    COMPLETED:        "bg-gray-100 text-gray-600 border-gray-200",
    CANCELLED:        "bg-rose-100 text-rose-700 border-rose-200",
}

interface SystemStats {
    totalConferences: number
    pendingConferences: number
    setupConferences: number
    openConferences: number
    completedConferences: number
    cancelledConferences: number
    totalPapers: number
    totalUsers: number
    totalRevenue: number
    totalReviews: number
    papersByStatus: Record<string, number>
    recentConferences: ConferenceListResponse[]
    recentPayments: PaymentHistoryResponse[]
    revenueByMonth: { month: string; revenue: number; count: number }[]
    conferencesPapers: { name: string; papers: number }[]
    allConferences: ConferenceListResponse[]
    allPayments: PaymentHistoryResponse[]
}

function groupRevenueByMonth(payments: PaymentHistoryResponse[]): { month: string; revenue: number; count: number }[] {
    const map: Record<string, { revenue: number; count: number }> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" })
        map[key] = { revenue: 0, count: 0 }
    }
    payments.forEach((p) => {
        if (p.outcome === "PAID" && p.payDate && p.amount) {
            const d = new Date(p.payDate)
            const key = d.toLocaleString("default", { month: "short", year: "2-digit" })
            if (map[key]) {
                map[key].revenue += p.amount
                map[key].count += 1
            }
        }
    })
    return Object.entries(map).map(([month, v]) => ({ month, ...v }))
}

// ── Conference Table Column Definitions ──
const conferenceColumns: ColumnDef<ConferenceListResponse>[] = [
    {
        accessorKey: "acronym",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Conference" />,
        cell: ({ row }) => (
            <div className="flex flex-col">
                <Link
                    href={`/conference/${row.original.id}`}
                    className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1"
                >
                    {row.original.acronym || row.original.name}
                </Link>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {row.original.name}
                </span>
            </div>
        ),
    },
    {
        accessorKey: "area",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Area" />,
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
                {row.original.area || "—"}
            </span>
        ),
    },
    {
        accessorKey: "location",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
                {row.original.location || "—"}
            </span>
        ),
    },
    {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
            <Badge
                variant="outline"
                className={cn(
                    "text-[10px] font-medium border",
                    STATUS_COLOR[row.original.status] || "bg-gray-100 text-gray-600"
                )}
            >
                {row.original.status}
            </Badge>
        ),
    },
    {
        accessorKey: "startDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
                {row.original.startDate ? fmtDate(row.original.startDate) : "—"}
            </span>
        ),
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="flex items-center justify-end gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                    <Link href={`/conference/${row.original.id}`}>
                        <Eye className="h-3 w-3" />
                        View
                    </Link>
                </Button>
            </div>
        ),
    },
]

// ── Payment Table Column Definitions ──
const paymentColumns: ColumnDef<PaymentHistoryResponse>[] = [
    {
        accessorKey: "vnpTxnRef",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
        cell: ({ row }) => (
            <span className="font-mono text-xs text-muted-foreground">
                {row.original.vnpTxnRef?.slice(-12) || "—"}
            </span>
        ),
    },
    {
        accessorKey: "amount",
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Bank" />,
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
                {row.original.bankCode || "—"}
            </span>
        ),
    },
    {
        accessorKey: "outcome",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Outcome" />,
        cell: ({ row }) => (
            <Badge
                variant="outline"
                className={cn(
                    "text-[10px] font-medium border",
                    row.original.outcome === "PAID"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : row.original.outcome === "FAILED"
                        ? "bg-rose-100 text-rose-700 border-rose-200"
                        : "bg-gray-100 text-gray-600"
                )}
            >
                {row.original.outcome}
            </Badge>
        ),
    },
    {
        accessorKey: "payDate",
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

export default function DashboardPage() {
    const [stats, setStats] = useState<SystemStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadStats = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)

            const [conferences, users] = await Promise.all([
                getConferences(),
                getUsers(),
            ])

            const pendingConferences = conferences.filter((c) => c.status === "PENDING_APPROVAL")
            const setupConferences = conferences.filter((c) => c.status === "SETUP")
            const openConferences = conferences.filter((c) => c.status === "OPEN")
            const completedConferences = conferences.filter((c) => c.status === "COMPLETED")
            const cancelledConferences = conferences.filter((c) => c.status === "CANCELLED")

            const [statsResults, paymentResults] = await Promise.all([
                Promise.allSettled(conferences.map((c) => getConferenceStats(c.id))),
                Promise.allSettled(conferences.map((c) => getConferencePaymentHistory(c.id))),
            ])

            const papersByStatus: Record<string, number> = {}
            let totalPapers = 0,
                totalReviews = 0
            statsResults.forEach((r) => {
                if (r.status === "fulfilled") {
                    const s = r.value
                    totalPapers += s.totalPapers
                    totalReviews += s.totalReviews
                    const statuses: [string, number][] = [
                        ["SUBMITTED", s.submitted],
                        ["UNDER_REVIEW", s.underReview],
                        ["ACCEPTED", s.accepted],
                        ["REJECTED", s.rejected],
                    ]
                    statuses.forEach(([k, v]) => {
                        if (v > 0) {
                            papersByStatus[k] = (papersByStatus[k] || 0) + v
                        }
                    })
                }
            })

            const allPayments: PaymentHistoryResponse[] = []
            let totalRevenue = 0
            paymentResults.forEach((r) => {
                if (r.status === "fulfilled") {
                    r.value.forEach((p) => {
                        allPayments.push(p)
                        if (p.outcome === "PAID" && p.amount) totalRevenue += p.amount
                    })
                }
            })

            const conferencesPapers = statsResults
                .map((r, i) => ({
                    name: conferences[i]?.acronym || conferences[i]?.name?.substring(0, 12) || "",
                    papers: r.status === "fulfilled" ? r.value.totalPapers : 0,
                }))
                .filter((c) => c.papers > 0)
                .sort((a, b) => b.papers - a.papers)
                .slice(0, 10)

            setStats({
                totalConferences: conferences.length,
                pendingConferences: pendingConferences.length,
                setupConferences: setupConferences.length,
                openConferences: openConferences.length,
                completedConferences: completedConferences.length,
                cancelledConferences: cancelledConferences.length,
                totalPapers,
                totalUsers: users.length,
                totalRevenue,
                totalReviews,
                papersByStatus,
                recentConferences: conferences.slice(0, 5),
                recentPayments: allPayments.slice(0, 8),
                revenueByMonth: groupRevenueByMonth(allPayments),
                conferencesPapers,
                allConferences: conferences,
                allPayments: allPayments,
            })
        } catch (err) {
            console.error("Failed to load dashboard stats:", err)
            setError(msg.errorTitle)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadStats()
    }, [loadStats])

    const pieData = stats
        ? Object.entries(stats.papersByStatus).map(([k, v]) => ({
              name: k,
              value: v,
              fill: pieChartConfig[k]?.color ?? pieChartConfig.OTHER.color,
          }))
        : []

    return (
        <div className="flex flex-col gap-6 pb-8 min-w-0 overflow-hidden">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{msg.title}</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">{msg.description}</p>
                </div>
                <Link
                    href="/conference"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    {msg.publicSite} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard
                    label={msg.totalConferences}
                    value={stats?.totalConferences ?? 0}
                    change={`${stats?.openConferences ?? 0} open, ${stats?.pendingConferences ?? 0} pending`}
                    changePositive
                    icon={FolderOpen}
                    iconBg="bg-primary/10"
                    iconColor="text-primary"
                    isLoading={isLoading}
                />
                <StatCard
                    label={msg.totalPapers}
                    value={stats?.totalPapers ?? 0}
                    icon={FileText}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                    isLoading={isLoading}
                />
                <StatCard
                    label={msg.registeredUsers}
                    value={stats?.totalUsers ?? 0}
                    icon={Users}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                    isLoading={isLoading}
                />
                <StatCard
                    label={msg.totalRevenue}
                    value={stats ? (stats.totalRevenue / 1_000_000).toFixed(1) : "0"}
                    suffix="M VND"
                    icon={CreditCard}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-600"
                    isLoading={isLoading}
                />
                <StatCard
                    label={msg.totalReviews}
                    value={stats?.totalReviews ?? 0}
                    icon={CheckCircle2}
                    iconBg="bg-rose-50"
                    iconColor="text-rose-600"
                    isLoading={isLoading}
                />
            </div>

            {/* ── Error State ── */}
            {error && (
                <Card className="border border-destructive/30 bg-destructive/5">
                    <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-6 px-6">
                        <AlertCircle className="h-8 w-8 text-destructive shrink-0" aria-hidden="true" />
                        <div className="flex flex-col gap-1 text-center sm:text-left">
                            <p className="font-semibold text-sm text-foreground">{msg.errorTitle}</p>
                            <p className="text-sm text-muted-foreground">{msg.errorDesc}</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadStats}
                            className="ml-auto shrink-0 gap-1.5"
                        >
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                            {msg.retry}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* ── Charts Row 1 ── */}
            <div className="grid gap-4 lg:grid-cols-7 min-w-0">
                {/* Bar Chart: Papers per Conference */}
                <Card className="lg:col-span-4 border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
                            {msg.papersPerConference}
                        </CardTitle>
                        <CardDescription>{msg.papersPerConferenceDesc}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm" role="status" aria-live="polite">{msg.loading}</div>
                        ) : stats && stats.conferencesPapers.length > 0 ? (
                            <ChartContainer config={barChartConfig} className="h-48 w-full" role="img" aria-label={msg.papersPerConferenceDesc}>
                                <BarChart data={stats.conferencesPapers} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="papers" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-sm gap-1">
                                <FileText className="h-8 w-8 text-muted-foreground/30 mb-1" aria-hidden="true" />
                                <span>{msg.noData}</span>
                                <span className="text-xs">Conference paper submissions will appear here once available.</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pie Chart: Paper Status Distribution */}
                <Card className="lg:col-span-3 border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" aria-hidden="true" />
                            {msg.paperStatusDistribution}
                        </CardTitle>
                        <CardDescription>{msg.paperStatusDistributionDesc}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm" role="status" aria-live="polite">{msg.loading}</div>
                        ) : pieData.length > 0 ? (
                            <ChartContainer config={pieChartConfig} className="h-48 w-full" role="img" aria-label={msg.paperStatusDistributionDesc}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={72}
                                        paddingAngle={2}
                                    >
                                        {pieData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                                    <ChartLegend content={<ChartLegendContent />} />
                                </PieChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-sm gap-1">
                                <BarChart3 className="h-8 w-8 text-muted-foreground/30 mb-1" aria-hidden="true" />
                                <span>{msg.noData}</span>
                                <span className="text-xs">Paper statuses will appear once submissions are reviewed.</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Charts Row 2 ── */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-amber-600" aria-hidden="true" />
                        {msg.revenueTransactions}
                    </CardTitle>
                    <CardDescription>{msg.revenueTransactionsDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="h-52 flex items-center justify-center text-muted-foreground text-sm" role="status" aria-live="polite">{msg.loading}</div>
                    ) : (
                        <ChartContainer config={revenueChartConfig} className="h-52 w-full" role="img" aria-label={msg.revenueTransactionsDesc}>
                            <LineChart data={stats?.revenueByMonth ?? []} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis
                                    yAxisId="left"
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v.toString())}
                                />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <ChartTooltip
                                    content={<ChartTooltipContent />}
                                    formatter={(v, name) => [
                                        name === "revenue"
                                            ? `${Number(v).toLocaleString()} VND`
                                            : `${v} ${msg.transactions}`,
                                        name === "revenue" ? msg.revenue : msg.transactions,
                                    ]}
                                />
                                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                                <Line yAxisId="right" type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                                <ChartLegend content={<ChartLegendContent />} />
                            </LineChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>

            {/* ── Tables Row — Full-width DataTables ── */}
            <div className="flex flex-col gap-6 min-w-0 overflow-hidden">
                {/* All Conferences Table */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <FolderOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                                    All Conferences
                                </CardTitle>
                                <CardDescription>
                                    {isLoading ? "Loading…" : `${stats?.allConferences.length ?? 0} conference${(stats?.allConferences.length ?? 0) !== 1 ? "s" : ""} in system`}
                                </CardDescription>
                            </div>
                            <Link href="/dashboard/conferences" className="text-xs text-primary hover:underline font-medium shrink-0">
                                {msg.viewAll}
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 min-w-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading conferences…</div>
                        ) : (
                            <div className="min-w-0 overflow-x-auto">
                            <DataTable
                                columns={conferenceColumns}
                                data={stats?.allConferences ?? []}
                                searchColumn="acronym"
                                searchPlaceholder="Search conferences…"
                            />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* All Payments Table */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-amber-600" aria-hidden="true" />
                                    All Payments
                                </CardTitle>
                                <CardDescription>
                                    {isLoading
                                        ? "Loading…"
                                        : `${stats?.allPayments.length ?? 0} transaction${(stats?.allPayments.length ?? 0) !== 1 ? "s" : ""} total`}
                                </CardDescription>
                            </div>
                            <Link href="/dashboard/finance" className="text-xs text-primary hover:underline font-medium shrink-0">
                                {msg.viewAll}
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 min-w-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading payments…</div>
                        ) : (
                            <div className="min-w-0 overflow-x-auto">
                            <DataTable
                                columns={paymentColumns}
                                data={stats?.allPayments ?? []}
                                searchColumn="vnpTxnRef"
                                searchPlaceholder="Search transactions…"
                            />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
