"use client"

import { useState, useEffect, useCallback } from "react"
import { getCameraReadyFilesByConference, approveCameraReady, getFilesByPaper, type CameraReadyFile } from "@/app/api/camera-ready.api"
import { getPapersByConference } from "@/app/api/paper.api"
import type { PaperResponse } from "@/types/paper"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
    Loader2, Search, FileText, Eye, CheckCircle, ExternalLink, FileCheck, Upload, ChevronLeft, ChevronRight, Filter
} from "lucide-react"
import { FilterPanel } from "@/components/ui/filter-panel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import toast from "react-hot-toast"

interface CameraReadyManagementProps {
    conferenceId: number
}

interface PaperCameraReadySummary {
    paperId: number
    paperTitle: string
    paperStatus: string
    trackName: string
    files: CameraReadyFile[]
    hasUploaded: boolean
    isApproved: boolean
}

type CRFilter = "all" | "uploaded" | "pending" | "approved"

export function CameraReadyManagement({ conferenceId }: CameraReadyManagementProps) {
    const [data, setData] = useState<PaperCameraReadySummary[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState<CRFilter>("all")
    const [sheetPaper, setSheetPaper] = useState<PaperCameraReadySummary | null>(null)
    const [approving, setApproving] = useState<number | null>(null)
    const [currentPage, setCurrentPage] = useState(0)
    const PAGE_SIZE = 10

    // Derived state
    const activeFilterCount = filter !== "all" ? 1 : 0

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const papers = await getPapersByConference(conferenceId)

            // Only show accepted/published papers (eligible for camera-ready)
            const eligible = (papers || []).filter(p =>
                p.status === "ACCEPTED" || p.status === "PUBLISHED"
            )

            const summaries: PaperCameraReadySummary[] = await Promise.all(
                eligible.map(async (p) => {
                    try {
                        const files = await getFilesByPaper(p.id)
                        const crFiles = (files || []).filter(f => f.isCameraReady)
                        return {
                            paperId: p.id,
                            paperTitle: p.title,
                            paperStatus: p.status,
                            trackName: p.track?.name || p.trackName || "—",
                            files: crFiles,
                            hasUploaded: crFiles.length > 0,
                            isApproved: p.status === "PUBLISHED",
                        }
                    } catch {
                        return {
                            paperId: p.id,
                            paperTitle: p.title,
                            paperStatus: p.status,
                            trackName: p.track?.name || p.trackName || "—",
                            files: [],
                            hasUploaded: false,
                            isApproved: p.status === "PUBLISHED",
                        }
                    }
                })
            )
            setData(summaries)
        } catch (err) {
            console.error("Failed to load camera-ready data:", err)
        } finally {
            setLoading(false)
        }
    }, [conferenceId])

    useEffect(() => { fetchData() }, [fetchData])

    const handleApprove = async (paperId: number) => {
        if (!confirm("Approve this camera-ready submission? The paper status will be set to PUBLISHED.")) return
        try {
            setApproving(paperId)
            await approveCameraReady(paperId)
            toast.success("Camera-ready approved! Paper is now Published.")
            fetchData()
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to approve camera-ready")
        } finally {
            setApproving(null)
        }
    }

    // Filter + search
    const filtered = data.filter(p => {
        if (filter === "uploaded" && !p.hasUploaded) return false
        if (filter === "pending" && (p.hasUploaded || p.isApproved)) return false
        if (filter === "approved" && !p.isApproved) return false
        if (search.trim()) {
            const q = search.toLowerCase()
            return p.paperTitle.toLowerCase().includes(q) || p.paperId.toString().includes(q)
        }
        return true
    })

    // Stats
    const totalEligible = data.length
    const uploaded = data.filter(p => p.hasUploaded).length
    const approved = data.filter(p => p.isApproved).length
    const pending = data.filter(p => !p.hasUploaded && !p.isApproved).length

    // Reset page on filter/search change
    useEffect(() => { setCurrentPage(0) }, [search, filter])

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const paginatedData = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold mb-1">Camera-Ready Management</h2>
                <p className="text-sm text-muted-foreground">
                    Review and approve camera-ready submissions from accepted papers.
                </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                    onClick={() => setFilter("all")}
                    className={`rounded-lg border p-4 text-center transition-all hover:shadow-sm ${filter === "all" ? "ring-2 ring-primary" : ""}`}
                >
                    <p className="text-2xl font-bold">{totalEligible}</p>
                    <p className="text-xs text-muted-foreground">Eligible Papers</p>
                </button>
                <button
                    onClick={() => setFilter(filter === "uploaded" ? "all" : "uploaded")}
                    className={`rounded-lg border p-4 text-center transition-all hover:shadow-sm ${filter === "uploaded" ? "ring-2 ring-primary" : ""}`}
                >
                    <p className="text-2xl font-bold text-indigo-600">{uploaded}</p>
                    <p className="text-xs text-muted-foreground">Uploaded</p>
                </button>
                <button
                    onClick={() => setFilter(filter === "approved" ? "all" : "approved")}
                    className={`rounded-lg border p-4 text-center transition-all hover:shadow-sm ${filter === "approved" ? "ring-2 ring-primary" : ""}`}
                >
                    <p className="text-2xl font-bold text-emerald-600">{approved}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                </button>
                <button
                    onClick={() => setFilter(filter === "pending" ? "all" : "pending")}
                    className={`rounded-lg border p-4 text-center transition-all hover:shadow-sm ${filter === "pending" ? "ring-2 ring-primary" : ""}`}
                >
                    <p className="text-2xl font-bold text-amber-600">{pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9 h-9 text-sm"
                        placeholder="Search by title or paper ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <FilterPanel
                    groups={[
                        {
                            label: 'Status',
                            type: 'pills',
                            options: [
                                { value: 'all', label: 'All' },
                                { value: 'uploaded', label: 'Uploaded' },
                                { value: 'approved', label: 'Approved' },
                                { value: 'pending', label: 'Pending' },
                            ],
                            value: filter,
                            onChange: (v) => { setFilter(v as any); setCurrentPage(0) },
                        },
                    ]}
                />
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No papers match your filters.</p>
                </div>
            ) : (
                <>
                <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-12">#</TableHead>
                                <TableHead className="w-14">ID</TableHead>
                                <TableHead className="min-w-[200px] max-w-[300px]">Title</TableHead>
                                <TableHead className="w-28">Track</TableHead>
                                <TableHead className="w-24 text-center">Status</TableHead>
                                <TableHead className="w-28 text-center">Camera-Ready</TableHead>
                                <TableHead className="w-24 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedData.map((p, idx) => (
                                <TableRow key={p.paperId}>
                                    <TableCell className="text-muted-foreground text-xs font-medium">{currentPage * PAGE_SIZE + idx + 1}</TableCell>
                                    <TableCell className="text-muted-foreground font-mono text-xs">{p.paperId}</TableCell>
                                    <TableCell className="font-medium text-sm max-w-[300px]">
                                        <span className="line-clamp-1 block" title={p.paperTitle}>{p.paperTitle}</span>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{p.trackName}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={
                                            p.isApproved
                                                ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]"
                                                : "bg-green-100 text-green-700 border-green-200 text-[10px]"
                                        }>
                                            {p.paperStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {p.isApproved ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                                                ✅ Published
                                            </Badge>
                                        ) : p.hasUploaded ? (
                                            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px]">
                                                <Upload className="h-3 w-3 mr-1" />
                                                Uploaded
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">Not yet</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs gap-1"
                                                onClick={() => setSheetPaper(p)}
                                            >
                                                <Eye className="h-3 w-3" /> View
                                            </Button>
                                            {p.hasUploaded && !p.isApproved && (
                                                <Button
                                                    size="sm"
                                                    className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                                                    onClick={() => handleApprove(p.paperId)}
                                                    disabled={approving === p.paperId}
                                                >
                                                    {approving === p.paperId ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="h-3 w-3" />
                                                    )}
                                                    Approve
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                        <div className="text-sm text-muted-foreground">
                            Page {currentPage + 1} of {totalPages} · {filtered.length} papers
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                            <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
                </>
            )}

            {/* ── Detail Sheet ── */}
            <Sheet open={sheetPaper !== null} onOpenChange={v => !v && setSheetPaper(null)}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-white z-10">
                        <SheetTitle className="text-lg">
                            #{sheetPaper?.paperId} — Camera-Ready Details
                        </SheetTitle>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {sheetPaper?.paperTitle}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="text-muted-foreground">
                                Track: <strong>{sheetPaper?.trackName}</strong>
                            </span>
                            <span className="text-muted-foreground">
                                Status: <strong>{sheetPaper?.paperStatus}</strong>
                            </span>
                        </div>
                    </SheetHeader>

                    <div className="p-6 space-y-5">
                        {sheetPaper && (
                            <>
                                {/* Status summary */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className={`rounded-lg border p-3 text-center ${
                                        sheetPaper.isApproved
                                            ? "bg-emerald-50 border-emerald-200"
                                            : sheetPaper.hasUploaded
                                            ? "bg-indigo-50 border-indigo-200"
                                            : "bg-amber-50 border-amber-200"
                                    }`}>
                                        <FileCheck className={`h-6 w-6 mx-auto mb-1 ${
                                            sheetPaper.isApproved
                                                ? "text-emerald-600"
                                                : sheetPaper.hasUploaded
                                                ? "text-indigo-600"
                                                : "text-amber-600"
                                        }`} />
                                        <p className="text-sm font-semibold">
                                            {sheetPaper.isApproved ? "Published" : sheetPaper.hasUploaded ? "Uploaded" : "Pending"}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border p-3 text-center">
                                        <p className="text-lg font-bold">{sheetPaper.files.length}</p>
                                        <p className="text-[10px] text-muted-foreground">File(s) Uploaded</p>
                                    </div>
                                </div>

                                {/* Files list */}
                                {sheetPaper.files.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Upload className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">No camera-ready files uploaded yet.</p>
                                        <p className="text-xs mt-1">The author has not submitted a final version.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                                            Uploaded Files ({sheetPaper.files.length})
                                        </p>
                                        {sheetPaper.files.map((f, i) => (
                                            <div
                                                key={f.id}
                                                className="flex items-center justify-between rounded-lg border px-4 py-3 bg-white hover:shadow-sm transition-shadow"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}.</span>
                                                    <FileText className="h-5 w-5 text-indigo-500" />
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            Camera-Ready File #{f.id}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {f.isActive ? "Active" : "Inactive"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <a
                                                    href={f.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    Open
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Approve button */}
                                {sheetPaper.hasUploaded && !sheetPaper.isApproved && (
                                    <Button
                                        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => {
                                            handleApprove(sheetPaper.paperId)
                                            setSheetPaper(null)
                                        }}
                                        disabled={approving === sheetPaper.paperId}
                                    >
                                        {approving === sheetPaper.paperId ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4" />
                                        )}
                                        Approve Camera-Ready & Publish
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
