"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
    BarChart3,
    BookOpen,
    CheckCircle2,
    CreditCard,
    ExternalLink,
    FileText,
    FolderOpen,
    Users,
} from "lucide-react"
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/dashboard/stat-card"
import { getConferences, getConferenceStats } from "@/app/api/conference.api"
import { getUsers } from "@/app/api/user.api"
import { getConferencePaymentHistory } from "@/app/api/registration.api"
import type { ConferenceListResponse } from "@/types/conference"
import type { PaymentHistoryResponse } from "@/app/api/registration.api"

// ── Chart Configs ──
const barChartConfig: ChartConfig = {
    papers: { label: "Papers", color: "hsl(262 83% 58%)" },
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
    ACTIVE:     "bg-emerald-100 text-emerald-700 border-emerald-200",
    PENDING:    "bg-amber-100 text-amber-700 border-amber-200",
    COMPLETED:  "bg-blue-100 text-blue-700 border-blue-200",
    CANCELLED:  "bg-rose-100 text-rose-700 border-rose-200",
    IN_REVIEW:  "bg-violet-100 text-violet-700 border-violet-200",
}

interface SystemStats {
    totalConferences: number
    activeConferences: number
    pendingConferences: number
    totalPapers: number
    totalUsers: number
    totalRevenue: number
    totalReviews: number
    papersByStatus: Record<string, number>
    recentConferences: ConferenceListResponse[]
    recentPayments: PaymentHistoryResponse[]
    revenueByMonth: { month: string; revenue: number; count: number }[]
    conferencesPapers: { name: string; papers: number }[]
}

function groupRevenueByMonth(payments: PaymentHistoryResponse[]): { month: string; revenue: number; count: number }[] {
    const map: Record<string, { revenue: number; count: number }> = {}
    const now = new Date()
    // Init last 6 months
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

export default function DashboardPage() {
    const [stats, setStats] = useState<SystemStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const loadStats = useCallback(async () => {
        try {
            setIsLoading(true)

            // Fetch all conferences and users in parallel
            const [conferences, users] = await Promise.all([
                getConferences(),
                getUsers(),
            ])

            const activeConferences = conferences.filter(c => c.status === "ACTIVE")
            const pendingConferences = conferences.filter(c => c.status === "PENDING")

            // Fetch stats + payment per conference (top 10 to limit requests)
            const sample = conferences.slice(0, 10)
            const [statsResults, paymentResults] = await Promise.all([
                Promise.allSettled(sample.map(c => getConferenceStats(c.id))),
                Promise.allSettled(sample.map(c => getConferencePaymentHistory(c.id))),
            ])

            // Aggregate paper stats
            const papersByStatus: Record<string, number> = {}
            let totalPapers = 0, totalReviews = 0
            statsResults.forEach(r => {
                if (r.status === "fulfilled") {
                    const s = r.value
                    totalPapers += s.totalPapers
                    totalReviews += s.totalReviews
                    const statuses = [
                        ["SUBMITTED", s.submitted],
                        ["UNDER_REVIEW", s.underReview],
                        ["ACCEPTED", s.accepted],
                        ["REJECTED", s.rejected],
                    ] as [string, number][]
                    statuses.forEach(([k, v]) => {
                        papersByStatus[k] = (papersByStatus[k] || 0) + v
                    })
                }
            })

            // Aggregate payments
            const allPayments: PaymentHistoryResponse[] = []
            let totalRevenue = 0
            paymentResults.forEach(r => {
                if (r.status === "fulfilled") {
                    r.value.forEach(p => {
                        allPayments.push(p)
                        if (p.outcome === "PAID" && p.amount) totalRevenue += p.amount
                    })
                }
            })

            // Conferences by paper count chart (top 8)
            const conferencesPapers = statsResults
                .map((r, i) => ({
                    name: sample[i]?.acronym || sample[i]?.name?.substring(0, 12) || "",
                    papers: r.status === "fulfilled" ? r.value.totalPapers : 0,
                }))
                .filter(c => c.papers > 0)
                .sort((a, b) => b.papers - a.papers)
                .slice(0, 8)

            setStats({
                totalConferences: conferences.length,
                activeConferences: activeConferences.length,
                pendingConferences: pendingConferences.length,
                totalPapers,
                totalUsers: users.length,
                totalRevenue,
                totalReviews,
                papersByStatus,
                recentConferences: conferences.slice(0, 5),
                recentPayments: allPayments.slice(0, 8),
                revenueByMonth: groupRevenueByMonth(allPayments),
                conferencesPapers,
            })
        } catch (err) {
            console.error("Failed to load dashboard stats:", err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { loadStats() }, [loadStats])

    const pieData = stats
        ? Object.entries(stats.papersByStatus).map(([k, v]) => ({
            name: k,
            value: v,
            fill: pieChartConfig[k]?.color ?? pieChartConfig.OTHER.color,
          }))
        : []

    return (
        <div className="flex flex-col gap-6 pb-8">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        System overview — ConfHub Conference Management
                    </p>
                </div>
                <Link
                    href="/conference"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    Public site <ExternalLink className="h-3.5 w-3.5" />
                </Link>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard
                    label="Total Conferences"
                    value={stats?.totalConferences ?? 0}
                    change={`${stats?.activeConferences ?? 0} active, ${stats?.pendingConferences ?? 0} pending`}
                    changePositive
                    icon={FolderOpen}
                    iconBg="bg-violet-50"
                    iconColor="text-violet-600"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Total Papers"
                    value={stats?.totalPapers ?? 0}
                    icon={FileText}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Registered Users"
                    value={stats?.totalUsers ?? 0}
                    icon={Users}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Total Revenue"
                    value={stats ? (stats.totalRevenue / 1_000_000).toFixed(1) : "0"}
                    suffix="M VND"
                    icon={CreditCard}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-600"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Total Reviews"
                    value={stats?.totalReviews ?? 0}
                    icon={CheckCircle2}
                    iconBg="bg-rose-50"
                    iconColor="text-rose-600"
                    isLoading={isLoading}
                />
            </div>

            {/* ── Charts Row 1 ── */}
            <div className="grid gap-4 lg:grid-cols-7">
                {/* Bar Chart: Papers per Conference */}
                <Card className="lg:col-span-4 border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-violet-600" />
                            Papers per Conference
                        </CardTitle>
                        <CardDescription>Top conferences by submission count</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading chart…</div>
                        ) : stats?.conferencesPapers.length ? (
                            <ChartContainer config={barChartConfig} className="h-48 w-full">
                                <BarChart data={stats.conferencesPapers} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="papers" fill="var(--color-papers)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data available</div>
                        )}
                    </CardContent>
                </Card>

                {/* Pie Chart: Paper Status Distribution */}
                <Card className="lg:col-span-3 border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            Paper Status Distribution
                        </CardTitle>
                        <CardDescription>Papers grouped by current status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading chart…</div>
                        ) : pieData.length ? (
                            <ChartContainer config={pieChartConfig} className="h-48 w-full">
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} paddingAngle={2}>
                                        {pieData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                                    <ChartLegend content={<ChartLegendContent />} />
                                </PieChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data available</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Charts Row 2 ── */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-amber-600" />
                        Revenue & Transactions (Last 6 Months)
                    </CardTitle>
                    <CardDescription>VNPay completed payments aggregated by month</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">Loading chart…</div>
                    ) : (
                        <ChartContainer config={revenueChartConfig} className="h-52 w-full">
                            <LineChart data={stats?.revenueByMonth ?? []} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                                    tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v.toString()} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <ChartTooltip
                                    content={<ChartTooltipContent />}
                                    formatter={(v, name) => [
                                        name === "revenue" ? `${Number(v).toLocaleString()} VND` : `${v} txns`,
                                        name === "revenue" ? "Revenue" : "Transactions",
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

            {/* ── Tables Row ── */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Recent Conferences */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-violet-600" />
                                Recent Conferences
                            </CardTitle>
                            <CardDescription>Latest conferences in system</CardDescription>
                        </div>
                        <Link href="/dashboard/conferences" className="text-xs text-violet-600 hover:underline font-medium">
                            View all →
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-muted-foreground">
                                    <th className="text-left py-2.5 px-6 font-medium">Name</th>
                                    <th className="text-left py-2.5 pr-6 font-medium">Area</th>
                                    <th className="text-left py-2.5 pr-4 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading
                                    ? Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            <td className="py-2.5 px-6"><div className="h-4 bg-muted rounded animate-pulse w-32" /></td>
                                            <td className="py-2.5 pr-6"><div className="h-4 bg-muted rounded animate-pulse w-20" /></td>
                                            <td className="py-2.5 pr-4"><div className="h-5 bg-muted rounded-full animate-pulse w-16" /></td>
                                        </tr>
                                    ))
                                    : stats?.recentConferences.map(c => (
                                        <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                            <td className="py-2.5 px-6">
                                                <Link href={`/conference/${c.id}`} className="font-medium hover:text-violet-600 transition-colors line-clamp-1">
                                                    {c.acronym || c.name}
                                                </Link>
                                            </td>
                                            <td className="py-2.5 pr-6 text-muted-foreground text-xs">{c.area || "—"}</td>
                                            <td className="py-2.5 pr-4">
                                                <Badge variant="outline" className={`text-[10px] font-medium border ${STATUS_COLOR[c.status] || "bg-gray-100 text-gray-600"}`}>
                                                    {c.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Recent Payments */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-amber-600" />
                                Recent Payments
                            </CardTitle>
                            <CardDescription>Latest VNPay transactions</CardDescription>
                        </div>
                        <Link href="/dashboard/finance" className="text-xs text-violet-600 hover:underline font-medium">
                            View all →
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-muted-foreground">
                                    <th className="text-left py-2.5 px-6 font-medium">Ref</th>
                                    <th className="text-right py-2.5 pr-4 font-medium">Amount</th>
                                    <th className="text-left py-2.5 pr-6 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading
                                    ? Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            <td className="py-2.5 px-6"><div className="h-4 bg-muted rounded animate-pulse w-28" /></td>
                                            <td className="py-2.5 pr-4"><div className="h-4 bg-muted rounded animate-pulse w-16 ml-auto" /></td>
                                            <td className="py-2.5 pr-6"><div className="h-5 bg-muted rounded-full animate-pulse w-14" /></td>
                                        </tr>
                                    ))
                                    : stats?.recentPayments.length
                                        ? stats.recentPayments.map((p, i) => (
                                            <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                <td className="py-2.5 px-6 font-mono text-xs text-muted-foreground">{p.vnpTxnRef?.slice(-10)}</td>
                                                <td className="py-2.5 pr-4 text-right font-medium">
                                                    {p.amount ? `${(p.amount / 1000).toFixed(0)}K` : "—"}
                                                </td>
                                                <td className="py-2.5 pr-6">
                                                    <Badge variant="outline" className={`text-[10px] font-medium border ${
                                                        p.outcome === "PAID" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                        : p.outcome === "FAILED" ? "bg-rose-100 text-rose-700 border-rose-200"
                                                        : "bg-gray-100 text-gray-600"
                                                    }`}>
                                                        {p.outcome}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                        : (
                                            <tr>
                                                <td colSpan={3} className="py-8 text-center text-muted-foreground text-sm">No payment records found</td>
                                            </tr>
                                        )
                                }
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
