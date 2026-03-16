"use client"

import { useEffect, useState, useMemo } from "react"
import { getPapersByConference, updatePaperStatus } from "@/app/api/paper.api"
import type { PaperResponse, PaperStatus } from "@/types/paper"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, Search, FileText, X, Download, ChevronDown, ChevronUp } from "lucide-react"
import toast from "react-hot-toast"

interface PaperManagementProps {
    conferenceId: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700 border-gray-200" },
    SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700 border-blue-200" },
    UNDER_REVIEW: { label: "Under Review", color: "bg-amber-100 text-amber-700 border-amber-200" },
    ACCEPTED: { label: "Accepted", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" },
    WITHDRAWN: { label: "Withdrawn", color: "bg-gray-100 text-gray-500 border-gray-200" },
    CAMERA_READY: { label: "Camera Ready", color: "bg-purple-100 text-purple-700 border-purple-200" },
    PUBLISHED: { label: "Published", color: "bg-teal-100 text-teal-700 border-teal-200" },
}

export function PaperManagement({ conferenceId }: PaperManagementProps) {
    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [filterTrack, setFilterTrack] = useState<string>("all")
    const [sortKey, setSortKey] = useState<"title" | "status" | "date">("date")
    const [sortAsc, setSortAsc] = useState(false)
    const [selectedPaper, setSelectedPaper] = useState<PaperResponse | null>(null)
    const [updatingStatus, setUpdatingStatus] = useState<number | null>(null)

    useEffect(() => {
        const fetchPapers = async () => {
            try {
                setLoading(true)
                const data = await getPapersByConference(conferenceId)
                setPapers(data)
            } catch (err: any) {
                const msg = err?.response?.data?.message || "Failed to load papers"
                toast.error(msg)
            } finally {
                setLoading(false)
            }
        }
        fetchPapers()
    }, [conferenceId])

    // Extract unique track names
    const trackNames = useMemo(() => {
        const names = new Set(papers.map(p => p.trackName).filter(Boolean))
        return Array.from(names).sort()
    }, [papers])

    // Status counts
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        papers.forEach(p => {
            counts[p.status] = (counts[p.status] || 0) + 1
        })
        return counts
    }, [papers])

    // Filter + sort
    const filteredPapers = useMemo(() => {
        return papers
            .filter(p => {
                if (searchQuery) {
                    const q = searchQuery.toLowerCase()
                    if (!p.title.toLowerCase().includes(q) &&
                        !(p.abstractField || "").toLowerCase().includes(q)) {
                        return false
                    }
                }
                if (filterStatus !== "all" && p.status !== filterStatus) return false
                if (filterTrack !== "all" && p.trackName !== filterTrack) return false
                return true
            })
            .sort((a, b) => {
                let cmp = 0
                if (sortKey === "title") cmp = a.title.localeCompare(b.title)
                else if (sortKey === "status") cmp = a.status.localeCompare(b.status)
                else if (sortKey === "date") cmp = (a.submissionTime || "").localeCompare(b.submissionTime || "")
                return sortAsc ? cmp : -cmp
            })
    }, [papers, searchQuery, filterStatus, filterTrack, sortKey, sortAsc])

    const handleStatusChange = async (paperId: number, newStatus: string) => {
        try {
            setUpdatingStatus(paperId)
            await updatePaperStatus(paperId, newStatus)
            setPapers(prev => prev.map(p =>
                p.id === paperId ? { ...p, status: newStatus as PaperStatus } : p
            ))
            toast.success(`Paper status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`)
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Failed to update status"
            toast.error(msg)
        } finally {
            setUpdatingStatus(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold mb-2">Paper Management</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    View and manage all {papers.length} papers submitted to this conference.
                </p>
            </div>

            {/* Status summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                    const count = statusCounts[status] || 0
                    if (count === 0 && !["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"].includes(status)) return null
                    return (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
                            className={`rounded-lg border p-3 text-left transition-all hover:shadow-sm ${
                                filterStatus === status ? "ring-2 ring-primary" : ""
                            }`}
                        >
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-xs text-muted-foreground">{config.label}</p>
                        </button>
                    )
                })}
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        className="pl-10 h-10"
                        placeholder="Search by title or abstract..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {trackNames.length > 1 && (
                        <select
                            className="h-10 rounded-md border px-3 text-sm bg-white"
                            value={filterTrack}
                            onChange={e => setFilterTrack(e.target.value)}
                        >
                            <option value="all">All Tracks</option>
                            {trackNames.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    )}
                    <select
                        className="h-10 rounded-md border px-3 text-sm bg-white"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                    <select
                        className="h-10 rounded-md border px-3 text-sm bg-white"
                        value={sortKey}
                        onChange={e => setSortKey(e.target.value as any)}
                    >
                        <option value="date">Submission Date</option>
                        <option value="title">Title</option>
                        <option value="status">Status</option>
                    </select>
                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setSortAsc(!sortAsc)}>
                        {sortAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Papers table */}
            {filteredPapers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>{searchQuery || filterStatus !== "all" ? "No papers match your filters." : "No papers submitted yet."}</p>
                </div>
            ) : (
                <div className="overflow-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="px-4 py-3 text-left font-medium text-gray-600 w-12">#</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 w-32">Track</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 w-32">Status</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 w-40">Submitted</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600 w-28">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPapers.map((paper, i) => (
                                <tr key={paper.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{paper.id}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => setSelectedPaper(selectedPaper?.id === paper.id ? null : paper)}
                                            className="text-left hover:text-blue-600 transition-colors"
                                        >
                                            <p className="font-medium line-clamp-1">{paper.title}</p>
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-muted-foreground">{paper.track?.name || "-"}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge className={`text-xs ${STATUS_CONFIG[paper.status]?.color || ""}`}>
                                            {STATUS_CONFIG[paper.status]?.label || paper.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                        {paper.submissionTime
                                            ? new Date(paper.submissionTime).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                                            : "-"
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSelectedPaper(selectedPaper?.id === paper.id ? null : paper)}
                                        >
                                            {selectedPaper?.id === paper.id ? "Close" : "View"}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Paper detail panel */}
            {selectedPaper && (
                <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-lg">{selectedPaper.title}</CardTitle>
                                <CardDescription className="mt-1">
                                    Paper #{selectedPaper.id} · {selectedPaper.track?.name || "No track"} · 
                                    <Badge className={`ml-2 text-xs ${STATUS_CONFIG[selectedPaper.status]?.color || ""}`}>
                                        {STATUS_CONFIG[selectedPaper.status]?.label || selectedPaper.status}
                                    </Badge>
                                </CardDescription>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => setSelectedPaper(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Abstract */}
                        {selectedPaper.abstractField && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Abstract</p>
                                <p className="text-sm text-gray-600 leading-relaxed">{selectedPaper.abstractField}</p>
                            </div>
                        )}

                        {/* Keywords */}
                        {selectedPaper.keywords && selectedPaper.keywords.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Keywords</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedPaper.keywords.map((kw, i) => (
                                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{kw}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Change status */}
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Change Status</p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                                    if (status === selectedPaper.status) return null
                                    return (
                                        <Button
                                            key={status}
                                            size="sm"
                                            variant="outline"
                                            className="text-xs"
                                            disabled={updatingStatus === selectedPaper.id}
                                            onClick={() => handleStatusChange(selectedPaper.id, status)}
                                        >
                                            {updatingStatus === selectedPaper.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                            ) : null}
                                            → {config.label}
                                        </Button>
                                    )
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
