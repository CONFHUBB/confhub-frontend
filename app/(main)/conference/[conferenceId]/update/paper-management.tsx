"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { 
    FileText, Search, Shield, Filter, ChevronDown, Check,
    Download, UserPlus, Eye, Gavel, Loader2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"

import { getPapersByConference, batchNotifyDecisions, updatePaperStatus, getAuthorsByPaper, type PaperAuthorItem } from "@/app/api/paper.api"
import { getAggregatesByConference } from "@/app/api/review-aggregate.api"
import { getTracksByConference } from "@/app/api/track.api"
import { getConflictsByConference } from "@/app/api/conflict.api"
import { getMetaReviewsByConference } from "@/app/api/meta-review.api"

import type { PaperResponse, PaperStatus } from "@/types/paper"
import type { TrackResponse } from "@/types/track"
import type { MetaReviewResponse, Decision } from "@/types/meta-review"
import type { PaperConflictResponse } from "@/types/conflict"
import { PaperDetailSheet } from "./paper-detail-sheet"
import { UnifiedDataTable, type DataTableColumn } from "@/components/ui/unified-data-table"

const STATUS_CONFIG: Record<string, { label: string, color: string }> = {
    DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700" },
    SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700 font-medium" },
    UNDER_REVIEW: { label: "Under Review", color: "bg-purple-100 text-purple-700 font-medium" },
    AWAITING_DECISION: { label: "Awaiting Decision", color: "bg-amber-100 text-amber-700 font-medium" },
    ACCEPTED: { label: "Accepted", color: "bg-green-100 text-green-700 font-bold" },
    REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 font-bold" },
    WITHDRAWN: { label: "Withdrawn", color: "bg-gray-100 text-gray-500 line-through" },
    CAMERA_READY_SUBMITTED: { label: "Camera Ready", color: "bg-emerald-100 text-emerald-800 font-bold" },
}

export interface EnrichedPaper extends PaperResponse {
    conflictCount: number
    metaReviewScore?: number
    metaReviewStatus?: Decision
    reviewProgress?: string
    authors: string
    reviewCount: number
    completedReviewCount: number
    averageTotalScore: number | null
}

type SortColumn = "id" | "title" | "authors" | "reviewProgress" | "avgScore" | "status"
type SortDirection = "asc" | "desc"

interface PaperManagementProps {
    conferenceId: number
    trackIds?: number[] // For Track Chair filtering
}

export function PaperManagement({ conferenceId, trackIds }: PaperManagementProps) {
    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [tracks, setTracks] = useState<TrackResponse[]>([])
    const [aggregates, setAggregates] = useState<Record<number, any>>({})
    const [metaReviewMap, setMetaReviewMap] = useState<Record<number, MetaReviewResponse>>({})
    const [conflictMap, setConflictMap] = useState<Record<number, PaperConflictResponse[]>>({})
    const [paperAuthors, setPaperAuthors] = useState<Record<number, string>>({})

    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterTrack, setFilterTrack] = useState<string>("all")
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [currentPage, setCurrentPage] = useState(0)
    const itemsPerPage = 15

    const [sortColumn, setSortColumn] = useState<SortColumn>("id")
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
    const [isNotifying, setIsNotifying] = useState(false)

    // Sheet / Detail State
    const [sheetPaperId, setSheetPaperId] = useState<number | null>(null)
    const [sheetDefaultTab, setSheetDefaultTab] = useState<"info" | "assignments" | "reviews" | "decision" | "conflicts">("info")

    // Get user ID from auth token
    const [userId, setUserId] = useState<number | null>(null)

    useEffect(() => {
        const token = localStorage.getItem("accessToken")
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split(".")[1]))
                setUserId(Number(payload.userId || payload.id))
            } catch (e) {
                console.error("Failed to parse token", e)
            }
        }
    }, [])

    const fetchAllData = useCallback(async () => {
        setIsLoading(true)
        try {
            const [papersData, tracksData, conflictsData, metaReviewsData, aggregatesData] = await Promise.all([
                getPapersByConference(conferenceId, trackIds),
                getTracksByConference(conferenceId),
                getConflictsByConference(conferenceId).catch(() => []),
                getMetaReviewsByConference(conferenceId).catch(() => []), 
                getAggregatesByConference(conferenceId).catch(() => [])
            ])

            setPapers(papersData || [])
            setTracks(tracksData || [])

            const conflictsByPaper: Record<number, PaperConflictResponse[]> = {}
            if (Array.isArray(conflictsData)) {
                conflictsData.forEach(c => {
                    if (c.paper && c.paper.id) {
                        if (!conflictsByPaper[c.paper.id]) conflictsByPaper[c.paper.id] = []
                        conflictsByPaper[c.paper.id].push(c)
                    }
                })
            }
            setConflictMap(conflictsByPaper)

            const metaMap: Record<number, MetaReviewResponse> = {}
            if (Array.isArray(metaReviewsData)) {
                metaReviewsData.forEach(mr => {
                    if (mr.paper && mr.paper.id) metaMap[mr.paper.id] = mr
                })
            }
            setMetaReviewMap(metaMap)

            const aggMap: Record<number, any> = {}
            if (Array.isArray(aggregatesData)) {
                aggregatesData.forEach(a => {
                    aggMap[a.paperId] = a
                })
            }
            setAggregates(aggMap)

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
                    .filter(Boolean).join(", ") || "Unknown Authors"
            })
            setPaperAuthors(authorMap)

        } catch (error) {
            console.error("Failed to fetch conference data:", error)
            toast.error("Failed to load papers. Please refresh the page.")
        } finally {
            setIsLoading(false)
        }
    }, [conferenceId, trackIds])

    useEffect(() => {
        fetchAllData()
    }, [fetchAllData])

    const handleBatchNotify = async () => {
        setIsNotifying(true)
        try {
            await batchNotifyDecisions(conferenceId)
            toast.success("Batch notification requested successfully. Emails are being sent.")
        } catch (err: any) {
            console.error(err)
            toast.error(err.response?.data?.message || "Failed to trigger batch notifications.")
        } finally {
            setIsNotifying(false)
        }
    }

    const exportToCSV = () => {
        if (!papers || papers.length === 0) return
        const headers = ["ID", "Title", "Authors", "Track", "Status", "Review Progress", "Avg Score", "Conflicts"]
        const csvContent = [
            headers.join(","),
            ...enrichedPapers.map(p => 
                `"${p.id}","${p.title?.replace(/"/g, '""')}","${p.authors?.replace(/"/g, '""')}","${p.trackName}","${p.status}","${p.completedReviewCount}/${p.reviewCount}","${p.averageTotalScore || ''}","${p.conflictCount}"`
            )
        ].join("\n")
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `conference_${conferenceId}_papers.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const openSheet = (id: number, tab: "info" | "assignments" | "reviews" | "decision" | "conflicts" = "info") => {
        setSheetDefaultTab(tab)
        setSheetPaperId(id)
    }

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        } else {
            setSortColumn(column)
            setSortDirection("asc")
        }
    }

    const handleBulkStatusChange = async (newStatus: PaperStatus) => {
        if (selectedIds.size === 0) return
        setUpdatingStatus(newStatus)
        try {
            const promises = Array.from(selectedIds).map(id => updatePaperStatus(id, newStatus))
            await Promise.all(promises)
            toast.success(`Successfully updated ${selectedIds.size} papers to ${STATUS_CONFIG[newStatus]?.label || newStatus}`)
            setSelectedIds(new Set())
            fetchAllData()
        } catch (error) {
            console.error("Bulk update failed:", error)
            toast.error("Failed to update status for some papers.")
        } finally {
            setUpdatingStatus(null)
        }
    }

    const enrichedPapers: EnrichedPaper[] = useMemo(() => {
        return papers.map(p => {
            const mr = metaReviewMap[p.id]
            const agg = aggregates[p.id]
            return {
                ...p,
                conflictCount: conflictMap[p.id]?.length || 0,
                metaReviewScore: 0,
                metaReviewStatus: mr?.finalDecision,
                authors: paperAuthors[p.id] || "Unknown Authors",
                reviewCount: agg?.reviewCount || 0,
                completedReviewCount: agg?.completedReviewCount || 0,
                averageTotalScore: agg?.completedReviewCount > 0 ? agg.averageTotalScore : null,
            }
        })
    }, [papers, conflictMap, metaReviewMap, aggregates, paperAuthors])

    const filteredPapers = useMemo(() => {
        return enrichedPapers.filter(paper => {
            const matchesSearch = !searchQuery || 
                paper.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                paper.authors?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                paper.id.toString().includes(searchQuery)
            const matchesTrack = filterTrack === "all" || paper.trackName === tracks.find(t => t.id.toString() === filterTrack)?.name
            const matchesStatus = filterStatus === "all" || paper.status === filterStatus
            return matchesSearch && matchesTrack && matchesStatus
        }).sort((a, b) => {
            let aVal: any = a[sortColumn as keyof EnrichedPaper]
            let bVal: any = b[sortColumn as keyof EnrichedPaper]

            if (sortColumn === "reviewProgress") {
                aVal = a.reviewCount > 0 ? (a.completedReviewCount / a.reviewCount) : 0
                bVal = b.reviewCount > 0 ? (b.completedReviewCount / b.reviewCount) : 0
            } else if (sortColumn === "avgScore") {
                aVal = a.averageTotalScore || 0
                bVal = b.averageTotalScore || 0
            }

            if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
            if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
            return 0
        })
    }, [enrichedPapers, searchQuery, filterTrack, filterStatus, tracks, sortColumn, sortDirection])

    const totalPages = Math.ceil(filteredPapers.length / itemsPerPage)
    const paginatedPapers = filteredPapers.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)

    const toggleSelectAll = () => {
        if (selectedIds.size === paginatedPapers.length && paginatedPapers.length > 0) {
            setSelectedIds(new Set())
        } else {
            const newIds = new Set(selectedIds)
            paginatedPapers.forEach(p => newIds.add(p.id))
            setSelectedIds(newIds)
        }
    }

    const toggleSelect = (id: number) => {
        const newIds = new Set(selectedIds)
        if (newIds.has(id)) newIds.delete(id)
        else newIds.add(id)
        setSelectedIds(newIds)
    }

    const allOnPageSelected = paginatedPapers.length > 0 && paginatedPapers.every(p => selectedIds.has(p.id))

    const SortIcon = ({ columnKey }: { columnKey: SortColumn }) => {
        if (sortColumn !== columnKey) return <span className="opacity-0 group-hover:opacity-40 ml-1">↕</span>
        return <span className="text-primary ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
    }

    // ─── UNIFIED DATA TABLE CONFIGURATION ────────────────────────────

    const columns: DataTableColumn<EnrichedPaper>[] = [
        {
            header: (
                <div className="flex items-center justify-center w-full">
                    <Checkbox checked={allOnPageSelected} onCheckedChange={toggleSelectAll} />
                </div>
            ),
            cell: (paper) => (
                <div className="flex items-center justify-center w-full" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(paper.id)} onCheckedChange={() => toggleSelect(paper.id)} />
                </div>
            ),
            className: "w-12 px-2"
        },
        {
            header: <span className="cursor-pointer group flex items-center gap-1" onClick={() => handleSort("id")}># <SortIcon columnKey="id" /></span>,
            cell: (paper) => <span className="text-muted-foreground font-mono">{paper.id}</span>,
            className: "w-16"
        },
        {
            header: <span className="cursor-pointer group flex items-center gap-1" onClick={() => handleSort("title")}>Title <SortIcon columnKey="title" /></span>,
            cell: (paper) => (
                <div className="max-w-[250px] font-medium text-sm truncate" title={paper.title}>
                    {paper.title}
                </div>
            ),
            className: "min-w-[200px]"
        },
        {
            header: <span className="cursor-pointer group flex items-center gap-1" onClick={() => handleSort("authors")}>Authors <SortIcon columnKey="authors" /></span>,
            cell: (paper) => (
                <div className="max-w-[200px] text-xs text-muted-foreground truncate" title={paper.authors}>
                    {paper.authors}
                </div>
            ),
            className: "min-w-[150px]"
        },
        {
            header: "Track",
            accessorKey: "trackName",
            className: "text-xs text-muted-foreground"
        },
        {
            header: <span className="cursor-pointer group flex items-center gap-1 w-full justify-center" onClick={() => handleSort("reviewProgress")}>Reviews <SortIcon columnKey="reviewProgress" /></span>,
            cell: (paper) => {
                const reviewPct = (paper.reviewCount ?? 0) > 0
                    ? Math.round(((paper.completedReviewCount ?? 0) / paper.reviewCount) * 100)
                    : 0
                return (
                    <div className="flex items-center justify-center gap-2">
                        <span className={`text-[11px] font-mono w-6 text-right ${
                            paper.completedReviewCount === paper.reviewCount && (paper.reviewCount ?? 0) > 0
                                ? "text-emerald-600 font-semibold" : "text-muted-foreground"
                        }`}>
                            {paper.completedReviewCount ?? 0}/{paper.reviewCount ?? 0}
                        </span>
                        {(paper.reviewCount ?? 0) > 0 && (
                            <div className="w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${reviewPct === 100 ? "bg-emerald-500" : "bg-indigo-400"}`}
                                    style={{ width: `${reviewPct}%` }} />
                            </div>
                        )}
                    </div>
                )
            },
            className: "text-center"
        },
        {
            header: <span className="cursor-pointer group flex items-center gap-1 w-full justify-center" onClick={() => handleSort("avgScore")}>Score <SortIcon columnKey="avgScore" /></span>,
            cell: (paper) => {
                if (paper.averageTotalScore !== null) {
                    return (
                        <div className="text-center w-full text-[13px]">
                            <span className={`font-mono font-semibold ${
                                paper.averageTotalScore >= 3.5 ? "text-emerald-600" :
                                paper.averageTotalScore >= 2 ? "text-indigo-600" : "text-rose-600"
                            }`}>
                                {paper.averageTotalScore.toFixed(1)}
                            </span>
                        </div>
                    )
                }
                return <div className="text-center w-full text-muted-foreground text-xs">—</div>
            },
            className: "text-center w-24"
        },
        {
            header: <div className="flex items-center justify-center gap-1 w-full"><Shield className="h-3 w-3" /> Conflicts</div>,
            cell: (paper) => (
                <div className="flex justify-center w-full">
                    {paper.conflictCount > 0 ? (
                        <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                            {paper.conflictCount}
                        </Badge>
                    ) : (
                        <span className="text-muted-foreground text-xs">0</span>
                    )}
                </div>
            )
        },
        {
            header: <span className="cursor-pointer group flex items-center justify-center gap-1 w-full" onClick={() => handleSort("status")}>Status <SortIcon columnKey="status" /></span>,
            cell: (paper) => (
                <div className="flex justify-center w-full">
                    <Badge className={`text-[10px] whitespace-nowrap shadow-none ${STATUS_CONFIG[paper.status]?.color || ""}`}>
                        {STATUS_CONFIG[paper.status]?.label || paper.status}
                    </Badge>
                </div>
            )
        }
    ]

    const renderRowActions = (paper: EnrichedPaper) => (
        <>
            <DropdownMenuItem onClick={() => openSheet(paper.id, "info")}>
                <Eye className="h-3.5 w-3.5 mr-2 text-slate-500" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openSheet(paper.id, "assignments")}>
                <UserPlus className="h-3.5 w-3.5 mr-2 text-indigo-500" /> Assignments
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openSheet(paper.id, "decision")}>
                <Gavel className="h-3.5 w-3.5 mr-2 text-amber-500" /> Decision
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openSheet(paper.id, "conflicts")}>
                <Shield className="h-3.5 w-3.5 mr-2 text-rose-500" /> Conflicts
            </DropdownMenuItem>
        </>
    )

    const PrimaryActions = (
        <div className="flex items-center gap-2">
            {/* Filter Popover */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 shadow-sm bg-white">
                        <Filter className="h-4 w-4 text-slate-500" /> 
                        Filter
                        {(filterTrack !== "all" || filterStatus !== "all") && (
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-indigo-100 text-indigo-700 font-medium hover:bg-indigo-100 border border-indigo-200">2 Active</Badge>
                        )}
                        <ChevronDown className="h-3 w-3 opacity-50 ml-1" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 shadow-xl rounded-xl border border-slate-200" align="end">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm text-slate-900">Track</h4>
                            <select 
                                className="w-full text-sm border border-slate-200 rounded-md p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                                value={filterTrack}
                                onChange={(e) => { setFilterTrack(e.target.value); setCurrentPage(0); }}
                            >
                                <option value="all">All Tracks</option>
                                {tracks.map(t => <option key={t.id} value={t.id.toString()}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm text-slate-900">Status</h4>
                            <select 
                                className="w-full text-sm border border-slate-200 rounded-md p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                                value={filterStatus}
                                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(0); }}
                            >
                                <option value="all">All Statuses</option>
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {(filterTrack !== "all" || filterStatus !== "all") && (
                        <div className="pt-3 mt-4 border-t border-slate-100">
                            <Button
                                variant="ghost"
                                className="w-full text-xs h-8 text-slate-500 hover:text-slate-900"
                                onClick={() => { setFilterTrack("all"); setFilterStatus("all"); setCurrentPage(0); }}
                            >
                                Clear all filters
                            </Button>
                        </div>
                    )}
                </PopoverContent>
            </Popover>

            {/* Bulk Actions Menu */}
            {selectedIds.size > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 shadow-sm border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium">
                            Bulk Actions ({selectedIds.size})
                            <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleBulkStatusChange("UNDER_REVIEW")} disabled={updatingStatus !== null}>
                            → Set Under Review
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkStatusChange("ACCEPTED")} disabled={updatingStatus !== null} className="text-emerald-600 focus:text-emerald-700 font-medium">
                            → Set Accepted
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkStatusChange("REJECTED")} disabled={updatingStatus !== null} className="text-rose-600 focus:text-rose-700 font-medium">
                            → Set Rejected
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setSelectedIds(new Set())}>
                            Clear Selection
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/* Notify Authors Button */}
            <Button
                variant="outline"
                size="sm"
                className="h-9 shadow-sm bg-white"
                onClick={handleBatchNotify}
                disabled={isNotifying || isLoading}
            >
                {isNotifying ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin text-slate-500" /> : <FileText className="h-4 w-4 mr-1.5 text-slate-500" />}
                Notify Authors
            </Button>

            {/* Export CSV Button */}
            <Button
                size="sm"
                className="h-9 shadow-sm"
                onClick={exportToCSV}
                disabled={isLoading}
            >
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
            </Button>
        </div>
    )

    return (
        <div className="space-y-6">
            <UnifiedDataTable
                title="Paper Management"
                description="Manage all submitted papers, their review progress, conflicts, and final decisions."
                columns={columns}
                data={paginatedPapers}
                isLoading={isLoading}
                keyExtractor={(paper) => paper.id}
                
                // Search
                searchValue={searchQuery}
                onSearchChange={(v) => { setSearchQuery(v); setCurrentPage(0); }}
                searchPlaceholder="Search titles, authors, or IDs..."
                
                // Primary Action Toolbar
                primaryAction={PrimaryActions}
                
                // Kebab Menu Actions per row
                renderRowActions={renderRowActions}
                
                // Pagination
                pagination={{
                    currentPage,
                    totalPages,
                    totalElements: filteredPapers.length,
                    onPageChange: setCurrentPage
                }}
            />

            {/* Background Sheet / Detail view trigger */}
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
