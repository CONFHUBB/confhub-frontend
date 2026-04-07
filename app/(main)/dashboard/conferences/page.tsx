"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
    CheckCircle2,
    FolderOpen,
    PlusCircle,
    Search,
    XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/dashboard/stat-card"
import {
    getConferences,
    approveConference,
    cancelConference,
    completeConference,
} from "@/app/api/conference.api"
import type { ConferenceListResponse } from "@/types/conference"

const STATUS_OPTIONS = ["ALL", "ACTIVE", "PENDING", "COMPLETED", "CANCELLED"]

const STATUS_COLOR: Record<string, string> = {
    ACTIVE:    "bg-emerald-100 text-emerald-700 border-emerald-200",
    PENDING:   "bg-amber-100 text-amber-700 border-amber-200",
    COMPLETED: "bg-blue-100 text-blue-700 border-blue-200",
    CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
}

export default function ConferencesPage() {
    const searchParams = useSearchParams()
    const initialStatus = searchParams.get("status") ?? "ALL"

    const [conferences, setConferences] = useState<ConferenceListResponse[]>([])
    const [filtered, setFiltered] = useState<ConferenceListResponse[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeFilter, setActiveFilter] = useState(initialStatus)
    const [search, setSearch] = useState("")
    const [actionLoading, setActionLoading] = useState<number | null>(null)

    const load = useCallback(async () => {
        try {
            setIsLoading(true)
            const data = await getConferences()
            setConferences(data)
        } catch {
            toast.error("Failed to load conferences")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        let result = conferences
        if (activeFilter !== "ALL") result = result.filter(c => c.status === activeFilter)
        if (search.trim()) {
            const q = search.toLowerCase()
            result = result.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.acronym?.toLowerCase().includes(q) ||
                c.area?.toLowerCase().includes(q)
            )
        }
        setFiltered(result)
    }, [conferences, activeFilter, search])

    const handleAction = async (id: number, action: "approve" | "cancel" | "complete") => {
        setActionLoading(id)
        try {
            if (action === "approve") await approveConference(id)
            else if (action === "cancel") await cancelConference(id)
            else await completeConference(id)
            toast.success(`Conference ${action}d successfully`)
            await load()
        } catch {
            toast.error(`Failed to ${action} conference`)
        } finally {
            setActionLoading(null)
        }
    }

    const counts = {
        total: conferences.length,
        active: conferences.filter(c => c.status === "ACTIVE").length,
        pending: conferences.filter(c => c.status === "PENDING").length,
        completed: conferences.filter(c => c.status === "COMPLETED").length,
    }

    return (
        <div className="flex flex-col gap-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Conferences</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">Manage all conferences in the system</p>
                </div>
                <Button asChild size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                    <Link href="/conference/create">
                        <PlusCircle className="h-4 w-4" />
                        Create Conference
                    </Link>
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total" value={counts.total} icon={FolderOpen} iconBg="bg-violet-50" iconColor="text-violet-600" isLoading={isLoading} />
                <StatCard label="Active" value={counts.active} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" isLoading={isLoading} />
                <StatCard label="Pending Approval" value={counts.pending} icon={FolderOpen} iconBg="bg-amber-50" iconColor="text-amber-600" isLoading={isLoading} />
                <StatCard label="Completed" value={counts.completed} icon={FolderOpen} iconBg="bg-blue-50" iconColor="text-blue-600" isLoading={isLoading} />
            </div>

            {/* Table Card */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold">All Conferences</CardTitle>
                            <CardDescription>{filtered.length} conference{filtered.length !== 1 ? "s" : ""} found</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search conferences…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-8 h-8 w-48 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                    {/* Status Filter Tabs */}
                    <div className="flex gap-1.5 flex-wrap mt-2">
                        {STATUS_OPTIONS.map(s => (
                            <button
                                key={s}
                                onClick={() => setActiveFilter(s)}
                                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                                    activeFilter === s
                                        ? "bg-violet-600 text-white"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-muted-foreground bg-muted/30">
                                    <th className="text-left py-3 px-6 font-medium">Conference</th>
                                    <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">Area</th>
                                    <th className="text-left py-3 pr-4 font-medium hidden lg:table-cell">Location</th>
                                    <th className="text-left py-3 pr-4 font-medium">Status</th>
                                    <th className="text-left py-3 pr-6 font-medium hidden sm:table-cell">Start Date</th>
                                    <th className="text-right py-3 pr-6 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading
                                    ? Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            {Array.from({ length: 6 }).map((_, j) => (
                                                <td key={j} className="py-3 px-4">
                                                    <Skeleton className="h-4 w-full max-w-[120px]" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                    : filtered.length === 0
                                        ? (
                                            <tr>
                                                <td colSpan={6} className="py-16 text-center text-muted-foreground">
                                                    No conferences found
                                                </td>
                                            </tr>
                                          )
                                        : filtered.map(c => (
                                            <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-6">
                                                    <div>
                                                        <Link href={`/conference/${c.id}`} className="font-semibold hover:text-violet-600 transition-colors">
                                                            {c.acronym || c.name}
                                                        </Link>
                                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{c.name}</p>
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">{c.area || "—"}</td>
                                                <td className="py-3 pr-4 text-muted-foreground hidden lg:table-cell">{c.country || "—"}</td>
                                                <td className="py-3 pr-4">
                                                    <Badge variant="outline" className={`text-[10px] font-medium border ${STATUS_COLOR[c.status] || "bg-gray-100 text-gray-600"}`}>
                                                        {c.status}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 pr-4 text-muted-foreground text-xs hidden sm:table-cell">
                                                    {c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"}
                                                </td>
                                                <td className="py-3 pr-6">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                                            <Link href={`/conference/${c.id}`}>View</Link>
                                                        </Button>
                                                        {c.status === "PENDING" && (
                                                            <Button
                                                                size="sm"
                                                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                                                                onClick={() => handleAction(c.id, "approve")}
                                                                disabled={actionLoading === c.id}
                                                            >
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Approve
                                                            </Button>
                                                        )}
                                                        {c.status === "ACTIVE" && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
                                                                onClick={() => handleAction(c.id, "cancel")}
                                                                disabled={actionLoading === c.id}
                                                            >
                                                                <XCircle className="h-3 w-3" />
                                                                Cancel
                                                            </Button>
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
