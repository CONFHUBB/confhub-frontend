"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { BookOpen, Users, ListChecks } from "lucide-react"
import { toast } from "sonner"
import { RadialBar, RadialBarChart } from "recharts"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/dashboard/stat-card"
import { getAllReviews } from "@/app/api/review.api"
import type { ReviewResponse, ReviewStatus } from "@/types/review"
import { Button } from "@/components/ui/button"

const STATUS_COLOR: Record<ReviewStatus, string> = {
    ASSIGNED:    "bg-blue-100 text-blue-700 border-blue-200",
    IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200",
    COMPLETED:   "bg-emerald-100 text-emerald-700 border-emerald-200",
    DECLINED:    "bg-rose-100 text-rose-700 border-rose-200",
}

const radialConfig: ChartConfig = {
    COMPLETED:   { label: "Completed",   color: "hsl(142 76% 36%)" },
    IN_PROGRESS: { label: "In Progress", color: "hsl(48 96% 53%)" },
    ASSIGNED:    { label: "Assigned",    color: "hsl(217 91% 60%)" },
    DECLINED:    { label: "Declined",    color: "hsl(0 84% 60%)" },
}

export default function ReviewsPage() {
    const searchParams = useSearchParams()
    const activeTab = searchParams.get("tab") ?? "pipeline"

    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<ReviewStatus | "ALL">("ALL")

    const load = useCallback(async () => {
        try {
            setIsLoading(true)
            const data = await getAllReviews(0, 500)
            // Handle both paginated ({ content: [] }) and non-paginated ([]) responses
            const content: ReviewResponse[] = Array.isArray(data)
                ? data
                : (data?.content ?? [])
            setReviews(content)
        } catch (err: any) {
            console.error("Failed to load reviews:", err)
            toast.error(err?.response?.data?.message || "Failed to load reviews. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const counts = {
        total: reviews.length,
        assigned: reviews.filter(r => r.status === "ASSIGNED").length,
        inProgress: reviews.filter(r => r.status === "IN_PROGRESS").length,
        completed: reviews.filter(r => r.status === "COMPLETED").length,
        declined: reviews.filter(r => r.status === "DECLINED").length,
    }

    const completionRate = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0

    const radialData = [
        { name: "COMPLETED",   value: counts.completed,   fill: radialConfig.COMPLETED.color },
        { name: "IN_PROGRESS", value: counts.inProgress,  fill: radialConfig.IN_PROGRESS.color },
        { name: "ASSIGNED",    value: counts.assigned,    fill: radialConfig.ASSIGNED.color },
        { name: "DECLINED",    value: counts.declined,    fill: radialConfig.DECLINED.color },
    ].filter(d => d.value > 0)

    const filtered = statusFilter === "ALL"
        ? reviews
        : reviews.filter(r => r.status === statusFilter)

    const isPipeline = activeTab !== "assignments"

    return (
        <div className="flex flex-col gap-6 pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {isPipeline ? "Monitor the peer review pipeline across all conferences" : "Review assignments and workload distribution"}
                    </p>
                </div>
                {/* Tab Switcher */}
                <div className="flex gap-1 rounded-lg bg-muted p-1">
                    <Button
                        variant={isPipeline ? "default" : "ghost"}
                        size="sm"
                        className={`gap-1.5 text-xs ${isPipeline ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                        onClick={() => window.location.href = "/dashboard/reviews"}
                    >
                        <BookOpen className="h-3.5 w-3.5" />
                        Pipeline
                    </Button>
                    <Button
                        variant={!isPipeline ? "default" : "ghost"}
                        size="sm"
                        className={`gap-1.5 text-xs ${!isPipeline ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                        onClick={() => window.location.href = "/dashboard/reviews?tab=assignments"}
                    >
                        <ListChecks className="h-3.5 w-3.5" />
                        Assignments
                    </Button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                <StatCard label="Total Reviews" value={counts.total} icon={BookOpen} iconBg="bg-indigo-50" iconColor="text-indigo-600" isLoading={isLoading} />
                <StatCard label="Assigned" value={counts.assigned} icon={BookOpen} iconBg="bg-blue-50" iconColor="text-blue-600" isLoading={isLoading} />
                <StatCard label="In Progress" value={counts.inProgress} icon={BookOpen} iconBg="bg-amber-50" iconColor="text-amber-600" isLoading={isLoading} />
                <StatCard label="Completed" value={counts.completed} icon={BookOpen} iconBg="bg-emerald-50" iconColor="text-emerald-600" isLoading={isLoading} />
                <StatCard label="Declined" value={counts.declined} icon={BookOpen} iconBg="bg-rose-50" iconColor="text-rose-600" isLoading={isLoading} />
            </div>

            <div className="grid gap-4 lg:grid-cols-7">
                {/* Radial Chart */}
                <Card className="lg:col-span-3 border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">Review Pipeline</CardTitle>
                        <CardDescription>Distribution by review status</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        {isLoading ? (
                            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm w-full">Loading chart…</div>
                        ) : (
                            <>
                                <ChartContainer config={radialConfig} className="h-52 w-full">
                                    <RadialBarChart data={radialData} innerRadius="30%" outerRadius="80%" startAngle={90} endAngle={-270}>
                                        <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "hsl(var(--muted))" }} />
                                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                                    </RadialBarChart>
                                </ChartContainer>
                                <div className="text-center -mt-2">
                                    <p className="text-3xl font-bold">{completionRate}%</p>
                                    <p className="text-xs text-muted-foreground">Completion rate</p>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 justify-center">
                                    {radialData.map(d => (
                                        <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <span className="h-2 w-2 rounded-full inline-block" style={{ background: d.fill }} />
                                            {radialConfig[d.name as keyof typeof radialConfig]?.label}: {d.value}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Reviews Table */}
                <Card className="lg:col-span-4 border-0 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base font-semibold">Review List</CardTitle>
                        <CardDescription>{filtered.length} reviews</CardDescription>
                        <div className="flex gap-1.5 flex-wrap mt-2">
                            {(["ALL", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "DECLINED"] as const).map(s => (
                                <button key={s} onClick={() => setStatusFilter(s)}
                                    className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                                        statusFilter === s ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                                >{s}</button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-y-auto max-h-80">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-background">
                                    <tr className="border-b text-muted-foreground bg-muted/30">
                                        <th className="text-left py-2.5 px-4 font-medium">Paper</th>
                                        <th className="text-left py-2.5 pr-4 font-medium hidden md:table-cell">Reviewer</th>
                                        <th className="text-left py-2.5 pr-4 font-medium">Status</th>
                                        <th className="text-right py-2.5 pr-4 font-medium hidden lg:table-cell">Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading
                                        ? Array.from({ length: 6 }).map((_, i) => (
                                            <tr key={i} className="border-b last:border-0">
                                                {[3, 3, 2, 1].map((_, j) => (
                                                    <td key={j} className="py-2.5 px-4"><Skeleton className="h-4 w-full" /></td>
                                                ))}
                                            </tr>
                                        ))
                                        : filtered.length === 0
                                            ? <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">No reviews found</td></tr>
                                            : filtered.slice(0, 30).map(r => (
                                                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                                    <td className="py-2.5 px-4 max-w-[180px]">
                                                        <p className="font-medium line-clamp-1">{r.paper?.title}</p>
                                                    </td>
                                                    <td className="py-2.5 pr-4 text-muted-foreground text-xs hidden md:table-cell">
                                                        {r.reviewer?.firstName} {r.reviewer?.lastName}
                                                    </td>
                                                    <td className="py-2.5 pr-4">
                                                        <Badge variant="outline" className={`text-[10px] font-medium border ${STATUS_COLOR[r.status]}`}>
                                                            {r.status?.replace("_", " ")}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-2.5 pr-4 text-right font-semibold hidden lg:table-cell">
                                                        {r.totalScore != null ? r.totalScore.toFixed(1) : "—"}
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
        </div>
    )
}
