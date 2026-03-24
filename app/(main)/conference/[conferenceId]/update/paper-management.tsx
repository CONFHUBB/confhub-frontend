"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { getPapersByConference, updatePaperStatus, getAuthorsByPaper, type PaperAuthorItem } from "@/app/api/paper.api"
import { getAggregatesByConference, type ReviewAggregate } from "@/app/api/review-aggregate.api"
import { getMetaReviewsByConference, createMetaReview } from "@/app/api/meta-review.api"
import { getCurrentAssignments, type AssignmentPreview } from "@/app/api/assignment.api"
import { getConflictsByConference } from "@/app/api/conflict.api"
import type { PaperResponse, PaperStatus } from "@/types/paper"
import type { MetaReviewResponse, Decision } from "@/types/meta-review"
import type { PaperConflictResponse } from "@/types/conflict"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Loader2, Search, FileText, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
    MoreHorizontal, Eye, UserPlus, Gavel, Shield, Download
} from "lucide-react"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import toast from "react-hot-toast"
import { PaperDetailSheet } from "./paper-detail-sheet"

interface PaperManagementProps {
    conferenceId: number
}

// ── Status config ──
const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
    DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700 border-gray-200", dotColor: "bg-gray-400" },
    SUBMITTED: { label: "Submitted", color: "bg-indigo-100 text-indigo-700 border-indigo-200", dotColor: "bg-indigo-500" },
    UNDER_REVIEW: { label: "Under Review", color: "bg-amber-100 text-amber-700 border-amber-200", dotColor: "bg-amber-500" },
    ACCEPTED: { label: "Accepted", color: "bg-emerald-100 text-emerald-700 border-emerald-200", dotColor: "bg-emerald-500" },
    REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", dotColor: "bg-red-500" },
    REVISION: { label: "Revision", color: "bg-orange-100 text-orange-700 border-orange-200", dotColor: "bg-orange-500" },
    WITHDRAWN: { label: "Withdrawn", color: "bg-gray-100 text-gray-500 border-gray-200", dotColor: "bg-gray-400" },
    PUBLISHED: { label: "Published", color: "bg-teal-100 text-teal-700 border-teal-200", dotColor: "bg-teal-500" },
}

const DECISION_CONFIG: Record<string, { label: string; color: string }> = {
    APPROVE: { label: "Approve", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    REJECT: { label: "Reject", color: "bg-red-100 text-red-700 border-red-200" },
    REVISION: { label: "Revision", color: "bg-amber-100 text-amber-700 border-amber-200" },
}

const PAGE_SIZE = 50

// ── Enriched paper type ──
export interface EnrichedPaper {
    id: number
    title: string
    trackName: string
    trackId: number
    status: PaperStatus
    submissionTime: string
    abstractField: string
    keywords: string[]
    primarySubjectAreaId: number
    secondarySubjectAreaIds: number[]
    authors: string
    reviewCount: number
    completedReviewCount: number
    averageTotalScore: number | null
    assignedReviewerCount: number
    assignedReviewerNames: string[]
    decision: Decision | null
    metaReviewId: number | null
    metaReviewReason: string | null
    conflictCount: number
    bidCount: number
}

type SortKey = "id" | "title" | "status" | "reviewProgress" | "avgScore" | "authors"

export function PaperManagement({ conferenceId }: PaperManagementProps) {
    // ── Data state ──
    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [aggregates, setAggregates] = useState<ReviewAggregate[]>([])
    const [metaReviews, setMetaReviews] = useState<MetaReviewResponse[]>([])
    const [assignments, setAssignments] = useState<AssignmentPreview | null>(null)
    const [conflicts, setConflicts] = useState<PaperConflictResponse[]>([])
    const [paperAuthors, setPaperAuthors] = useState<Record<number, string>>({})
    const [loading, setLoading] = useState(true)

    // ── UI state ──
    const [searchQuery, setSearchQuery] = useState("")
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [filterTrack, setFilterTrack] = useState<string>("all")
    const [sortKey, setSortKey] = useState<SortKey>("id")
    const [sortAsc, setSortAsc] = useState(true)
    const [currentPage, setCurrentPage] = useState(0)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [updatingStatus, setUpdatingStatus] = useState<number | null>(null)
    const [chairId, setChairId] = useState<number | null>(null)

    useEffect(() => {
        try {
            const token = localStorage.getItem('accessToken')
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]))
                setChairId(payload.userId || payload.id)
            }
        } catch { /* ignore */ }
    }, [])

    // ── Sheet state ──
    const [sheetPaperId, setSheetPaperId] = useState<number | null>(null)
    const [sheetDefaultTab, setSheetDefaultTab] = useState<string>("info")

    // ── User ID ──
    const [userId, setUserId] = useState<number | null>(null)
    useEffect(() => {
        try {
            const token = localStorage.getItem("accessToken")
            if (token) {
                const payload = JSON.parse(atob(token.split(".")[1]))
                setUserId(payload.userId || payload.id)
            }
        } catch { /* ignore */ }
    }, [])

    // ── Data loading ──
    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true)
            const [papersData, aggData, mrData, assignData, conflictData] = await Promise.all([
                getPapersByConference(conferenceId),
                getAggregatesByConference(conferenceId).catch(() => []),
                getMetaReviewsByConference(conferenceId).catch(() => []),
                getCurrentAssignments(conferenceId).catch(() => null),
                getConflictsByConference(conferenceId).catch(() => []),
            ])
            setPapers(papersData || [])
            setAggregates(aggData || [])
            setMetaReviews(mrData || [])
            setAssignments(assignData)
            setConflicts(conflictData || [])

            // Fetch authors for all papers
            const authorResults = await Promise.all(
                (papersData || []).map(async (p) => {
                    try {
                        const authors = await getAuthorsByPaper(p.id)
                        return { paperId: p.id, authors }
                    } catch { return { paperId: p.id, authors: [] as PaperAuthorItem[] } }
                })
            )
            const authorMap: Record<number, string> = {}
            authorResults.forEach(({ paperId, authors }) => {
                authorMap[paperId] = authors
                    .map(a => a.user.fullName || `${a.user.firstName || ""} ${a.user.lastName || ""}`.trim())
                    .filter(Boolean).join(", ") || "—"
            })
            setPaperAuthors(authorMap)
        } catch (err) {
            console.error("Failed to load paper management data:", err)
            toast.error("Failed to load data")
        } finally {
            setLoading(false)
        }
    }, [conferenceId])

    useEffect(() => { fetchAllData() }, [fetchAllData])

    // ── Derived maps ──
    const aggregateMap = useMemo(() => {
        const map: Record<number, ReviewAggregate> = {}
        aggregates.forEach(a => { map[a.paperId] = a })
        return map
    }, [aggregates])

    const metaReviewMap = useMemo(() => {
        const map: Record<number, MetaReviewResponse> = {}
        metaReviews.forEach(mr => { map[mr.paper.id] = mr })
        return map
    }, [metaReviews])

    const assignmentCountPerPaper = useMemo(() => {
        const map: Record<number, { count: number; names: string[] }> = {}
        ;(assignments?.assignments || []).forEach(a => {
            if (!map[a.paperId]) map[a.paperId] = { count: 0, names: [] }
            map[a.paperId].count++
            if (a.reviewerName && !map[a.paperId].names.includes(a.reviewerName)) {
                map[a.paperId].names.push(a.reviewerName)
            }
        })
        return map
    }, [assignments])

    const conflictCountPerPaper = useMemo(() => {
        const map: Record<number, number> = {}
        conflicts.forEach(c => { map[c.paper?.id] = (map[c.paper?.id] || 0) + 1 })
        return map
    }, [conflicts])

    // ── Enriched papers ──
    const enrichedPapers: EnrichedPaper[] = useMemo(() => {
        return papers.map(p => {
            const agg = aggregateMap[p.id]
            const mr = metaReviewMap[p.id]
            const assign = assignmentCountPerPaper[p.id]
            return {
                id: p.id,
                title: p.title,
                trackName: p.track?.name || p.trackName || "—",
                trackId: p.trackId,
                status: p.status,
                submissionTime: p.submissionTime,
                abstractField: p.abstractField,
                keywords: p.keywords || [],
                primarySubjectAreaId: p.primarySubjectAreaId,
                secondarySubjectAreaIds: p.secondarySubjectAreaIds || [],
                authors: paperAuthors[p.id] || "—",
                reviewCount: agg?.reviewCount || 0,
                completedReviewCount: agg?.completedReviewCount || 0,
                averageTotalScore: agg?.completedReviewCount > 0 ? agg.averageTotalScore : null,
                assignedReviewerCount: assign?.count || 0,
                assignedReviewerNames: assign?.names || [],
                decision: mr?.finalDecision || null,
                metaReviewId: mr?.id || null,
                metaReviewReason: mr?.reason || null,
                conflictCount: conflictCountPerPaper[p.id] || 0,
                bidCount: 0, // loaded lazily in sheet
            }
        })
    }, [papers, aggregateMap, metaReviewMap, assignmentCountPerPaper, conflictCountPerPaper, paperAuthors])

    // ── Track names ──
    const trackNames = useMemo(() => {
        const names = new Set(enrichedPapers.map(p => p.trackName).filter(Boolean))
        return Array.from(names).sort()
    }, [enrichedPapers])

    // ── Status counts ──
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        enrichedPapers.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1 })
        return counts
    }, [enrichedPapers])

    // ── Filter + Sort ──
    const filteredPapers = useMemo(() => {
        let result = enrichedPapers

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            result = result.filter(p =>
                p.title.toLowerCase().includes(q) ||
                p.id.toString().includes(q) ||
                p.authors.toLowerCase().includes(q)
            )
        }

        // Status filter
        if (filterStatus !== "all") {
            result = result.filter(p => p.status === filterStatus)
        }

        // Track filter
        if (filterTrack !== "all") {
            result = result.filter(p => p.trackName === filterTrack)
        }

        // Sort
        result = [...result].sort((a, b) => {
            let cmp = 0
            switch (sortKey) {
                case "id": cmp = a.id - b.id; break
                case "title": cmp = a.title.localeCompare(b.title); break
                case "status": cmp = a.status.localeCompare(b.status); break
                case "reviewProgress":
                    cmp = (a.completedReviewCount / Math.max(a.reviewCount, 1)) -
                          (b.completedReviewCount / Math.max(b.reviewCount, 1))
                    break
                case "avgScore":
                    cmp = (a.averageTotalScore ?? -1) - (b.averageTotalScore ?? -1)
                    break
                case "authors": cmp = a.authors.localeCompare(b.authors); break
            }
            return sortAsc ? cmp : -cmp
        })

        return result
    }, [enrichedPapers, searchQuery, filterStatus, filterTrack, sortKey, sortAsc])

    // ── Pagination ──
    const totalPages = Math.ceil(filteredPapers.length / PAGE_SIZE)
    const paginatedPapers = useMemo(() => {
        const start = currentPage * PAGE_SIZE
        return filteredPapers.slice(start, start + PAGE_SIZE)
    }, [filteredPapers, currentPage])

    // Reset page on filter change
    useEffect(() => { setCurrentPage(0) }, [searchQuery, filterStatus, filterTrack])

    // ── Selection ──
    const allOnPageSelected = paginatedPapers.length > 0 && paginatedPapers.every(p => selectedIds.has(p.id))
    const toggleSelectAll = () => {
        if (allOnPageSelected) {
            setSelectedIds(prev => {
                const n = new Set(prev)
                paginatedPapers.forEach(p => n.delete(p.id))
                return n
            })
        } else {
            setSelectedIds(prev => {
                const n = new Set(prev)
                paginatedPapers.forEach(p => n.add(p.id))
                return n
            })
        }
    }
    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const n = new Set(prev)
            if (n.has(id)) n.delete(id); else n.add(id)
            return n
        })
    }

    // ── Sort handler ──
    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(!sortAsc)
        else { setSortKey(key); setSortAsc(true) }
    }

    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortKey !== columnKey) return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
        return sortAsc
            ? <ChevronUp className="h-3 w-3 text-primary" />
            : <ChevronDown className="h-3 w-3 text-primary" />
    }

    // ── Bulk status change ──
    const handleBulkStatusChange = async (newStatus: string) => {
        const ids = Array.from(selectedIds)
        if (ids.length === 0) return
        try {
            setUpdatingStatus(-1)
            await Promise.all(ids.map(async (id) => {
                // Determine if this is a decision
                let finalDecision: Decision | null = null
                if (newStatus === "ACCEPTED") finalDecision = "APPROVE"
                if (newStatus === "REJECTED") finalDecision = "REJECT"
                if (newStatus === "REVISION") finalDecision = "REVISION"

                if (finalDecision && chairId) {
                    try {
                        // Creating meta-review will also update the paper status automatically on the backend
                        await createMetaReview({
                            paperId: id,
                            userId: chairId,
                            finalDecision: finalDecision,
                            reason: "Batch decision applied by Program Chair."
                        })
                    } catch (e: any) {
                        // Fallback if meta-review already exists or error
                        await updatePaperStatus(id, newStatus)
                    }
                } else {
                    await updatePaperStatus(id, newStatus)
                }
            }))
            toast.success(`Updated ${ids.length} papers to ${STATUS_CONFIG[newStatus]?.label || newStatus}`)
            setSelectedIds(new Set())
            fetchAllData()
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to update papers")
        } finally {
            setUpdatingStatus(null)
        }
    }

    // ── Export CSV ──
    const exportToCSV = () => {
        if (filteredPapers.length === 0) {
            toast.error("No papers to export")
            return
        }

        const headers = [
            "ID", "Title", "Authors", "Track", "Status",
            "Submission Time", "Review Progress", "Avg Score",
            "Conflicts", "Decision", "Assigned Reviewers"
        ]

        const csvRows = [headers.join(",")]

        filteredPapers.forEach(p => {
            const row = [
                p.id,
                `"${p.title.replace(/"/g, '""')}"`,
                `"${p.authors.replace(/"/g, '""')}"`,
                `"${p.trackName}"`,
                p.status,
                new Date(p.submissionTime).toLocaleDateString(),
                `"${p.completedReviewCount}/${p.reviewCount}"`,
                p.averageTotalScore !== null ? p.averageTotalScore.toFixed(2) : "N/A",
                p.conflictCount,
                p.decision || "N/A",
                `"${p.assignedReviewerNames.join("; ")}"`
            ]
            csvRows.push(row.join(","))
        })

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `papers_export_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // ── Open sheet ──
    const openSheet = (paperId: number, tab: string = "info") => {
        setSheetPaperId(paperId)
        setSheetDefaultTab(tab)
    }

    // ── Loading ──
    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div>
                <h2 className="text-xl font-bold mb-1">Paper Management</h2>
                <p className="text-sm text-muted-foreground">
                    View and manage all {enrichedPapers.length} papers — assignments, reviews, decisions, and conflicts.
                </p>
            </div>

            {/* ── Status Summary Cards ── */}
            <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                    const count = statusCounts[status] || 0
                    const isActive = filterStatus === status
                    return (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(isActive ? "all" : status)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all hover:shadow-sm ${
                                isActive ? "ring-2 ring-primary bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                            <span className="font-bold">{count}</span>
                            <span className="text-muted-foreground text-xs">{config.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* ── Toolbar ── */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                {/* Search */}
                <div className="relative flex-1 w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        className="pl-10 h-9"
                        placeholder="Search by title, ID, or author..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                    {trackNames.length > 1 && (
                        <select
                            className="h-9 rounded-md border px-3 text-sm bg-white"
                            value={filterTrack}
                            onChange={e => setFilterTrack(e.target.value)}
                        >
                            <option value="all">All Tracks</option>
                            {trackNames.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}

                    {/* Bulk Actions */}
                    {selectedIds.size > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9">
                                    Bulk Actions ({selectedIds.size})
                                    <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem
                                    onClick={() => handleBulkStatusChange("UNDER_REVIEW")}
                                    disabled={updatingStatus !== null}
                                >
                                    → Under Review
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleBulkStatusChange("ACCEPTED")}
                                    disabled={updatingStatus !== null}
                                >
                                    → Accepted
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleBulkStatusChange("REJECTED")}
                                    disabled={updatingStatus !== null}
                                >
                                    → Rejected
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSelectedIds(new Set())}>
                                    Clear Selection
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Export */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5"
                        onClick={exportToCSV}
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                </div>

            </div>

            {/* ── Papers Table ── */}
            {filteredPapers.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground border rounded-lg">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>{searchQuery || filterStatus !== "all" ? "No papers match your filters." : "No papers submitted yet."}</p>
                </div>
            ) : (
                <div className="overflow-auto rounded-lg border bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-gray-50/80">
                                <th className="px-3 py-3 w-10">
                                    <Checkbox
                                        checked={allOnPageSelected}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </th>
                                <th
                                    className="px-3 py-3 text-left font-medium text-gray-600 w-14 cursor-pointer group"
                                    onClick={() => handleSort("id")}
                                >
                                    <span className="flex items-center gap-1"># <SortIcon columnKey="id" /></span>
                                </th>
                                <th
                                    className="px-3 py-3 text-left font-medium text-gray-600 min-w-[200px] cursor-pointer group"
                                    onClick={() => handleSort("title")}
                                >
                                    <span className="flex items-center gap-1">Title <SortIcon columnKey="title" /></span>
                                </th>
                                <th
                                    className="px-3 py-3 text-left font-medium text-gray-600 min-w-[140px] cursor-pointer group"
                                    onClick={() => handleSort("authors")}
                                >
                                    <span className="flex items-center gap-1">Authors <SortIcon columnKey="authors" /></span>
                                </th>
                                <th className="px-3 py-3 text-left font-medium text-gray-600 w-28">Track</th>
                                <th
                                    className="px-3 py-3 text-center font-medium text-gray-600 w-32 cursor-pointer group"
                                    onClick={() => handleSort("reviewProgress")}
                                >
                                    <span className="flex items-center justify-center gap-1">Reviews <SortIcon columnKey="reviewProgress" /></span>
                                </th>
                                <th
                                    className="px-3 py-3 text-center font-medium text-gray-600 w-20 cursor-pointer group"
                                    onClick={() => handleSort("avgScore")}
                                >
                                    <span className="flex items-center justify-center gap-1">Score <SortIcon columnKey="avgScore" /></span>
                                </th>
                                <th className="px-3 py-3 text-center font-medium text-gray-600 w-24">
                                    <span className="flex items-center justify-center gap-1">
                                        <Shield className="h-3 w-3" /> Conflicts
                                    </span>
                                </th>
                                <th
                                    className="px-3 py-3 text-center font-medium text-gray-600 w-28 cursor-pointer group"
                                    onClick={() => handleSort("status")}
                                >
                                    <span className="flex items-center justify-center gap-1">Status <SortIcon columnKey="status" /></span>
                                </th>
                                <th className="px-3 py-3 text-right font-medium text-gray-600 w-20">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedPapers.map((paper) => {
                                const isSelected = selectedIds.has(paper.id)
                                const reviewPct = paper.reviewCount > 0
                                    ? Math.round((paper.completedReviewCount / paper.reviewCount) * 100)
                                    : 0

                                return (
                                    <tr
                                        key={paper.id}
                                        className={`border-b last:border-0 transition-colors cursor-pointer ${
                                            isSelected ? "bg-primary/5" : "hover:bg-gray-50"
                                        }`}
                                        onClick={() => openSheet(paper.id)}
                                    >
                                        {/* Checkbox */}
                                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelect(paper.id)}
                                            />
                                        </td>

                                        {/* ID */}
                                        <td className="px-3 py-3 text-gray-400 font-mono text-xs">{paper.id}</td>

                                        {/* Title */}
                                        <td className="px-3 py-3">
                                            <p className="font-medium line-clamp-1 text-gray-900">{paper.title}</p>
                                        </td>

                                        {/* Authors */}
                                        <td className="px-3 py-3">
                                            <p className="text-xs text-muted-foreground line-clamp-1">{paper.authors}</p>
                                        </td>

                                        {/* Track */}
                                        <td className="px-3 py-3">
                                            <span className="text-xs text-muted-foreground">{paper.trackName}</span>
                                        </td>

                                        {/* Review Progress */}
                                        <td className="px-3 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className={`text-xs font-mono ${
                                                    paper.completedReviewCount === paper.reviewCount && paper.reviewCount > 0
                                                        ? "text-green-600 font-semibold"
                                                        : "text-muted-foreground"
                                                }`}>
                                                    {paper.completedReviewCount}/{paper.reviewCount}
                                                </span>
                                                {paper.reviewCount > 0 && (
                                                    <div className="w-12 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${
                                                                reviewPct === 100 ? "bg-green-500" : "bg-indigo-400"
                                                            }`}
                                                            style={{ width: `${reviewPct}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Avg Score */}
                                        <td className="px-3 py-3 text-center">
                                            {paper.averageTotalScore !== null ? (
                                                <span className={`font-mono text-xs font-semibold ${
                                                    paper.averageTotalScore >= 3.5 ? "text-emerald-600" :
                                                    paper.averageTotalScore >= 2 ? "text-indigo-600" : "text-red-600"
                                                }`}>
                                                    {paper.averageTotalScore.toFixed(1)}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            )}
                                        </td>

                                        {/* Conflicts */}
                                        <td className="px-3 py-3 text-center">
                                            {paper.conflictCount > 0 ? (
                                                <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                                                    {paper.conflictCount}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">0</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-3 py-3 text-center">
                                            <Badge className={`text-[10px] ${STATUS_CONFIG[paper.status]?.color || ""}`}>
                                                {STATUS_CONFIG[paper.status]?.label || paper.status}
                                            </Badge>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openSheet(paper.id, "info")}>
                                                        <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openSheet(paper.id, "assignments")}>
                                                        <UserPlus className="h-3.5 w-3.5 mr-2" /> Assignments
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openSheet(paper.id, "decision")}>
                                                        <Gavel className="h-3.5 w-3.5 mr-2" /> Decision
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openSheet(paper.id, "conflicts")}>
                                                        <Shield className="h-3.5 w-3.5 mr-2" /> Conflicts
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filteredPapers.length)} of {filteredPapers.length} papers
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline" size="sm"
                            disabled={currentPage === 0}
                            onClick={() => setCurrentPage(p => p - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-3 font-medium">
                            {currentPage + 1} / {totalPages}
                        </span>
                        <Button
                            variant="outline" size="sm"
                            disabled={currentPage >= totalPages - 1}
                            onClick={() => setCurrentPage(p => p + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Paper Detail Sheet ── */}
            <PaperDetailSheet
                paperId={sheetPaperId}
                conferenceId={conferenceId}
                userId={userId}
                defaultTab={sheetDefaultTab}
                enrichedPaper={sheetPaperId ? enrichedPapers.find(p => p.id === sheetPaperId) || null : null}
                metaReview={sheetPaperId ? metaReviewMap[sheetPaperId] || null : null}
                onClose={() => setSheetPaperId(null)}
                onDataChanged={() => fetchAllData()}
            />
        </div>
    )
}
