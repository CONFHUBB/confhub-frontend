"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import {
    runAutoAssign,
    confirmAssignments,
    getCurrentAssignments,
    manualAssign,
    removeAssignment,
    type AssignmentPreview,
    type AssignmentPreviewItem,
    type AutoAssignConfig,
} from "@/app/api/assignment.api"
import { getConferenceUsersWithRoles } from "@/app/api/conference-user-track.api"
import { getPapersByConference } from "@/app/api/paper.api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { HelpTooltip } from "@/components/help-tooltip"
import {
    Loader2, Users, FileText, Wand2, Check, X, AlertTriangle,
    Search, Trash2, Plus, BarChart3, Settings2, UserPlus
} from "lucide-react"
import toast from "react-hot-toast"

interface ReviewerAssignmentProps {
    conferenceId: number
}

type ViewMode = "overview" | "auto-assign" | "preview"

interface SimpleReviewer {
    id: number
    name: string
    email: string
}

interface SimplePaper {
    id: number
    title: string
}

export function ReviewerAssignment({ conferenceId }: ReviewerAssignmentProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("overview")
    const [currentData, setCurrentData] = useState<AssignmentPreview | null>(null)
    const [previewData, setPreviewData] = useState<AssignmentPreview | null>(null)
    const [loading, setLoading] = useState(true)
    const [running, setRunning] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [groupBy, setGroupBy] = useState<"paper" | "reviewer">("paper")

    // Auto-assign config
    const [minReviewers, setMinReviewers] = useState(3)
    const [maxPapers, setMaxPapers] = useState(10)
    const [bidWeight, setBidWeight] = useState(0.6)
    const [relevanceWeight, setRelevanceWeight] = useState(0.4)
    const [loadBalancing, setLoadBalancing] = useState(false)

    // Manual assign
    const [showManualAssign, setShowManualAssign] = useState(false)
    const [manualPaperId, setManualPaperId] = useState<number | "">("")
    const [manualReviewerId, setManualReviewerId] = useState<number | "">("")
    const [assigning, setAssigning] = useState(false)
    const [reviewers, setReviewers] = useState<SimpleReviewer[]>([])
    const [papers, setPapers] = useState<SimplePaper[]>([])

    const fetchCurrentAssignments = useCallback(async () => {
        try {
            setLoading(true)
            const data = await getCurrentAssignments(conferenceId)
            setCurrentData(data)
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Không thể tải dữ liệu assignments"
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }, [conferenceId])

    // Fetch reviewers + papers for manual assign dropdown
    const fetchManualAssignData = useCallback(async () => {
        try {
            const [usersData, papersData] = await Promise.all([
                getConferenceUsersWithRoles(conferenceId, 0, 100),
                getPapersByConference(conferenceId),
            ])
            // Data structure: { content: [{ user: {...}, roles: [{ assignedRole }] }] }
            const content = (usersData as any)?.content || usersData || []
            const revs: SimpleReviewer[] = content
                .filter((u: any) => 
                    (u.roles || []).some((r: any) => r.assignedRole === "REVIEWER")
                )
                .map((u: any) => ({
                    id: u.user?.id || u.userId || u.id,
                    name: `${u.user?.firstName || ""} ${u.user?.lastName || ""}`.trim() || "Unknown",
                    email: u.user?.email || u.userEmail || "",
                }))
            setReviewers(revs)
            const paps: SimplePaper[] = (papersData || []).map((p: any) => ({
                id: p.id,
                title: p.title,
            }))
            setPapers(paps)
        } catch (err) {
            console.error("Failed to load manual assign data:", err)
        }
    }, [conferenceId])

    useEffect(() => {
        fetchCurrentAssignments()
    }, [fetchCurrentAssignments])

    useEffect(() => {
        if (showManualAssign && reviewers.length === 0) {
            fetchManualAssignData()
        }
    }, [showManualAssign, reviewers.length, fetchManualAssignData])

    const handleBidWeightChange = (val: number) => {
        setBidWeight(val)
        setRelevanceWeight(parseFloat((1 - val).toFixed(2)))
    }

    const handleRunAutoAssign = async () => {
        try {
            setRunning(true)
            const config: AutoAssignConfig = {
                conferenceId,
                minReviewersPerPaper: minReviewers,
                maxPapersPerReviewer: maxPapers,
                bidWeight,
                relevanceWeight,
                loadBalancing,
            }
            const preview = await runAutoAssign(config)
            setPreviewData(preview)
            setViewMode("preview")
            toast.success(`Tìm được ${preview.totalAssignments} assignments mới`)
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Lỗi khi chạy auto-assign"
            toast.error(msg)
        } finally {
            setRunning(false)
        }
    }

    const handleConfirm = async () => {
        if (!previewData) return
        try {
            setConfirming(true)
            await confirmAssignments(conferenceId, previewData.assignments)
            toast.success(`Đã lưu ${previewData.assignments.length} assignments!`)
            setViewMode("overview")
            setPreviewData(null)
            fetchCurrentAssignments()
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Lỗi khi lưu assignments"
            toast.error(msg)
        } finally {
            setConfirming(false)
        }
    }

    const handleManualAssign = async () => {
        if (!manualPaperId || !manualReviewerId) {
            toast.error("Vui lòng chọn paper và reviewer")
            return
        }
        try {
            setAssigning(true)
            await manualAssign(conferenceId, Number(manualPaperId), Number(manualReviewerId))
            toast.success("Đã gán reviewer thành công!")
            setManualPaperId("")
            setManualReviewerId("")
            setShowManualAssign(false)
            fetchCurrentAssignments()
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Lỗi khi gán reviewer"
            toast.error(msg)
        } finally {
            setAssigning(false)
        }
    }

    const handleRemoveAssignment = async (reviewId: number | undefined) => {
        if (!reviewId) {
            toast.error("Không tìm thấy review ID")
            return
        }
        if (!confirm("Xóa assignment này?")) return
        try {
            await removeAssignment(conferenceId, reviewId)
            toast.success("Đã xóa assignment")
            fetchCurrentAssignments()
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Lỗi khi xóa assignment"
            toast.error(msg)
        }
    }

    // Group assignments
    const groupedAssignments = useMemo(() => {
        const assignments = currentData?.assignments || []
        const filtered = searchQuery
            ? assignments.filter(a =>
                a.paperTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.reviewerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.reviewerEmail.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : assignments

        if (groupBy === "paper") {
            const groups = new Map<number, { title: string; items: AssignmentPreviewItem[] }>()
            filtered.forEach(a => {
                if (!groups.has(a.paperId)) {
                    groups.set(a.paperId, { title: a.paperTitle, items: [] })
                }
                groups.get(a.paperId)!.items.push(a)
            })
            return Array.from(groups.entries()).sort((a, b) => a[0] - b[0])
        } else {
            const groups = new Map<number, { name: string; email: string; items: AssignmentPreviewItem[] }>()
            filtered.forEach(a => {
                if (!groups.has(a.reviewerId)) {
                    groups.set(a.reviewerId, { name: a.reviewerName, email: a.reviewerEmail, items: [] })
                }
                groups.get(a.reviewerId)!.items.push(a)
            })
            return Array.from(groups.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name))
        }
    }, [currentData, searchQuery, groupBy])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">Quản Lý Reviewer Assignment</h2>
                    <HelpTooltip title="Hướng dẫn Assignment">
                        <p className="font-semibold mb-2">Cách gán reviewer cho papers:</p>
                        <ol className="list-decimal ml-4 space-y-1.5">
                            <li><strong>Auto-Assign</strong> — cấu hình trọng số + constraints → chạy thuật toán → preview → xác nhận</li>
                            <li><strong>Manual Assign</strong> — chọn paper + reviewer → gán trực tiếp</li>
                            <li><strong>Xóa</strong> — bấm nút thùng rác bên cạnh mỗi assignment</li>
                        </ol>
                        <p className="mt-3 text-amber-700 bg-amber-50 rounded p-2 text-xs">
                            <strong>Lưu ý:</strong> Hệ thống tự động loại trừ conflicts (bao gồm domain conflict).
                        </p>
                    </HelpTooltip>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={viewMode === "overview" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("overview")}
                    >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Tổng quan
                    </Button>
                    <Button
                        variant={viewMode === "auto-assign" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("auto-assign")}
                    >
                        <Settings2 className="h-4 w-4 mr-1" />
                        Auto-Assign
                    </Button>
                </div>
            </div>

            {/* Summary cards */}
            {currentData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card>
                        <CardContent className="p-4 text-center">
                            <FileText className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                            <p className="text-2xl font-bold">{currentData.totalPapers}</p>
                            <p className="text-xs text-muted-foreground">Papers</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <Users className="h-5 w-5 mx-auto mb-1 text-green-500" />
                            <p className="text-2xl font-bold">{currentData.totalReviewers}</p>
                            <p className="text-xs text-muted-foreground">Reviewers</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <Check className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                            <p className="text-2xl font-bold">{currentData.totalAssignments}</p>
                            <p className="text-xs text-muted-foreground">Assignments</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                            <p className="text-2xl font-bold">{currentData.unassignedPapers}</p>
                            <p className="text-xs text-muted-foreground">Chưa đủ reviewer</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Auto-Assign Config Panel */}
            {viewMode === "auto-assign" && (
                <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Wand2 className="h-5 w-5 text-blue-600" />
                            Cấu hình Auto-Assign
                        </CardTitle>
                        <CardDescription>
                            Điều chỉnh tham số để thuật toán tìm assignments tối ưu
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">
                                    Số reviewer tối thiểu / paper
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={minReviewers}
                                    onChange={e => setMinReviewers(Number(e.target.value))}
                                    className="bg-white"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">
                                    Số paper tối đa / reviewer
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={maxPapers}
                                    onChange={e => setMaxPapers(Number(e.target.value))}
                                    className="bg-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">
                                Trọng số: Bid ({(bidWeight * 100).toFixed(0)}%) vs Relevance ({(relevanceWeight * 100).toFixed(0)}%)
                            </label>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={bidWeight * 100}
                                onChange={e => handleBidWeightChange(Number(e.target.value) / 100)}
                                className="w-full accent-blue-600"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>← Ưu tiên Bid</span>
                                <span>Ưu tiên Relevance →</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="load-balancing"
                                checked={loadBalancing}
                                onChange={e => setLoadBalancing(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <label htmlFor="load-balancing" className="text-sm">
                                <span className="font-medium">Cân bằng tải</span>
                                <span className="text-muted-foreground ml-1">— phân bổ papers đều giữa các reviewers</span>
                            </label>
                        </div>

                        <Button
                            onClick={handleRunAutoAssign}
                            disabled={running}
                            className="w-full gap-2"
                        >
                            {running ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Wand2 className="h-4 w-4" />
                            )}
                            {running ? "Đang chạy..." : "Chạy Auto-Assign"}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Preview Panel */}
            {viewMode === "preview" && previewData && (
                <Card className="border-emerald-200 bg-emerald-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Check className="h-5 w-5 text-emerald-600" />
                            Preview Kết Quả Auto-Assign
                        </CardTitle>
                        <CardDescription>
                            Xem và xác nhận trước khi lưu vào hệ thống
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="rounded-lg border p-3 text-center bg-white">
                                <p className="text-2xl font-bold text-emerald-600">{previewData.totalAssignments}</p>
                                <p className="text-xs text-muted-foreground">Assignments mới</p>
                            </div>
                            <div className="rounded-lg border p-3 text-center bg-white">
                                <p className="text-2xl font-bold">{previewData.totalPapers}</p>
                                <p className="text-xs text-muted-foreground">Papers</p>
                            </div>
                            <div className="rounded-lg border p-3 text-center bg-white">
                                <p className="text-2xl font-bold text-amber-600">{previewData.unassignedPapers}</p>
                                <p className="text-xs text-muted-foreground">Chưa đủ reviewer</p>
                            </div>
                        </div>

                        {previewData.assignments.length > 0 ? (
                            <div className="max-h-80 overflow-y-auto rounded-lg border bg-white divide-y">
                                {previewData.assignments.map((a, i) => (
                                    <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{a.paperTitle}</p>
                                            <p className="text-xs text-muted-foreground">
                                                → {a.reviewerName} ({a.reviewerEmail})
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs shrink-0 ml-4">
                                            <span title="Combined Score" className="font-mono font-semibold">
                                                {(a.score * 100).toFixed(0)}%
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                                Bid: {(a.bidScore * 100).toFixed(0)}%
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                SA: {(a.relevanceScore * 100).toFixed(0)}%
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center py-4 text-muted-foreground">
                                Không tìm được assignments phù hợp. Thử điều chỉnh tham số.
                            </p>
                        )}

                        <div className="flex gap-3 mt-4">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => { setViewMode("auto-assign"); setPreviewData(null) }}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Hủy & Cấu hình lại
                            </Button>
                            <Button
                                className="flex-1 gap-2"
                                disabled={confirming || previewData.assignments.length === 0}
                                onClick={handleConfirm}
                            >
                                {confirming ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                {confirming ? "Đang lưu..." : `Xác nhận ${previewData.assignments.length} Assignments`}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Current Assignments - Overview */}
            {viewMode === "overview" && currentData && (
                <div className="space-y-4">
                    {/* Toolbar: Search + Group + Manual Assign button */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                className="pl-10 h-10"
                                placeholder="Tìm theo tên paper, reviewer..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant={groupBy === "paper" ? "default" : "outline"}
                                onClick={() => setGroupBy("paper")}
                            >
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                Theo Paper
                            </Button>
                            <Button
                                size="sm"
                                variant={groupBy === "reviewer" ? "default" : "outline"}
                                onClick={() => setGroupBy("reviewer")}
                            >
                                <Users className="h-3.5 w-3.5 mr-1" />
                                Theo Reviewer
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 border-green-300 text-green-700 hover:bg-green-50"
                                onClick={() => setShowManualAssign(!showManualAssign)}
                            >
                                <UserPlus className="h-3.5 w-3.5" />
                                Manual Assign
                            </Button>
                        </div>
                    </div>

                    {/* Manual Assign Form */}
                    {showManualAssign && (
                        <Card className="border-green-200 bg-green-50/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <UserPlus className="h-4 w-4 text-green-600" />
                                    <h4 className="font-semibold text-sm">Gán Reviewer Thủ Công</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 block mb-1">Paper</label>
                                        <select
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                            value={manualPaperId}
                                            onChange={e => setManualPaperId(e.target.value ? Number(e.target.value) : "")}
                                        >
                                            <option value="">-- Chọn paper --</option>
                                            {papers.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    #{p.id} — {p.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 block mb-1">Reviewer</label>
                                        <select
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                            value={manualReviewerId}
                                            onChange={e => setManualReviewerId(e.target.value ? Number(e.target.value) : "")}
                                        >
                                            <option value="">-- Chọn reviewer --</option>
                                            {reviewers.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name} ({r.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <Button
                                            size="sm"
                                            disabled={assigning || !manualPaperId || !manualReviewerId}
                                            onClick={handleManualAssign}
                                            className="gap-1"
                                        >
                                            {assigning ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Plus className="h-3.5 w-3.5" />
                                            )}
                                            Gán
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setShowManualAssign(false)}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Assignment List */}
                    {groupedAssignments.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            <p>
                                {searchQuery
                                    ? "Không tìm thấy kết quả."
                                    : "Chưa có assignments. Hãy chạy Auto-Assign hoặc Manual Assign."
                                }
                            </p>
                            {!searchQuery && (
                                <div className="flex gap-2 justify-center mt-3">
                                    <Button
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => setViewMode("auto-assign")}
                                    >
                                        <Wand2 className="h-4 w-4" />
                                        Auto-Assign
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => setShowManualAssign(true)}
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        Manual Assign
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {groupBy === "paper" ? (
                                (groupedAssignments as [number, { title: string; items: AssignmentPreviewItem[] }][]).map(
                                    ([paperId, group]) => (
                                        <Card key={paperId}>
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h4 className="font-semibold text-sm">
                                                            #{paperId} — {group.title}
                                                        </h4>
                                                        <p className="text-xs text-muted-foreground">
                                                            {group.items.length} reviewer(s) assigned
                                                        </p>
                                                    </div>
                                                    <Badge
                                                        variant={group.items.length >= minReviewers ? "default" : "destructive"}
                                                        className="text-xs"
                                                    >
                                                        {group.items.length} / {minReviewers}
                                                    </Badge>
                                                </div>
                                                <div className="divide-y rounded-lg border">
                                                    {group.items.map((item, i) => (
                                                        <div key={i} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50">
                                                            <div className="flex-1 min-w-0">
                                                                <span>{item.reviewerName}</span>
                                                                <span className="text-muted-foreground text-xs ml-1">({item.reviewerEmail})</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-xs text-muted-foreground font-mono">
                                                                    {(item.score * 100).toFixed(0)}%
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                    onClick={() => handleRemoveAssignment(item.reviewId)}
                                                                    title="Xóa assignment"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                )
                            ) : (
                                (groupedAssignments as [number, { name: string; email: string; items: AssignmentPreviewItem[] }][]).map(
                                    ([reviewerId, group]) => (
                                        <Card key={reviewerId}>
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h4 className="font-semibold text-sm">{group.name}</h4>
                                                        <p className="text-xs text-muted-foreground">{group.email}</p>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs">
                                                        {group.items.length} paper(s)
                                                    </Badge>
                                                </div>
                                                <div className="divide-y rounded-lg border">
                                                    {group.items.map((item, i) => (
                                                        <div key={i} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50">
                                                            <span className="flex-1 min-w-0 truncate">
                                                                #{item.paperId} — {item.paperTitle}
                                                            </span>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-xs text-muted-foreground font-mono">
                                                                    {(item.score * 100).toFixed(0)}%
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                    onClick={() => handleRemoveAssignment(item.reviewId)}
                                                                    title="Xóa assignment"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                )
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
