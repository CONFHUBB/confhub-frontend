"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { getConferenceUsersWithRoles } from "@/app/api/conference-user-track.api"
import { getBidsSummary, getBidsByReviewerAndConference } from "@/app/api/bidding.api"
import { getCurrentAssignments, type AssignmentPreviewItem } from "@/app/api/assignment.api"
import { getConflictsByConference } from "@/app/api/conflict.api"
import { getUserProfile } from "@/app/api/user.api"
import type { BidsSummary, BiddingResponse } from "@/types/bidding"
import type { PaperConflictResponse } from "@/types/conflict"
import type { UserProfile } from "@/types/user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
    Loader2, Search, Download, Eye, Users, ChevronLeft, ChevronRight, 
    Zap, ThumbsUp, Minus, ThumbsDown, FileSpreadsheet,
    Building2, Mail, Globe, GraduationCap, Phone, User2
} from "lucide-react"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"

interface BiddingManagementProps {
    conferenceId: number
}

interface ReviewerRow {
    id: number
    firstName: string
    lastName: string
    email: string
    institution: string
    quota: number | null
    assigned: number
    completed: number
    percentCompleted: number
    totalBids: number
    bidCounts: Record<string, number>
    conflictCount: number
}

const BID_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    EAGER: { label: "Eager", color: "bg-emerald-100 text-emerald-700", icon: <Zap className="h-3 w-3" /> },
    WILLING: { label: "Willing", color: "bg-indigo-100 text-indigo-700", icon: <ThumbsUp className="h-3 w-3" /> },
    IN_A_PINCH: { label: "In a Pinch", color: "bg-amber-100 text-amber-700", icon: <Minus className="h-3 w-3" /> },
    NOT_WILLING: { label: "Not Willing", color: "bg-red-100 text-red-700", icon: <ThumbsDown className="h-3 w-3" /> },
}

const PAGE_SIZE = 10

export function BiddingManagement({ conferenceId }: BiddingManagementProps) {
    const [rows, setRows] = useState<ReviewerRow[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterBid, setFilterBid] = useState<"all" | "has_bids" | "no_bids">("all")
    const [currentPage, setCurrentPage] = useState(0)

    // Detail sheet
    const [detailReviewerId, setDetailReviewerId] = useState<number | null>(null)
    const [detailBids, setDetailBids] = useState<BiddingResponse[]>([])
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailTab, setDetailTab] = useState<"profile" | "bids">("profile")
    const [detailProfile, setDetailProfile] = useState<UserProfile | null>(null)
    const [profileLoading, setProfileLoading] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)

            // 1. Fetch all conference users with roles (paginated, max 100 per page)
            let allUsers: any[] = []
            let page = 0
            while (true) {
                const usersData = await getConferenceUsersWithRoles(conferenceId, page, 100)
                const content = (usersData as any)?.content || usersData || []
                const items = Array.isArray(content) ? content : []
                allUsers = [...allUsers, ...items]
                const totalPages = (usersData as any)?.totalPages || 1
                if (page + 1 >= totalPages || items.length === 0) break
                page++
            }

            // 2. Filter reviewers only
            const reviewerUsers = allUsers
                .filter((u: any) =>
                    (u.roles || []).some((r: any) => r.assignedRole === "REVIEWER")
                )
                .map((u: any) => {
                    const reviewerRoles = (u.roles || []).filter((r: any) => r.assignedRole === "REVIEWER")
                    const quota = reviewerRoles.length > 0 ? (reviewerRoles[0].reviewerQuota ?? null) : null
                    return {
                        id: u.user?.id || u.userId || u.id,
                        firstName: u.user?.firstName || "",
                        lastName: u.user?.lastName || "",
                        email: u.user?.email || u.userEmail || "",
                        institution: u.user?.institution || "",
                        quota,
                    }
                })

            // 3. Fetch assignments and conflicts in parallel
            const [assignmentData, conflictsData] = await Promise.all([
                getCurrentAssignments(conferenceId).catch(() => null),
                getConflictsByConference(conferenceId).catch(() => [] as PaperConflictResponse[]),
            ])

            const assignments = assignmentData?.assignments || []

            // 4. Compute per-reviewer assignment counts
            const assignedCountMap: Record<number, number> = {}
            const completedCountMap: Record<number, number> = {}
            assignments.forEach((a: AssignmentPreviewItem) => {
                assignedCountMap[a.reviewerId] = (assignedCountMap[a.reviewerId] || 0) + 1
            })

            // Count completed reviews (those with reviewId set)
            assignments.forEach((a: AssignmentPreviewItem) => {
                if (a.reviewId) {
                    // We count reviewId presence as "has review", but we can't determine COMPLETED status
                    // without fetching each review. For optimization, count reviewId as assigned-with-review.
                }
            })

            // 5. Compute per-reviewer conflict counts
            const conflictCountMap: Record<number, number> = {}
            ;(conflictsData || []).forEach((c: PaperConflictResponse) => {
                const userId = c.user?.id
                if (userId) {
                    conflictCountMap[userId] = (conflictCountMap[userId] || 0) + 1
                }
            })

            // 6. Fetch bid summaries for all reviewers in parallel
            const bidSummaries = await Promise.all(
                reviewerUsers.map(async (r: any) => {
                    try {
                        const summary = await getBidsSummary(r.id, conferenceId)
                        return { reviewerId: r.id, summary }
                    } catch {
                        return { reviewerId: r.id, summary: null }
                    }
                })
            )
            const bidSummaryMap: Record<number, BidsSummary> = {}
            bidSummaries.forEach(({ reviewerId, summary }) => {
                if (summary) bidSummaryMap[reviewerId] = summary
            })

            // 7. Build rows
            const builtRows: ReviewerRow[] = reviewerUsers.map((r: any) => {
                const assigned = assignedCountMap[r.id] || 0
                const completed = completedCountMap[r.id] || 0
                const bidSummary = bidSummaryMap[r.id]
                return {
                    id: r.id,
                    firstName: r.firstName,
                    lastName: r.lastName,
                    email: r.email,
                    institution: r.institution,
                    quota: r.quota,
                    assigned,
                    completed,
                    percentCompleted: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
                    totalBids: bidSummary?.totalBids || 0,
                    bidCounts: bidSummary?.bidCounts || {},
                    conflictCount: conflictCountMap[r.id] || 0,
                }
            })

            setRows(builtRows)
        } catch (err) {
            console.error("Failed to load reviewer data:", err)
            toast.error("Không thể tải dữ liệu reviewer")
        } finally {
            setLoading(false)
        }
    }, [conferenceId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Filter + search
    const filteredRows = useMemo(() => {
        let list = rows
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            list = list.filter(r =>
                r.firstName.toLowerCase().includes(q) ||
                r.lastName.toLowerCase().includes(q) ||
                r.email.toLowerCase().includes(q) ||
                r.institution.toLowerCase().includes(q)
            )
        }
        if (filterBid === "has_bids") {
            list = list.filter(r => r.totalBids > 0)
        } else if (filterBid === "no_bids") {
            list = list.filter(r => r.totalBids === 0)
        }
        return list
    }, [rows, searchQuery, filterBid])

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
    const paginatedRows = filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

    useEffect(() => {
        setCurrentPage(0)
    }, [searchQuery, filterBid])

    // Export Excel
    const handleExportExcel = () => {
        const data = filteredRows.map(r => ({
            "First Name": r.firstName,
            "Last Name": r.lastName,
            "Email": r.email,
            "Institution": r.institution,
            "Quota": r.quota ?? "Not Set",
            "Assigned": r.assigned,
            "Completed": r.completed,
            "% Completed": `${r.percentCompleted}%`,
            "Total Bids": r.totalBids,
            "Eager": r.bidCounts["EAGER"] || 0,
            "Willing": r.bidCounts["WILLING"] || 0,
            "In a Pinch": r.bidCounts["IN_A_PINCH"] || 0,
            "Not Willing": r.bidCounts["NOT_WILLING"] || 0,
            "Conflicts": r.conflictCount,
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Reviewers")
        XLSX.writeFile(wb, `reviewers_conference_${conferenceId}.xlsx`)
        toast.success("Đã xuất file Excel!")
    }

    // Open detail sheet
    const openDetail = async (reviewerId: number) => {
        setDetailReviewerId(reviewerId)
        setDetailTab("profile")
        setDetailBids([])
        setDetailProfile(null)

        // Fetch profile
        setProfileLoading(true)
        getUserProfile(reviewerId)
            .then(p => setDetailProfile(p))
            .catch(() => setDetailProfile(null))
            .finally(() => setProfileLoading(false))

        // Fetch bids
        setDetailLoading(true)
        getBidsByReviewerAndConference(reviewerId, conferenceId)
            .then(bids => setDetailBids(bids || []))
            .catch(() => toast.error("Không thể tải chi tiết bids"))
            .finally(() => setDetailLoading(false))
    }

    const detailReviewer = rows.find(r => r.id === detailReviewerId)

    // Stats
    const totalReviewers = rows.length
    const reviewersWithBids = rows.filter(r => r.totalBids > 0).length
    const totalBidsAll = rows.reduce((sum, r) => sum + r.totalBids, 0)

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <Card>
                    <CardContent className="p-4 text-center">
                        <Users className="h-5 w-5 mx-auto mb-1 text-indigo-500" />
                        <p className="text-2xl font-bold">{totalReviewers}</p>
                        <p className="text-xs text-muted-foreground">Reviewers</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <Zap className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                        <p className="text-2xl font-bold">{reviewersWithBids}</p>
                        <p className="text-xs text-muted-foreground">Đã đặt Bid</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <ThumbsUp className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                        <p className="text-2xl font-bold">{totalBidsAll}</p>
                        <p className="text-xs text-muted-foreground">Tổng Bids</p>
                    </CardContent>
                </Card>
            </div>

            {/* Toolbar */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5 text-indigo-600" />
                            Quản lý Reviewer
                            <Badge variant="outline" className="text-xs ml-1">{filteredRows.length}</Badge>
                        </CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative w-60">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    className="pl-10 h-9 text-sm"
                                    placeholder="Tìm theo tên, email..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <select
                                className="h-9 rounded-md border px-3 text-sm bg-white"
                                value={filterBid}
                                onChange={e => setFilterBid(e.target.value as any)}
                            >
                                <option value="all">Tất cả</option>
                                <option value="has_bids">Đã đặt bid</option>
                                <option value="no_bids">Chưa đặt bid</option>
                            </select>
                            <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleExportExcel}>
                                <FileSpreadsheet className="h-4 w-4" />
                                Xuất Excel
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Name</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Name</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[180px]">Email</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Institution</th>
                                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quota</th>
                                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned</th>
                                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">% Done</th>
                                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bids</th>
                                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conflicts</th>
                                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginatedRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-12 text-muted-foreground">
                                            {searchQuery || filterBid !== "all"
                                                ? "Không tìm thấy reviewer phù hợp."
                                                : "Chưa có reviewer nào trong conference này."}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRows.map(row => (
                                        <tr key={row.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-4 font-medium">{row.firstName}</td>
                                            <td className="px-5 py-4 font-medium">{row.lastName}</td>
                                            <td className="px-5 py-4 text-muted-foreground text-xs">{row.email}</td>
                                            <td className="px-5 py-4 text-xs text-muted-foreground">{row.institution || "—"}</td>
                                            <td className="px-5 py-4 text-center">
                                                {row.quota !== null ? (
                                                    <span className="font-semibold">{row.quota}</span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Not Set</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`font-semibold ${row.assigned > 0 ? "text-indigo-600" : ""}`}>
                                                    {row.assigned}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                {row.assigned > 0 ? (
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                        row.percentCompleted === 100
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : row.percentCompleted > 0
                                                                ? "bg-amber-100 text-amber-700"
                                                                : "bg-gray-100 text-gray-500"
                                                    }`}>
                                                        {row.percentCompleted}%
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`font-semibold ${
                                                    row.totalBids > 0 ? "text-emerald-600" : "text-muted-foreground"
                                                }`}>
                                                    {row.totalBids}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={row.conflictCount > 0 ? "text-amber-600 font-semibold" : "text-muted-foreground"}>
                                                    {row.conflictCount}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                    onClick={() => openDetail(row.id)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {filteredRows.length > PAGE_SIZE && (
                        <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/10">
                            <p className="text-xs text-muted-foreground">
                                Hiển thị {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filteredRows.length)} / {filteredRows.length} reviewers
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    disabled={currentPage === 0}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <Button
                                        key={i}
                                        variant={currentPage === i ? "default" : "outline"}
                                        size="sm"
                                        className="h-8 w-8 p-0 text-xs"
                                        onClick={() => setCurrentPage(i)}
                                    >
                                        {i + 1}
                                    </Button>
                                )).slice(
                                    Math.max(0, currentPage - 2),
                                    Math.min(totalPages, currentPage + 3)
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    disabled={currentPage >= totalPages - 1}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Sheet */}
            <Sheet open={detailReviewerId !== null} onOpenChange={v => !v && setDetailReviewerId(null)}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
                    <SheetHeader className="px-6 pt-6 pb-2 border-b sticky top-0 bg-white z-10">
                        <SheetTitle className="text-lg">
                            {detailReviewer?.firstName} {detailReviewer?.lastName}
                        </SheetTitle>
                        <p className="text-xs text-muted-foreground">{detailReviewer?.email}</p>
                        {/* Tabs */}
                        <div className="flex gap-1 pt-2 -mb-[9px]">
                            <button
                                onClick={() => setDetailTab("profile")}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                                    detailTab === "profile"
                                        ? "border-indigo-600 text-indigo-600"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <User2 className="h-3.5 w-3.5" />
                                Profile
                            </button>
                            <button
                                onClick={() => setDetailTab("bids")}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                                    detailTab === "bids"
                                        ? "border-indigo-600 text-indigo-600"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <Zap className="h-3.5 w-3.5" />
                                Bid Detail
                                {detailBids.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold">
                                        {detailBids.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </SheetHeader>

                    <div className="p-6">
                        {/* ── Profile Tab ── */}
                        {detailTab === "profile" && (
                            profileLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* Basic info */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thông tin cơ bản</h4>
                                        <div className="grid gap-3">
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                                <Mail className="h-4 w-4 text-indigo-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground uppercase">Email</p>
                                                    <p className="text-sm font-medium">{detailReviewer?.email || "—"}</p>
                                                </div>
                                            </div>
                                            {detailProfile?.institution && (
                                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                                    <Building2 className="h-4 w-4 text-indigo-500 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase">Institution</p>
                                                        <p className="text-sm font-medium">{detailProfile.institution}</p>
                                                        {detailProfile.institutionCountry && (
                                                            <p className="text-xs text-muted-foreground">{detailProfile.institutionCountry}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {detailProfile?.department && (
                                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                                    <GraduationCap className="h-4 w-4 text-indigo-500 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase">Department</p>
                                                        <p className="text-sm font-medium">{detailProfile.department}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {detailProfile?.jobTitle && (
                                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                                    <User2 className="h-4 w-4 text-indigo-500 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase">Job Title</p>
                                                        <p className="text-sm font-medium">{detailProfile.jobTitle}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {detailProfile?.phoneMobile && (
                                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                                    <Phone className="h-4 w-4 text-indigo-500 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase">Phone</p>
                                                        <p className="text-sm font-medium">{detailProfile.phoneMobile}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {detailProfile?.websiteUrl && (
                                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                                    <Globe className="h-4 w-4 text-indigo-500 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase">Website</p>
                                                        <a href={detailProfile.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:underline">
                                                            {detailProfile.websiteUrl}
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Conference stats */}
                                    {detailReviewer && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thống kê Conference</h4>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="text-center p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                                                    <p className="text-lg font-bold text-indigo-700">{detailReviewer.quota ?? "—"}</p>
                                                    <p className="text-[10px] text-indigo-600">Quota</p>
                                                </div>
                                                <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                                                    <p className="text-lg font-bold text-emerald-700">{detailReviewer.assigned}</p>
                                                    <p className="text-[10px] text-emerald-600">Assigned</p>
                                                </div>
                                                <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-100">
                                                    <p className="text-lg font-bold text-amber-700">{detailReviewer.totalBids}</p>
                                                    <p className="text-[10px] text-amber-600">Bids</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Biography */}
                                    {detailProfile?.biography && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tiểu sử</h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
                                                {detailProfile.biography}
                                            </p>
                                        </div>
                                    )}

                                    {/* Academic links */}
                                    {(detailProfile?.orcidId || detailProfile?.googleScholarLink || detailProfile?.dblpId) && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Liên kết học thuật</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {detailProfile.orcidId && (
                                                    <a href={`https://orcid.org/${detailProfile.orcidId}`} target="_blank" rel="noopener noreferrer"
                                                       className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                                                        ORCID: {detailProfile.orcidId}
                                                    </a>
                                                )}
                                                {detailProfile.googleScholarLink && (
                                                    <a href={detailProfile.googleScholarLink} target="_blank" rel="noopener noreferrer"
                                                       className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
                                                        Google Scholar
                                                    </a>
                                                )}
                                                {detailProfile.dblpId && (
                                                    <a href={`https://dblp.org/pid/${detailProfile.dblpId}`} target="_blank" rel="noopener noreferrer"
                                                       className="text-xs px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 transition-colors">
                                                        DBLP: {detailProfile.dblpId}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {!detailProfile && !profileLoading && (
                                        <p className="text-sm text-muted-foreground text-center py-6">Reviewer chưa cập nhật profile.</p>
                                    )}
                                </div>
                            )
                        )}

                        {/* ── Bid Detail Tab ── */}
                        {detailTab === "bids" && (
                            detailLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                            ) : detailBids.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-8 text-center">Reviewer này chưa đặt bid nào.</p>
                            ) : (
                                <div className="space-y-4">
                                    {/* Bid summary */}
                                    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 border">
                                        {Object.entries(BID_LABELS).map(([key, { label, color, icon }]) => {
                                            const count = detailBids.filter(b => b.bidValue === key).length
                                            return (
                                                <div key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
                                                    {icon}
                                                    <span>{count}</span>
                                                    <span className="opacity-70">{label}</span>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Bid list */}
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                            Tất cả Bids ({detailBids.length})
                                        </p>
                                        {detailBids.map(bid => {
                                            const bidInfo = BID_LABELS[bid.bidValue]
                                            return (
                                                <div key={bid.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-muted/20 transition-colors">
                                                    <div className="flex-1 min-w-0 mr-3">
                                                        <p className="text-sm font-medium line-clamp-1">{bid.paperTitle}</p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            Paper #{bid.paperId} · {new Date(bid.updatedAt || bid.createdAt).toLocaleDateString("vi-VN")}
                                                        </p>
                                                    </div>
                                                    {bidInfo && (
                                                        <Badge className={`shrink-0 text-[10px] gap-1 ${bidInfo.color}`}>
                                                            {bidInfo.icon}
                                                            {bidInfo.label}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
