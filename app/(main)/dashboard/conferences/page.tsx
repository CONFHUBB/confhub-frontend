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
    CalendarClock,
    PlayCircle,

    Check,
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
    rejectConference,
} from "@/app/api/conference.api"
import type { ConferenceListResponse } from "@/types/conference"

const STATUS_OPTIONS = ["ALL", "PENDING_APPROVAL", "SETUP", "APPROVED", "REJECTED", "PENDING_PAYMENT", "OPEN", "COMPLETED", "CANCELLED"]

const STATUS_COLOR: Record<string, string> = {
    PENDING_APPROVAL: "bg-amber-100 text-amber-700 border-amber-200",
    SETUP:            "bg-blue-100 text-blue-700 border-blue-200",
    APPROVED:         "bg-emerald-100 text-emerald-700 border-emerald-200",
    REJECTED:         "bg-rose-100 text-rose-700 border-rose-200",
    PENDING_PAYMENT:  "bg-orange-100 text-orange-700 border-orange-200",
    OPEN:             "bg-emerald-100 text-emerald-700 border-emerald-200",
    COMPLETED:        "bg-gray-100 text-gray-600 border-gray-200",
    CANCELLED:        "bg-rose-100 text-rose-700 border-rose-200",
}

const STATUS_ICON: Record<string, React.ReactNode> = {
    PENDING_APPROVAL: <CalendarClock className="h-3 w-3" />,
    SETUP:            <CalendarClock className="h-3 w-3" />,
    APPROVED:         <CheckCircle2 className="h-3 w-3" />,
    REJECTED:         <XCircle className="h-3 w-3" />,
    PENDING_PAYMENT:  <CalendarClock className="h-3 w-3" />,
    OPEN:             <PlayCircle className="h-3 w-3" />,
    COMPLETED:        <Check className="h-3 w-3" />,
    CANCELLED:        <XCircle className="h-3 w-3" />,
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
    const [rejectDialogId, setRejectDialogId] = useState<number | null>(null)
    const [rejectReason, setRejectReason] = useState("")

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

    const handleAction = async (id: number, action: "approve" | "cancel") => {
        setActionLoading(id)
        try {
            if (action === "approve") await approveConference(id)
            else await cancelConference(id)
            toast.success(`Conference ${action}d successfully`)
            await load()
        } catch {
            toast.error(`Failed to ${action} conference`)
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async () => {
        if (!rejectDialogId) return
        setActionLoading(rejectDialogId)
        try {
            await rejectConference(rejectDialogId, rejectReason || 'No reason specified')
            toast.success('Conference rejected successfully')
            setRejectDialogId(null)
            setRejectReason('')
            await load()
        } catch {
            toast.error('Failed to reject conference')
        } finally {
            setActionLoading(null)
        }
    }

    const counts = {
        total: conferences.length,
        pending: conferences.filter(c => c.status === "PENDING_APPROVAL").length,
        setup: conferences.filter(c => c.status === "SETUP").length,
        approved: conferences.filter(c => c.status === "APPROVED").length,
        rejected: conferences.filter(c => c.status === "REJECTED").length,
        open: conferences.filter(c => c.status === "OPEN").length,
        completed: conferences.filter(c => c.status === "COMPLETED").length,
        cancelled: conferences.filter(c => c.status === "CANCELLED").length,
    }

    return (
        <>
        <div className="flex flex-col gap-6 pb-8 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Conferences</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">Manage all conferences in the system</p>
                </div>
                <Button asChild size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 shrink-0">
                    <Link href="/conference/create">
                        <PlusCircle className="h-4 w-4" />
                        Create Conference
                    </Link>
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 min-w-0 overflow-x-auto">
                <StatCard label="Total" value={counts.total} icon={FolderOpen} iconBg="bg-indigo-50" iconColor="text-indigo-600" isLoading={isLoading} />
                <StatCard label="Pending" value={counts.pending} icon={CalendarClock} iconBg="bg-amber-50" iconColor="text-amber-600" isLoading={isLoading} />
                <StatCard label="Setup" value={counts.setup} icon={CalendarClock} iconBg="bg-blue-50" iconColor="text-blue-600" isLoading={isLoading} />
                <StatCard label="Open" value={counts.open} icon={PlayCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600" isLoading={isLoading} />
                <StatCard label="Completed" value={counts.completed} icon={Check} iconBg="bg-gray-50" iconColor="text-gray-600" isLoading={isLoading} />
                <StatCard label="Cancelled" value={counts.cancelled} icon={XCircle} iconBg="bg-rose-50" iconColor="text-rose-600" isLoading={isLoading} />
            </div>

            {/* Table Card */}
            <Card className="border-0 shadow-sm min-w-0">
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
                                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
                                    activeFilter === s
                                        ? "bg-indigo-600 text-white"
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
                        <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
                            <colgroup>
                                <col style={{ width: "200px" }} />
                                <col style={{ width: "120px" }} className="hidden md:table-cell" />
                                <col style={{ width: "160px" }} className="hidden lg:table-cell" />
                                <col style={{ width: "120px" }} />
                                <col style={{ width: "100px" }} className="hidden sm:table-cell" />
                                <col style={{ width: "140px" }} />
                            </colgroup>
                            <thead>
                                <tr className="border-b text-muted-foreground bg-muted/30">
                                    <th className="text-left py-3 px-6 font-medium overflow-hidden">Conference</th>
                                    <th className="text-left py-3 pr-4 font-medium hidden md:table-cell overflow-hidden">Area</th>
                                    <th className="text-left py-3 pr-4 font-medium hidden lg:table-cell overflow-hidden">Location</th>
                                    <th className="text-left py-3 pr-4 font-medium overflow-hidden">Status</th>
                                    <th className="text-left py-3 pr-6 font-medium hidden sm:table-cell overflow-hidden">Start Date</th>
                                    <th className="text-right py-3 pr-6 font-medium overflow-hidden">Actions</th>
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
                                                <td className="py-3 px-6 overflow-hidden">
                                                    <div>
                                                        <Link href={`/conference/${c.id}`} className="font-semibold hover:text-indigo-600 transition-colors">
                                                            {c.acronym || c.name}
                                                        </Link>
                                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 overflow-hidden text-ellipsis">{c.name}</p>
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell max-w-[120px] truncate overflow-hidden">{c.area || "—"}</td>
                                                <td className="py-3 pr-4 text-muted-foreground hidden lg:table-cell max-w-[160px] truncate overflow-hidden">{c.country || "—"}</td>
                                                <td className="py-3 pr-4 overflow-hidden">
                                                    <Badge variant="outline" className={`text-[10px] font-medium border gap-1 ${STATUS_COLOR[c.status] || "bg-gray-100 text-gray-600"}`}>
                                                        {STATUS_ICON[c.status]}
                                                        <span className="truncate">{c.status}</span>
                                                    </Badge>
                                                </td>
                                                <td className="py-3 pr-4 text-muted-foreground text-xs hidden sm:table-cell max-w-[100px] truncate overflow-hidden">
                                                    {c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"}
                                                </td>
                                                <td className="py-3 pr-6 overflow-hidden">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                                            <Link href={`/conference/${c.id}`}>View</Link>
                                                        </Button>
                                                        {/* Only PENDING conferences can be approved */}
                                                        {c.status === "PENDING_APPROVAL" && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                                                                    onClick={() => handleAction(c.id, "approve")}
                                                                    disabled={actionLoading === c.id}
                                                                >
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
                                                                    onClick={() => { setRejectDialogId(c.id); setRejectReason('') }}
                                                                    disabled={actionLoading === c.id}
                                                                >
                                                                    <XCircle className="h-3 w-3" />
                                                                    Reject
                                                                </Button>
                                                            </>
                                                        )}
                                                        {/* Cancel only for conferences that are not already cancelled/completed */}
                                                        {c.status !== "CANCELLED" && c.status !== "COMPLETED" && c.status !== "PENDING_APPROVAL" && (
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

        {/* Reject Dialog */}
        {rejectDialogId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
                    <h3 className="text-lg font-semibold">Reject Conference</h3>
                    <p className="text-sm text-muted-foreground">Please provide a reason for rejecting this conference. The organizer will see this reason.</p>
                    <textarea
                        className="w-full border rounded-lg p-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter rejection reason..."
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setRejectDialogId(null)}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                            onClick={handleReject}
                            disabled={!rejectReason.trim() || actionLoading !== null}
                        >
                            Confirm Reject
                        </Button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}
