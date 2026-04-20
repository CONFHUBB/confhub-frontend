"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { FileText, Search } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/dashboard/stat-card"
import { getConferences } from "@/app/api/conference.api"
import { getPapersByConference, updatePaperStatus } from "@/app/api/paper.api"
import type { PaperResponse, PaperStatus } from "@/types/paper"

const STATUS_OPTIONS: (PaperStatus | "ALL")[] = [
    "ALL", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "PUBLISHED", "WITHDRAWN",
]

const STATUS_COLOR: Record<PaperStatus | string, string> = {
    SUBMITTED:    "bg-blue-100 text-blue-700 border-blue-200",
    UNDER_REVIEW: "bg-indigo-100 text-indigo-700 border-indigo-200",
    ACCEPTED:     "bg-emerald-100 text-emerald-700 border-emerald-200",
    REJECTED:     "bg-rose-100 text-rose-700 border-rose-200",
    PUBLISHED:    "bg-amber-100 text-amber-700 border-amber-200",
    WITHDRAWN:    "bg-gray-100 text-gray-600 border-gray-200",
    DRAFT:        "bg-gray-100 text-gray-500 border-gray-200",
    CAMERA_READY: "bg-teal-100 text-teal-700 border-teal-200",
}

export default function PapersPage() {
    const searchParams = useSearchParams()
    const initialStatus = (searchParams.get("status") as PaperStatus | null) ?? "ALL"

    const [papers, setPapers] = useState<(PaperResponse & { conferenceName?: string })[]>([])
    const [filtered, setFiltered] = useState<typeof papers>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeFilter, setActiveFilter] = useState<PaperStatus | "ALL">(initialStatus as any)
    const [search, setSearch] = useState("")

    const load = useCallback(async () => {
        try {
            setIsLoading(true)
            const conferences = await getConferences()
            const sample = conferences.slice(0, 15) // limit to avoid N+1 overload

            const results = await Promise.allSettled(
                sample.map(async (c) => {
                    const ps = await getPapersByConference(c.id)
                    return ps.map(p => ({ ...p, conferenceName: c.acronym || c.name }))
                })
            )

            const all: typeof papers = []
            results.forEach(r => {
                if (r.status === "fulfilled") all.push(...r.value)
            })

            setPapers(all)
        } catch {
            toast.error("Failed to load papers")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        let result = papers
        if (activeFilter !== "ALL") result = result.filter(p => p.status === activeFilter)
        if (search.trim()) {
            const q = search.toLowerCase()
            result = result.filter(p =>
                p.title?.toLowerCase().includes(q) ||
                p.conferenceName?.toLowerCase().includes(q) ||
                p.authorNames?.some(a => a.toLowerCase().includes(q))
            )
        }
        setFiltered(result)
    }, [papers, activeFilter, search])

    const handleStatusChange = async (paperId: number, status: PaperStatus) => {
        try {
            await updatePaperStatus(paperId, status)
            toast.success("Paper status updated")
            await load()
        } catch {
            toast.error("Failed to update status")
        }
    }

    const counts = {
        total: papers.length,
        submitted: papers.filter(p => p.status === "SUBMITTED").length,
        underReview: papers.filter(p => p.status === "UNDER_REVIEW").length,
        accepted: papers.filter(p => p.status === "ACCEPTED").length,
        rejected: papers.filter(p => p.status === "REJECTED").length,
    }

    return (
        <div className="flex flex-col gap-6 pb-8 min-w-0 overflow-hidden">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Papers</h1>
                <p className="text-muted-foreground text-sm mt-0.5">Manage all research papers submitted across conferences</p>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                <StatCard label="Total" value={counts.total} icon={FileText} iconBg="bg-indigo-50" iconColor="text-indigo-600" isLoading={isLoading} />
                <StatCard label="Submitted" value={counts.submitted} icon={FileText} iconBg="bg-blue-50" iconColor="text-blue-600" isLoading={isLoading} />
                <StatCard label="Under Review" value={counts.underReview} icon={FileText} iconBg="bg-indigo-50" iconColor="text-indigo-600" isLoading={isLoading} />
                <StatCard label="Accepted" value={counts.accepted} icon={FileText} iconBg="bg-emerald-50" iconColor="text-emerald-600" isLoading={isLoading} />
                <StatCard label="Rejected" value={counts.rejected} icon={FileText} iconBg="bg-rose-50" iconColor="text-rose-600" isLoading={isLoading} />
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold">All Papers</CardTitle>
                            <CardDescription>{filtered.length} paper{filtered.length !== 1 ? "s" : ""} found</CardDescription>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input placeholder="Search papers…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 w-48 text-sm" />
                        </div>
                    </div>
                    {/* Status Filters */}
                    <div className="flex gap-1.5 flex-wrap mt-2">
                        {STATUS_OPTIONS.map(s => (
                            <button key={s} onClick={() => setActiveFilter(s)}
                                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                                    activeFilter === s ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                            >{s}</button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-muted-foreground bg-muted/30">
                                    <th className="text-left py-3 px-6 font-medium">Title</th>
                                    <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">Conference</th>
                                    <th className="text-left py-3 pr-4 font-medium hidden lg:table-cell">Authors</th>
                                    <th className="text-left py-3 pr-4 font-medium">Status</th>
                                    <th className="text-right py-3 pr-6 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading
                                    ? Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            {[200, 120, 160, 60, 80].map((w, j) => (
                                                <td key={j} className="py-3 px-4">
                                                    <Skeleton className={`h-4 w-[${w}px]`} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                    : filtered.length === 0
                                        ? <tr><td colSpan={5} className="py-16 text-center text-muted-foreground">No papers found</td></tr>
                                        : filtered.map(p => (
                                            <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-6 max-w-[260px]">
                                                    <Link href={`/paper/${p.id}`} className="font-medium hover:text-indigo-600 transition-colors line-clamp-2">
                                                        {p.title}
                                                    </Link>
                                                </td>
                                                <td className="py-3 pr-4 text-muted-foreground text-xs hidden md:table-cell">{p.conferenceName}</td>
                                                <td className="py-3 pr-4 text-muted-foreground text-xs hidden lg:table-cell max-w-[180px]">
                                                    {p.authorNames?.slice(0, 2).join(", ")}{(p.authorNames?.length ?? 0) > 2 ? "…" : ""}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <Badge variant="outline" className={`text-[10px] font-medium border ${STATUS_COLOR[p.status]}`}>
                                                        {p.status?.replace("_", " ")}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 pr-6">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                                            <Link href={`/paper/${p.id}`}>View</Link>
                                                        </Button>
                                                        {p.status === "UNDER_REVIEW" && (
                                                            <>
                                                                <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                                                    onClick={() => handleStatusChange(p.id, "ACCEPTED")}>
                                                                    Accept
                                                                </Button>
                                                                <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                                                                    onClick={() => handleStatusChange(p.id, "REJECTED")}>
                                                                    Reject
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
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
