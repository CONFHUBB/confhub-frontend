"use client"
import { Fragment, useEffect, useState, useMemo, useCallback } from "react"
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
import { getPapersByConference, getAuthorsByPaper, type PaperAuthorItem } from "@/app/api/paper.api"
import { getConflictsByConference } from "@/app/api/conflict.api"
import { getBidsByPaper } from "@/app/api/bidding.api"
import type { BiddingResponse } from "@/types/bidding"
import { getSubjectAreasByTrack, getTrackReviewSettings } from "@/app/api/track.api"
import { getAggregatesByConference, type ReviewAggregate } from "@/app/api/review-aggregate.api"
import { getReviewById } from "@/app/api/review.api"
import { getUserProfile } from "@/app/api/user.api"
import type { ReviewStatus } from "@/types/review"
import type { PaperResponse } from "@/types/paper"
import type { PaperConflictResponse } from "@/types/conflict"
import type { UserProfile } from "@/types/user"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { HelpTooltip } from "@/components/help-tooltip"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Loader2, Users, FileText, Wand2, Check, X, AlertTriangle,
    Search, Trash2, Plus, BarChart3, Settings2, UserPlus, ArrowLeft, Edit, Eye, MoreHorizontal, Gavel, User2,
    ChevronDown, ChevronLeft, ChevronRight, Building2, Phone, GraduationCap
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from 'sonner'
import { ReviewDetailDialog } from "./review-detail-dialog"
import { AutoAssignPanel } from "./_components/auto-assign-panel"
import { AssignmentPreviewPanel } from "./_components/assignment-preview-panel"
import { ReviewerInfoSheet } from "./_components/reviewer-info-sheet"
import { AssignReviewersDialog } from "./_components/assign-reviewers-dialog"
import { UserLink } from '@/components/shared/user-link'

interface ReviewerAssignmentProps {
    conferenceId: number
}

type ViewMode = "overview" | "auto-assign" | "preview" | "edit-paper"

interface SimpleReviewer {
    id: number
    name: string
    email: string
    quota: number | null
    trackIds: number[]
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

    // Auto-assign config
    const [minReviewers, setMinReviewers] = useState(3)
    const [maxPapers, setMaxPapers] = useState(10)
    const [bidWeight, setBidWeight] = useState(0.6)
    const [relevanceWeight, setRelevanceWeight] = useState(0.4)
    const [loadBalancing, setLoadBalancing] = useState(false)

    // Manual assign (for edit-paper view)
    const [assigning, setAssigning] = useState(false)
    const [reviewers, setReviewers] = useState<SimpleReviewer[]>([])
    const [papers, setPapers] = useState<SimplePaper[]>([])

    // ── NEW: Paper-centric data ──
    const [fullPapers, setFullPapers] = useState<PaperResponse[]>([])
    const [paperAuthors, setPaperAuthors] = useState<Record<number, string>>({}) // paperId -> "Author1, Author2"
    const [allConflicts, setAllConflicts] = useState<PaperConflictResponse[]>([])
    const [subjectAreaMap, setSubjectAreaMap] = useState<Record<number, string>>({}) // saId -> name
    const [editingPaperId, setEditingPaperId] = useState<number | null>(null)
    const [paperSearchQuery, setPaperSearchQuery] = useState("")
    const [reviewerSearchQuery, setReviewerSearchQuery] = useState("")
    const [paperBids, setPaperBids] = useState<BiddingResponse[]>([])
    const [showAggregateColumns, setShowAggregateColumns] = useState(false)
    const [aggregateMap, setAggregateMap] = useState<Record<number, ReviewAggregate>>({})
    const [reviewStatusMap, setReviewStatusMap] = useState<Record<number, { status: ReviewStatus; reviewId: number }>>({})
    const [viewingReviewId, setViewingReviewId] = useState<number | null>(null)

    // ── Bid summary for overview table ──
    const [allPaperBidSummary, setAllPaperBidSummary] = useState<Record<number, { eager: number; willing: number; inAPinch: number; notWilling: number; total: number }>>({})
    const [bidSheetPaperId, setBidSheetPaperId] = useState<number | null>(null)
    const [bidSheetBids, setBidSheetBids] = useState<BiddingResponse[]>([])
    const [bidSheetLoading, setBidSheetLoading] = useState(false)
    // ── Reviewer info sheet ──
    const [reviewerInfoId, setReviewerInfoId] = useState<number | null>(null)
    const [reviewerProfile, setReviewerProfile] = useState<UserProfile | null>(null)
    const [reviewerProfileLoading, setReviewerProfileLoading] = useState(false)

    // ── Expandable row state ──
    const [expandedPaperId, setExpandedPaperId] = useState<number | null>(null)
    const [expandedBids, setExpandedBids] = useState<BiddingResponse[]>([])
    const [expandedReviewStatus, setExpandedReviewStatus] = useState<Record<number, { status: ReviewStatus; reviewId: number }>>({})
    const [expandedLoading, setExpandedLoading] = useState(false)
    const [inlineAssigning, setInlineAssigning] = useState<number | null>(null) // reviewerId being assigned

    // ── Dialog-based reviewer assignment popup ──
    const [dialogPaperId, setDialogPaperId] = useState<number | null>(null)
    const [dialogBids, setDialogBids] = useState<BiddingResponse[]>([])
    const [dialogLoading, setDialogLoading] = useState(false)
    const [dialogReviewerSearch, setDialogReviewerSearch] = useState("")
    const [dialogAssigning, setDialogAssigning] = useState<number | null>(null)
    const [dialogReviewStatus, setDialogReviewStatus] = useState<Record<number, { status: ReviewStatus; reviewId: number }>>({})

    // ── Fetch reviewer profile when info sheet opens ──
    useEffect(() => {
        if (reviewerInfoId === null) return
        setReviewerProfileLoading(true)
        setReviewerProfile(null)
        getUserProfile(reviewerInfoId)
            .then(p => setReviewerProfile(p))
            .catch(() => setReviewerProfile(null))
            .finally(() => setReviewerProfileLoading(false))
    }, [reviewerInfoId])

    // ── NEW: Paper detail sheet ──
    interface DetailReviewerInfo {
        reviewerId: number
        reviewerName: string
        reviewId: number | undefined
        status: ReviewStatus | null
        relevanceScore: number
        bidScore: number
        totalScore: number | null
    }
    const [detailPaperId, setDetailPaperId] = useState<number | null>(null)
    const [detailReviewers, setDetailReviewers] = useState<DetailReviewerInfo[]>([])

    // ── Pagination ──
    const PAGE_SIZE = 10
    const [currentPage, setCurrentPage] = useState(0)

    const [detailLoading, setDetailLoading] = useState(false)

    // ── Fetch assignments ──
    const fetchCurrentAssignments = useCallback(async () => {
        try {
            setLoading(true)
            const data = await getCurrentAssignments(conferenceId)
            setCurrentData(data)
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Failed to load assignments"
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }, [conferenceId])

    // ── Fetch papers, authors, conflicts, subject areas ──
    const fetchPaperData = useCallback(async () => {
        try {
            const [papersData, conflictsData] = await Promise.all([
                getPapersByConference(conferenceId),
                getConflictsByConference(conferenceId),
            ])
            setFullPapers(papersData || [])
            setAllConflicts(conflictsData || [])

            // Fetch authors for all papers in parallel
            const authorResults = await Promise.all(
                (papersData || []).map(async (p) => {
                    try {
                        const authors = await getAuthorsByPaper(p.id)
                        return { paperId: p.id, authors }
                    } catch {
                        return { paperId: p.id, authors: [] as PaperAuthorItem[] }
                    }
                })
            )
            const authorMap: Record<number, string> = {}
            authorResults.forEach(({ paperId, authors }) => {
                authorMap[paperId] = authors.map(a => a.user.fullName || `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim()).join(", ") || "—"
            })
            setPaperAuthors(authorMap)

            // Fetch subject areas for unique tracks
            const trackIds = Array.from(new Set((papersData || []).map(p => p.trackId).filter(Boolean)))
            const saMap: Record<number, string> = {}
            await Promise.all(
                trackIds.map(async (trackId) => {
                    try {
                        const areas = await getSubjectAreasByTrack(trackId)
                        areas.forEach(sa => { saMap[sa.id] = sa.name })
                    } catch { /* ignore */ }
                })
            )
            setSubjectAreaMap(saMap)

            // Check showAggregateColumns setting per track and fetch aggregates
            try {
                const settingsResults = await Promise.all(
                    trackIds.map(async (trackId) => {
                        try {
                            const settings = await getTrackReviewSettings(trackId)
                            return settings?.showAggregateColumns === true
                        } catch { return false }
                    })
                )
                const anyShowAggregate = settingsResults.some(v => v)
                setShowAggregateColumns(anyShowAggregate)
                if (anyShowAggregate) {
                    const aggData = await getAggregatesByConference(conferenceId)
                    const aggMap: Record<number, ReviewAggregate> = {}
                    ;(aggData || []).forEach(a => { aggMap[a.paperId] = a })
                    setAggregateMap(aggMap)
                }
            } catch { /* ignore */ }
            // ── Fetch bid summary for all papers ──
            try {
                const bidSummaryMap: Record<number, { eager: number; willing: number; inAPinch: number; notWilling: number; total: number }> = {}
                await Promise.all(
                    (papersData || []).map(async (p) => {
                        try {
                            const bids = await getBidsByPaper(p.id)
                            const eager = bids.filter(b => b.bidValue === 'EAGER').length
                            const willing = bids.filter(b => b.bidValue === 'WILLING').length
                            const inAPinch = bids.filter(b => b.bidValue === 'IN_A_PINCH').length
                            const notWilling = bids.filter(b => b.bidValue === 'NOT_WILLING').length
                            bidSummaryMap[p.id] = { eager, willing, inAPinch, notWilling, total: eager + willing + inAPinch + notWilling }
                        } catch {
                            bidSummaryMap[p.id] = { eager: 0, willing: 0, inAPinch: 0, notWilling: 0, total: 0 }
                        }
                    })
                )
                setAllPaperBidSummary(bidSummaryMap)
            } catch { /* ignore */ }
        } catch (err) {
            console.error("Failed to load paper data:", err)
        }
    }, [conferenceId])

    // ── Fetch reviewers for edit-paper view ──
    const fetchReviewers = useCallback(async () => {
        try {
            const usersData = await getConferenceUsersWithRoles(conferenceId, 0, 100)
            const content = (usersData as any)?.content || usersData || []
            const revs: SimpleReviewer[] = content
                .filter((u: any) =>
                    (u.roles || []).some((r: any) => r.assignedRole === "REVIEWER")
                )
                .map((u: any) => {
                    const reviewerRoles = (u.roles || []).filter((r: any) => r.assignedRole === "REVIEWER")
                    const quota = reviewerRoles.length > 0 ? (reviewerRoles[0].reviewerQuota ?? null) : null
                    const trackIds = reviewerRoles.map((r: any) => r.conferenceTrackId).filter(Boolean)
                    return {
                        id: u.user?.id || u.userId || u.id,
                        name: `${u.user?.firstName || ""} ${u.user?.lastName || ""}`.trim() || "Unknown",
                        email: u.user?.email || u.userEmail || "",
                        quota,
                        trackIds,
                    }
                })
            setReviewers(revs)
        } catch (err) {
            console.error("Failed to load reviewers:", err)
        }
    }, [conferenceId])

    useEffect(() => {
        fetchCurrentAssignments()
        fetchPaperData()
        fetchReviewers()
    }, [fetchCurrentAssignments, fetchPaperData, fetchReviewers])

    // ── Derived: reviewer count per paper, assignment count per reviewer ──
    const reviewerCountPerPaper = useMemo(() => {
        const map: Record<number, number> = {}
        ;(currentData?.assignments || []).forEach(a => {
            map[a.paperId] = (map[a.paperId] || 0) + 1
        })
        return map
    }, [currentData])

    const assignmentCountPerReviewer = useMemo(() => {
        const map: Record<number, number> = {}
        ;(currentData?.assignments || []).forEach(a => {
            map[a.reviewerId] = (map[a.reviewerId] || 0) + 1
        })
        return map
    }, [currentData])

    // Track-specific assignment count
    const trackAssignmentCountPerReviewer = useMemo(() => {
        if (!editingPaperId) return {} as Record<number, number>
        const paper = fullPapers.find(p => p.id === editingPaperId)
        if (!paper) return {} as Record<number, number>
        const editTrackId = paper.trackId
        const map: Record<number, number> = {}
        const paperIdsInTrack = new Set(fullPapers.filter(p => p.trackId === editTrackId).map(p => p.id))
        ;(currentData?.assignments || []).forEach(a => {
            if (paperIdsInTrack.has(a.paperId)) {
                map[a.reviewerId] = (map[a.reviewerId] || 0) + 1
            }
        })
        return map
    }, [currentData, editingPaperId, fullPapers])

    // Bid map for current editing paper: reviewerId -> bidValue
    const bidMapForPaper = useMemo(() => {
        const map: Record<number, string> = {}
        paperBids.forEach(b => { map[b.reviewerId] = b.bidValue })
        return map
    }, [paperBids])

    const conflictCountPerPaper = useMemo(() => {
        const map: Record<number, number> = {}
        allConflicts.forEach(c => {
            map[c.paper.id] = (map[c.paper.id] || 0) + 1
        })
        return map
    }, [allConflicts])
    // ── Filtered papers for table ──
    const filteredPapers = useMemo(() => {
        if (!paperSearchQuery.trim()) return fullPapers
        const q = paperSearchQuery.toLowerCase()
        return fullPapers.filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.id.toString().includes(q) ||
            (paperAuthors[p.id] || "").toLowerCase().includes(q) ||
            (subjectAreaMap[p.primarySubjectAreaId] || "").toLowerCase().includes(q)
        )
    }, [fullPapers, paperSearchQuery, paperAuthors, subjectAreaMap])

    useEffect(() => {
        setCurrentPage(0)
    }, [paperSearchQuery])

    const totalPages = Math.ceil(filteredPapers.length / PAGE_SIZE)
    const paginatedPapers = filteredPapers.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

    // ── Edit paper: assignments and reviewers for the selected paper ──
    const editingPaper = useMemo(() => fullPapers.find(p => p.id === editingPaperId), [fullPapers, editingPaperId])

    const editPaperAssignments = useMemo(() => {
        if (!editingPaperId) return []
        return (currentData?.assignments || []).filter(a => a.paperId === editingPaperId)
    }, [currentData, editingPaperId])

    const editPaperConflictUserIds = useMemo(() => {
        if (!editingPaperId) return new Set<number>()
        return new Set(allConflicts.filter(c => c.paper.id === editingPaperId).map(c => c.user.id))
    }, [allConflicts, editingPaperId])

    const assignedReviewerIds = useMemo(() => {
        return new Set(editPaperAssignments.map(a => a.reviewerId))
    }, [editPaperAssignments])

    const filteredReviewersForEdit = useMemo(() => {
        let list = reviewers
        if (reviewerSearchQuery.trim()) {
            const q = reviewerSearchQuery.toLowerCase()
            list = list.filter(r =>
                r.name.toLowerCase().includes(q) ||
                r.email.toLowerCase().includes(q)
            )
        }
        // Sort: assigned first, then conflicts, then others
        return [...list].sort((a, b) => {
            const aAssigned = assignedReviewerIds.has(a.id) ? 0 : 1
            const bAssigned = assignedReviewerIds.has(b.id) ? 0 : 1
            if (aAssigned !== bAssigned) return aAssigned - bAssigned
            const aConflict = editPaperConflictUserIds.has(a.id) ? 1 : 0
            const bConflict = editPaperConflictUserIds.has(b.id) ? 1 : 0
            if (aConflict !== bConflict) return aConflict - bConflict
            return a.name.localeCompare(b.name)
        })
    }, [reviewers, reviewerSearchQuery, assignedReviewerIds, editPaperConflictUserIds])

    // ── Get relevance score for a reviewer on the editing paper ──
    const getRelevanceForReviewer = (reviewerId: number) => {
        const assignment = editPaperAssignments.find(a => a.reviewerId === reviewerId)
        return assignment ? assignment.relevanceScore : null
    }

    // ── Handlers ──
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
            toast.success(`Found ${preview.totalAssignments} new assignments`)
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Error running auto-assign"
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
            toast.success(`Saved ${previewData.assignments.length} assignments!`)
            setViewMode("overview")
            setPreviewData(null)
            fetchCurrentAssignments()
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Error saving assignments"
            toast.error(msg)
        } finally {
            setConfirming(false)
        }
    }

    const handleManualAssignForPaper = async (reviewerId: number) => {
        if (!editingPaperId) return
        try {
            setAssigning(true)
            await manualAssign(conferenceId, editingPaperId, reviewerId)
            toast.success("Reviewer assigned successfully!")
            fetchCurrentAssignments()
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Error assigning reviewer"
            toast.error(msg)
        } finally {
            setAssigning(false)
        }
    }

    // ── Inline assign from expanded row ──
    const handleInlineAssign = async (paperId: number, reviewerId: number) => {
        try {
            setInlineAssigning(reviewerId)
            await manualAssign(conferenceId, paperId, reviewerId)
            toast.success("Reviewer assigned!")
            await fetchCurrentAssignments()
            // Re-expand to refresh
            toggleExpandPaper(paperId, true)
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Error assigning reviewer"
            toast.error(msg)
        } finally {
            setInlineAssigning(null)
        }
    }

    const handleInlineRemove = async (paperId: number, reviewId: number | undefined) => {
        if (!reviewId) { toast.error("Review ID not found"); return }
        if (!confirm("Remove this assignment?")) return
        try {
            await removeAssignment(conferenceId, reviewId)
            toast.success("Assignment removed")
            await fetchCurrentAssignments()
            toggleExpandPaper(paperId, true)
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Error removing assignment"
            toast.error(msg)
        }
    }

    // ── Toggle expand paper row ──
    const toggleExpandPaper = async (paperId: number, forceOpen: boolean = false) => {
        if (expandedPaperId === paperId && !forceOpen) {
            setExpandedPaperId(null)
            return
        }
        setExpandedPaperId(paperId)
        setExpandedLoading(true)
        try {
            // Fetch bids
            const bids = await getBidsByPaper(paperId)
            setExpandedBids(bids || [])
            // Fetch review statuses
            const paperAssignments = (currentData?.assignments || []).filter(a => a.paperId === paperId)
            const statusMap: Record<number, { status: ReviewStatus; reviewId: number }> = {}
            await Promise.all(
                paperAssignments.filter(a => a.reviewId).map(async (a) => {
                    try {
                        const review = await getReviewById(a.reviewId!)
                        statusMap[a.reviewerId] = { status: review.status, reviewId: review.id }
                    } catch { /* ignore */ }
                })
            )
            setExpandedReviewStatus(statusMap)
        } catch { /* ignore */ }
        finally { setExpandedLoading(false) }
    }

    const handleRemoveAssignment = async (reviewId: number | undefined) => {
        if (!reviewId) {
            toast.error("Review ID not found")
            return
        }
        if (!confirm("Remove this assignment?")) return
        try {
            await removeAssignment(conferenceId, reviewId)
            toast.success("Assignment removed")
            fetchCurrentAssignments()
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Error removing assignment"
            toast.error(msg)
        }
    }

    const openEditPaper = async (paperId: number) => {
        setEditingPaperId(paperId)
        setReviewerSearchQuery("")
        setViewMode("edit-paper")
        // Fetch bids for this paper
        try {
            const bids = await getBidsByPaper(paperId)
            setPaperBids(bids || [])
        } catch {
            setPaperBids([])
        }
        // Fetch review statuses for assigned reviewers on this paper
        try {
            const paperAssignments = (currentData?.assignments || []).filter(a => a.paperId === paperId)
            const statusMap: Record<number, { status: ReviewStatus; reviewId: number }> = {}
            await Promise.all(
                paperAssignments
                    .filter(a => a.reviewId)
                    .map(async (a) => {
                        try {
                            const review = await getReviewById(a.reviewId!)
                            statusMap[a.reviewerId] = { status: review.status, reviewId: review.id }
                        } catch { /* ignore */ }
                    })
            )
            setReviewStatusMap(statusMap)
        } catch { /* ignore */ }
    }

    // ── Open paper detail sheet ──
    const openPaperDetail = async (paperId: number) => {
        setDetailPaperId(paperId)
        setDetailLoading(true)
        setDetailReviewers([])
        try {
            const paperAssignments = (currentData?.assignments || []).filter(a => a.paperId === paperId)
            const reviewerInfos: DetailReviewerInfo[] = await Promise.all(
                paperAssignments.map(async (a) => {
                    let status: ReviewStatus | null = null
                    let totalScore: number | null = null
                    if (a.reviewId) {
                        try {
                            const review = await getReviewById(a.reviewId)
                            status = review.status
                            totalScore = review.totalScore ?? null
                        } catch { /* ignore */ }
                    }
                    const reviewer = reviewers.find(r => r.id === a.reviewerId)
                    return {
                        reviewerId: a.reviewerId,
                        reviewerName: reviewer?.name || `Reviewer #${a.reviewerId}`,
                        reviewId: a.reviewId,
                        status,
                        relevanceScore: a.relevanceScore,
                        bidScore: a.bidScore,
                        totalScore,
                    }
                })
            )
            setDetailReviewers(reviewerInfos)
        } catch (err) {
            console.error("Failed to load detail:", err)
        } finally {
            setDetailLoading(false)
        }
    }

    // ── Open bid detail sheet ──
    const openBidSheet = async (paperId: number) => {
        setBidSheetPaperId(paperId)
        setBidSheetLoading(true)
        setBidSheetBids([])
        try {
            const bids = await getBidsByPaper(paperId)
            setBidSheetBids(bids || [])
        } catch {
            setBidSheetBids([])
        } finally {
            setBidSheetLoading(false)
        }
    }

    // ── Open dialog for assigning reviewers to a paper ──
    const openAssignDialog = async (paperId: number) => {
        setDialogPaperId(paperId)
        setDialogReviewerSearch("")
        setDialogLoading(true)
        setDialogBids([])
        setDialogReviewStatus({})
        try {
            const [bids] = await Promise.all([
                getBidsByPaper(paperId),
            ])
            setDialogBids(bids || [])
            // Fetch review statuses for assigned reviewers
            const paperAssignments = (currentData?.assignments || []).filter(a => a.paperId === paperId)
            const statusMap: Record<number, { status: ReviewStatus; reviewId: number }> = {}
            await Promise.all(
                paperAssignments.filter(a => a.reviewId).map(async (a) => {
                    try {
                        const review = await getReviewById(a.reviewId!)
                        statusMap[a.reviewerId] = { status: review.status, reviewId: review.id }
                    } catch { /* ignore */ }
                })
            )
            setDialogReviewStatus(statusMap)
        } catch { /* ignore */ }
        finally { setDialogLoading(false) }
    }

    const handleDialogAssign = async (reviewerId: number) => {
        if (!dialogPaperId) return
        try {
            setDialogAssigning(reviewerId)
            await manualAssign(conferenceId, dialogPaperId, reviewerId)
            toast.success("Reviewer assigned!")
            await fetchCurrentAssignments()
            // Re-fetch bids & statuses for dialog
            openAssignDialog(dialogPaperId)
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Error assigning reviewer"
            toast.error(msg)
        } finally {
            setDialogAssigning(null)
        }
    }

    const handleDialogRemove = async (reviewId: number | undefined) => {
        if (!reviewId || !dialogPaperId) { toast.error("Review ID not found"); return }
        if (!confirm("Remove this assignment?")) return
        try {
            await removeAssignment(conferenceId, reviewId)
            toast.success("Assignment removed")
            await fetchCurrentAssignments()
            openAssignDialog(dialogPaperId)
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Error removing assignment"
            toast.error(msg)
        }
    }

    // ── Dialog computed values ──
    const dialogPaper = fullPapers.find(p => p.id === dialogPaperId)
    const dialogPaperAssignments = useMemo(() => {
        if (!dialogPaperId) return []
        return (currentData?.assignments || []).filter(a => a.paperId === dialogPaperId)
    }, [currentData, dialogPaperId])
    const dialogAssignedIds = useMemo(() => new Set(dialogPaperAssignments.map(a => a.reviewerId)), [dialogPaperAssignments])
    const dialogConflictIds = useMemo(() => {
        if (!dialogPaperId) return new Set<number>()
        return new Set(allConflicts.filter(c => c.paper.id === dialogPaperId).map(c => c.user.id))
    }, [allConflicts, dialogPaperId])

    const dialogBidMap = useMemo(() => {
        const map: Record<number, string> = {}
        dialogBids.forEach(b => { map[b.reviewerId] = b.bidValue })
        return map
    }, [dialogBids])

    const dialogSortedReviewers = useMemo(() => {
        let list = reviewers
        // Filter by track if paper has trackId
        if (dialogPaper?.trackId) {
            list = list.filter(r => r.trackIds.includes(dialogPaper.trackId))
        }
        if (dialogReviewerSearch.trim()) {
            const q = dialogReviewerSearch.toLowerCase()
            list = list.filter(r =>
                r.name.toLowerCase().includes(q) ||
                r.email.toLowerCase().includes(q)
            )
        }
        // Sort: assigned first → then by bid score desc → then workload asc
        const bidOrder: Record<string, number> = { EAGER: 4, WILLING: 3, IN_A_PINCH: 2, NOT_WILLING: 1 }
        return [...list].sort((a, b) => {
            // Assigned first
            const aAss = dialogAssignedIds.has(a.id) ? 0 : 1
            const bAss = dialogAssignedIds.has(b.id) ? 0 : 1
            if (aAss !== bAss) return aAss - bAss
            // Conflicts last
            const aCon = dialogConflictIds.has(a.id) ? 1 : 0
            const bCon = dialogConflictIds.has(b.id) ? 1 : 0
            if (aCon !== bCon) return aCon - bCon
            // Bid score descending
            const aBid = bidOrder[dialogBidMap[a.id]] || 0
            const bBid = bidOrder[dialogBidMap[b.id]] || 0
            if (aBid !== bBid) return bBid - aBid
            // Workload ascending
            const aLoad = assignmentCountPerReviewer[a.id] || 0
            const bLoad = assignmentCountPerReviewer[b.id] || 0
            return aLoad - bLoad
        })
    }, [reviewers, dialogPaper, dialogReviewerSearch, dialogAssignedIds, dialogConflictIds, dialogBidMap, assignmentCountPerReviewer])

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
                    {viewMode === "edit-paper" && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode("overview")}
                            className="mr-1"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <h2 className="text-xl font-bold">
                        {viewMode === "edit-paper"
                            ? "Edit Reviewer Assignments"
                            : "Reviewer Assignment Management"}
                    </h2>
                    <HelpTooltip title="Assignment Guide">
                        <p className="font-semibold mb-2">How to assign reviewers to papers:</p>
                        <ol className="list-decimal ml-4 space-y-1.5">
                            <li><strong>Auto-Assign</strong> — configure weights + constraints → run algorithm → preview → confirm</li>
                            <li><strong>Edit Assignments</strong> — click the edit icon on a paper → assign/remove reviewers</li>
                        </ol>
                        <p className="mt-3 text-amber-700 bg-amber-50 rounded p-2 text-xs">
                            <strong>Note:</strong> The system automatically excludes conflicts (including domain conflicts).
                        </p>
                    </HelpTooltip>
                </div>
                {viewMode !== "edit-paper" && (
                    <div className="flex gap-2">
                        <Button
                            variant={viewMode === "overview" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode("overview")}
                        >
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Overview
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
                )}
            </div>

            {/* Summary cards */}
            {currentData && viewMode !== "edit-paper" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card>
                        <CardContent className="p-4 text-center">
                            <FileText className="h-5 w-5 mx-auto mb-1 text-indigo-500" />
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
                            <p className="text-xs text-muted-foreground">Insufficient Reviewers</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══════════ OVERVIEW: Papers Table ═══════════ */}
            {viewMode === "overview" && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-600" />
                                Submitted Papers
                            </CardTitle>
                            <div className="relative w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="pl-9 h-9 text-sm"
                                    placeholder="Search papers..."
                                    value={paperSearchQuery}
                                    onChange={e => setPaperSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-12">#</th>
                                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[200px]">Title</th>
                                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[150px]">Authors</th>
                                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[120px]">Subject Area</th>
                                        <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-28"># Reviewers</th>
                                        <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-16">
                                            <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Eager</span>
                                        </th>
                                        <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-16">
                                            <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Willing</span>
                                        </th>
                                        <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-16">
                                            <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Pinch</span>
                                        </th>
                                        <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-20">
                                            <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Not willing</span>
                                        </th>
                                        <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-24">Conflicts</th>
                                        {showAggregateColumns && (
                                            <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-24">Avg Score</th>
                                        )}
                                        <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-24">Actions</th>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPapers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={showAggregateColumns ? 12 : 11} className="text-center py-8 text-muted-foreground">
                                                {paperSearchQuery ? "No papers match your search." : "No papers submitted yet."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedPapers.map((paper, idx) => {
                                            const revCount = reviewerCountPerPaper[paper.id] || 0
                                            const conflictCount = conflictCountPerPaper[paper.id] || 0
                                            const saName = subjectAreaMap[paper.primarySubjectAreaId] || "—"
                                            const insufficient = revCount < minReviewers
                                            const isExpanded = expandedPaperId === paper.id
                                            const shortage = minReviewers - revCount

                                            // Data for expanded panel
                                            const paperAssignments = (currentData?.assignments || []).filter(a => a.paperId === paper.id)
                                            const assignedIds = new Set(paperAssignments.map(a => a.reviewerId))
                                            const paperConflictIds = new Set(allConflicts.filter(c => c.paper.id === paper.id).map(c => c.user.id))

                                            // Build bid map for this paper from expandedBids
                                            const bidMap: Record<number, string> = {}
                                            if (isExpanded) {
                                                expandedBids.forEach(b => { bidMap[b.reviewerId] = b.bidValue })
                                            }

                                            // Suggested reviewers (not assigned, no conflict), sorted by relevance
                                            const suggestedReviewers = isExpanded ? reviewers
                                                .filter(r => !assignedIds.has(r.id) && !paperConflictIds.has(r.id))
                                                .map(r => {
                                                    const bid = bidMap[r.id]
                                                    const bidScore = bid === 'EAGER' ? 1 : bid === 'WILLING' ? 0.75 : bid === 'IN_A_PINCH' ? 0.25 : 0
                                                    return { ...r, bid, bidScore }
                                                })
                                                .sort((a, b) => b.bidScore - a.bidScore)
                                                .slice(0, 10) : []

                                            return (
                                                <Fragment key={paper.id}>
                                                    <tr
                                                        className={`transition-colors cursor-pointer ${
                                                            isExpanded ? "bg-indigo-50/40" : "hover:bg-muted/30"
                                                        }`}
                                                        onClick={() => toggleExpandPaper(paper.id)}
                                                    >
                                                        <td className="px-4 py-3 font-mono text-muted-foreground">
                                                            <div className="flex items-center gap-1">
                                                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                                                {currentPage * PAGE_SIZE + idx + 1}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="font-medium line-clamp-2">{paper.title}</p>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="text-muted-foreground text-xs line-clamp-2">
                                                                {paperAuthors[paper.id] || "Loading..."}
                                                            </p>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-xs text-muted-foreground">{saName}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`font-semibold text-sm ${insufficient ? "text-red-600" : "text-emerald-600"}`}>
                                                                {revCount}<span className="text-muted-foreground font-normal">/</span>{minReviewers}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3 text-center">
                                                            {(allPaperBidSummary[paper.id]?.eager || 0) > 0 ? (
                                                                <span className="font-semibold text-xs text-emerald-600">{allPaperBidSummary[paper.id].eager}</span>
                                                            ) : <span className="text-muted-foreground text-xs">0</span>}
                                                        </td>
                                                        <td className="px-3 py-3 text-center">
                                                            {(allPaperBidSummary[paper.id]?.willing || 0) > 0 ? (
                                                                <span className="font-semibold text-xs text-indigo-600">{allPaperBidSummary[paper.id].willing}</span>
                                                            ) : <span className="text-muted-foreground text-xs">0</span>}
                                                        </td>
                                                        <td className="px-3 py-3 text-center">
                                                            {(allPaperBidSummary[paper.id]?.inAPinch || 0) > 0 ? (
                                                                <span className="font-semibold text-xs text-amber-600">{allPaperBidSummary[paper.id].inAPinch}</span>
                                                            ) : <span className="text-muted-foreground text-xs">0</span>}
                                                        </td>
                                                        <td className="px-3 py-3 text-center">
                                                            {(allPaperBidSummary[paper.id]?.notWilling || 0) > 0 ? (
                                                                <span className="font-semibold text-xs text-red-600">{allPaperBidSummary[paper.id].notWilling}</span>
                                                            ) : <span className="text-muted-foreground text-xs">0</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {conflictCount > 0 ? (
                                                                <span className="font-semibold text-xs text-amber-600">{conflictCount}</span>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">0</span>
                                                            )}
                                                        </td>
                                                        {showAggregateColumns && (
                                                            <td className="px-4 py-3 text-center">
                                                                {(() => {
                                                                    const agg = aggregateMap[paper.id]
                                                                    if (!agg || agg.completedReviewCount === 0) {
                                                                        return <span className="text-muted-foreground text-xs">—</span>
                                                                    }
                                                                    const score = agg.averageTotalScore
                                                                    const color = score >= 3.5 ? "text-emerald-600" : score >= 2 ? "text-indigo-600" : "text-red-600"
                                                                    return (
                                                                        <span className={`font-mono text-xs font-semibold ${color}`}>
                                                                            {score.toFixed(2)}
                                                                        </span>
                                                                    )
                                                                })()}
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    className="h-7 text-xs gap-1"
                                                                    onClick={() => openAssignDialog(paper.id)}
                                                                >
                                                                    <UserPlus className="h-3 w-3" />
                                                                    Manage
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 w-7 p-0"
                                                                    onClick={() => openBidSheet(paper.id)}
                                                                    title="View Bids"
                                                                >
                                                                    <Gavel className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* ── Expanded Inline Panel ── */}
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={showAggregateColumns ? 12 : 11} className="p-0">
                                                                <div className="bg-indigo-50/30 border-t border-b border-indigo-200 px-6 py-4">
                                                                    {expandedLoading ? (
                                                                        <div className="flex items-center justify-center py-6">
                                                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-4">
                                                                            {/* Shortfall banner */}
                                                                            {insufficient ? (
                                                                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                                                                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                                                                    <span>Needs <strong>{shortage}</strong> more reviewer(s) ({revCount}/{minReviewers})</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                                                                                    <Check className="h-4 w-4 shrink-0" />
                                                                                    <span>Fully assigned ({revCount}/{minReviewers})</span>
                                                                                </div>
                                                                            )}

                                                                            {/* Assigned reviewers */}
                                                                            {paperAssignments.length > 0 && (
                                                                                <div>
                                                                                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                                                                        <Check className="h-3 w-3" /> Assigned ({paperAssignments.length})
                                                                                    </p>
                                                                                    <div className="space-y-1.5">
                                                                                        {paperAssignments.map(a => {
                                                                                            const rev = reviewers.find(r => r.id === a.reviewerId)
                                                                                            const revStatus = expandedReviewStatus[a.reviewerId]
                                                                                            const statusLabels: Record<string, string> = { ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress', COMPLETED: 'Reviewed', DECLINED: 'Declined' }
                                                                                            const statusColors: Record<string, string> = { ASSIGNED: 'text-gray-600', IN_PROGRESS: 'text-amber-600', COMPLETED: 'text-emerald-600', DECLINED: 'text-red-600' }
                                                                                            const st = revStatus?.status || 'ASSIGNED'
                                                                                            return (
                                                                                                <div key={a.reviewerId} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border text-sm">
                                                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                                                        <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[10px] font-bold text-emerald-700 shrink-0">
                                                                                                            {rev?.name?.charAt(0)?.toUpperCase() || '?'}
                                                                                                        </div>
                                                                                                        <span className="font-medium truncate"><UserLink userId={a.reviewerId} name={rev?.name || `Reviewer #${a.reviewerId}`} className="font-medium text-sm" /></span>
                                                                                                        <span className={`text-xs ${statusColors[st]}`}>• {statusLabels[st] || st}</span>
                                                                                                        <span className="text-xs text-muted-foreground">Relevance: {(a.relevanceScore * 100).toFixed(0)}%</span>
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                                                        <Button
                                                                                                            variant="ghost" size="sm"
                                                                                                            className="h-6 w-6 p-0 text-indigo-500 hover:text-indigo-700"
                                                                                                            onClick={() => setReviewerInfoId(a.reviewerId)}
                                                                                                            title="View reviewer profile"
                                                                                                        >
                                                                                                            <Eye className="h-3.5 w-3.5" />
                                                                                                        </Button>
                                                                                                        {revStatus?.reviewId && (
                                                                                                            <Button
                                                                                                                variant="ghost" size="sm"
                                                                                                                className="h-6 w-6 p-0 text-indigo-500 hover:text-indigo-700"
                                                                                                                onClick={() => setViewingReviewId(revStatus.reviewId)}
                                                                                                                title="View review"
                                                                                                            >
                                                                                                                <FileText className="h-3.5 w-3.5" />
                                                                                                            </Button>
                                                                                                        )}
                                                                                                        <Button
                                                                                                            variant="ghost" size="sm"
                                                                                                            className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                                                                                                            onClick={() => handleInlineRemove(paper.id, a.reviewId)}
                                                                                                            title="Remove assignment"
                                                                                                        >
                                                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                                                        </Button>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Suggested reviewers */}
                                                                            <div>
                                                                                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                                                                    <UserPlus className="h-3 w-3" /> Suggested Reviewers
                                                                                </p>
                                                                                {suggestedReviewers.length === 0 ? (
                                                                                    <p className="text-xs text-muted-foreground px-3 py-2">No suitable reviewers found.</p>
                                                                                ) : (
                                                                                    <div className="space-y-1.5">
                                                                                        {suggestedReviewers.map(r => {
                                                                                            const bidLabels: Record<string, { label: string; color: string }> = {
                                                                                                EAGER: { label: 'Eager', color: 'text-emerald-600' },
                                                                                                WILLING: { label: 'Willing', color: 'text-indigo-600' },
                                                                                                IN_A_PINCH: { label: 'In a pinch', color: 'text-amber-600' },
                                                                                                NOT_WILLING: { label: 'Not willing', color: 'text-red-600' },
                                                                                            }
                                                                                            const bidInfo = r.bid ? bidLabels[r.bid] : null
                                                                                            const totalAssign = assignmentCountPerReviewer[r.id] || 0
                                                                                            return (
                                                                                                <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border text-sm hover:border-indigo-300 transition-colors">
                                                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                                                        <div className="w-6 h-6 rounded-full bg-gray-100 border flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                                                                                                            {r.name?.charAt(0)?.toUpperCase() || '?'}
                                                                                                        </div>
                                                                                                        <span className="font-medium truncate"><UserLink userId={r.id} name={r.name} className="font-medium text-sm" /></span>
                                                                                                        {bidInfo && (
                                                                                                            <span className={`text-xs font-medium ${bidInfo.color}`}>• {bidInfo.label}</span>
                                                                                                        )}
                                                                                                        <span className="text-xs text-muted-foreground">Workload: {totalAssign}</span>
                                                                                                        {r.quota !== null && (
                                                                                                            <span className="text-xs text-muted-foreground">Quota: {r.quota}</span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                                                        <Button
                                                                                                            variant="ghost" size="sm"
                                                                                                            className="h-6 w-6 p-0 text-indigo-500 hover:text-indigo-700"
                                                                                                            onClick={() => setReviewerInfoId(r.id)}
                                                                                                            title="View profile"
                                                                                                        >
                                                                                                            <Eye className="h-3.5 w-3.5" />
                                                                                                        </Button>
                                                                                                        <Button
                                                                                                            size="sm"
                                                                                                            className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                                                            onClick={() => handleInlineAssign(paper.id, r.id)}
                                                                                                            disabled={inlineAssigning === r.id}
                                                                                                        >
                                                                                                            {inlineAssigning === r.id ? (
                                                                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                                                                            ) : (
                                                                                                                <Plus className="h-3 w-3" />
                                                                                                            )}
                                                                                                            Assign
                                                                                                        </Button>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )
                                                                                        })}
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {/* Link to full edit view */}
                                                                            <div className="pt-2 border-t">
                                                                                <Button
                                                                                    variant="outline" size="sm"
                                                                                    className="text-xs gap-1"
                                                                                    onClick={() => openEditPaper(paper.id)}
                                                                                >
                                                                                    <Edit className="h-3 w-3" />
                                                                                    View All Reviewers (Full View)
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                                <div className="text-sm text-muted-foreground">
                                    Page {currentPage + 1} of {totalPages} · {filteredPapers.length} papers
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
                    </CardContent>
                </Card>
            )}

            {/* ═══════════ EDIT PAPER: Reviewer Table ═══════════ */}
            {viewMode === "edit-paper" && editingPaper && (
                <div className="space-y-4">
                    {/* Paper info banner */}
                    <Card className="border-indigo-200 bg-indigo-50/30">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <FileText className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-sm">
                                        Paper #{editingPaper.id}: {editingPaper.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Authors: {paperAuthors[editingPaper.id] || "—"} •
                                        Subject Area: {subjectAreaMap[editingPaper.primarySubjectAreaId] || "—"} •
                                        Assigned: {editPaperAssignments.length} reviewer(s)
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reviewer table */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Users className="h-5 w-5 text-green-600" />
                                    Available Reviewers ({reviewers.length})
                                </CardTitle>
                                <div className="relative w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        className="pl-10 h-9"
                                        placeholder="Search reviewers..."
                                        value={reviewerSearchQuery}
                                        onChange={e => setReviewerSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40">
                                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[140px]">Reviewer</th>
                                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[160px]">Email</th>
                                            <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-20">Bid</th>
                                            <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-20">Quota</th>
                                            <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-24 text-xs">Assign. (Track)</th>
                                            <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-24 text-xs">Assign. (All)</th>
                                            <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-24">Relevance</th>
                                            <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-20">Status</th>
                                            <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-20">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredReviewersForEdit.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="text-center py-8 text-muted-foreground">
                                                    No reviewers found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredReviewersForEdit.map((reviewer) => {
                                                const isAssigned = assignedReviewerIds.has(reviewer.id)
                                                const isConflict = editPaperConflictUserIds.has(reviewer.id)
                                                const totalAssignments = assignmentCountPerReviewer[reviewer.id] || 0
                                                const relevance = getRelevanceForReviewer(reviewer.id)
                                                const assignmentForPaper = editPaperAssignments.find(a => a.reviewerId === reviewer.id)

                                                return (
                                                    <tr
                                                        key={reviewer.id}
                                                        className={`transition-colors ${
                                                            isConflict
                                                                ? "bg-red-50/50 hover:bg-red-50"
                                                                : isAssigned
                                                                    ? "bg-emerald-50/50 hover:bg-emerald-50"
                                                                    : "hover:bg-muted/30"
                                                        }`}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium"><UserLink userId={reviewer.id} name={reviewer.name} className="font-medium text-sm" /></span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                                    onClick={() => setReviewerInfoId(reviewer.id)}
                                                                    title="View reviewer info"
                                                                >
                                                                    <User2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                                {isConflict && (
                                                                    <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                                                                        Conflict
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-muted-foreground text-xs">{reviewer.email}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {(() => {
                                                                const bid = bidMapForPaper[reviewer.id]
                                                                if (!bid) return <span className="text-muted-foreground text-xs">—</span>
                                                                const colors: Record<string, string> = {
                                                                    EAGER: "bg-emerald-100 text-emerald-700 border-emerald-300",
                                                                    WILLING: "bg-indigo-100 text-indigo-700 border-indigo-300",
                                                                    IN_A_PINCH: "bg-amber-100 text-amber-700 border-amber-300",
                                                                    NOT_WILLING: "bg-red-100 text-red-700 border-red-300",
                                                                }
                                                                const labels: Record<string, string> = {
                                                                    EAGER: "Eager",
                                                                    WILLING: "Willing",
                                                                    IN_A_PINCH: "In a pinch",
                                                                    NOT_WILLING: "Not willing",
                                                                }
                                                                return (
                                                                    <Badge className={`text-[10px] ${colors[bid] || ""}`}>
                                                                        {labels[bid] || bid}
                                                                    </Badge>
                                                                )
                                                            })()}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="text-xs font-mono">
                                                                {reviewer.quota !== null ? reviewer.quota : "—"}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3 text-center">
                                                            <Badge variant="outline" className="text-xs">
                                                                {trackAssignmentCountPerReviewer[reviewer.id] || 0}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-3 py-3 text-center">
                                                            <Badge variant="outline" className="text-xs">
                                                                {totalAssignments}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {relevance !== null ? (
                                                                <span className={`font-mono text-xs font-semibold ${
                                                                    relevance >= 0.7 ? "text-emerald-600" :
                                                                    relevance >= 0.4 ? "text-indigo-600" : "text-gray-500"
                                                                }`}>
                                                                    {(relevance * 100).toFixed(0)}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {isAssigned ? (
                                                                (() => {
                                                                    const reviewInfo = reviewStatusMap[reviewer.id]
                                                                    const status = reviewInfo?.status || 'ASSIGNED'
                                                                    const statusLabels: Record<string, string> = {
                                                                        ASSIGNED: 'Assigned',
                                                                        IN_PROGRESS: 'In Progress',
                                                                        COMPLETED: 'Reviewed',
                                                                        DECLINED: 'Declined',
                                                                    }
                                                                    const statusColors: Record<string, string> = {
                                                                        ASSIGNED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
                                                                        IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-300',
                                                                        COMPLETED: 'bg-indigo-100 text-indigo-700 border-indigo-300',
                                                                        DECLINED: 'bg-red-100 text-red-700 border-red-300',
                                                                    }
                                                                    return (
                                                                        <Badge className={`text-xs ${statusColors[status] || 'bg-gray-100 text-gray-700'} hover:${statusColors[status]?.split(' ')[0]}`}>
                                                                            {statusLabels[status] || status}
                                                                        </Badge>
                                                                    )
                                                                })()
                                                            ) : isConflict ? (
                                                                <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                                                    Blocked
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                            {isAssigned ? (
                                                                <>
                                                                    {reviewStatusMap[reviewer.id] && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-8 w-8 p-0 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                                                                            onClick={() => setViewingReviewId(reviewStatusMap[reviewer.id].reviewId)}
                                                                            title="View review details"
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                        onClick={() => handleRemoveAssignment(assignmentForPaper?.reviewId)}
                                                                        title="Remove assignment"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            ) : isConflict ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                    disabled
                                                                    title="Cannot assign — conflict exists"
                                                                >
                                                                    <X className="h-4 w-4 text-gray-300" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-green-500 hover:text-green-700 hover:bg-green-50"
                                                                    onClick={() => handleManualAssignForPaper(reviewer.id)}
                                                                    disabled={assigning}
                                                                    title="Assign reviewer"
                                                                >
                                                                    {assigning ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Plus className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══════════ AUTO-ASSIGN CONFIG ═══════════ */}
            {viewMode === "auto-assign" && (
                <AutoAssignPanel
                    minReviewers={minReviewers}
                    maxPapers={maxPapers}
                    bidWeight={bidWeight}
                    relevanceWeight={relevanceWeight}
                    loadBalancing={loadBalancing}
                    running={running}
                    onMinReviewersChange={setMinReviewers}
                    onMaxPapersChange={setMaxPapers}
                    onBidWeightChange={handleBidWeightChange}
                    onLoadBalancingChange={setLoadBalancing}
                    onRunAutoAssign={handleRunAutoAssign}
                />
            )}

            {/* ═══════════ PREVIEW PANEL ═══════════ */}
            {viewMode === "preview" && previewData && (
                <AssignmentPreviewPanel
                    previewData={previewData}
                    confirming={confirming}
                    onConfirm={handleConfirm}
                    onCancel={() => { setViewMode("auto-assign"); setPreviewData(null) }}
                />
            )}
            {/* ── Paper Detail Sheet ── */}
            <Sheet open={detailPaperId !== null} onOpenChange={v => !v && setDetailPaperId(null)}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-white z-10">
                        <SheetTitle className="text-lg">
                            #{detailPaperId} — Assignment Details
                        </SheetTitle>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {fullPapers.find(p => p.id === detailPaperId)?.title}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="text-muted-foreground">
                                Authors: <strong>{detailPaperId ? (paperAuthors[detailPaperId] || "—") : "—"}</strong>
                            </span>
                        </div>
                    </SheetHeader>

                    <div className="p-6 space-y-4">
                        {detailLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : detailReviewers.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                <p className="text-sm">No reviewers assigned to this paper yet.</p>
                            </div>
                        ) : (
                            <>
                                {/* Summary */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="rounded-lg border p-3 text-center">
                                        <p className="text-lg font-bold">{detailReviewers.length}</p>
                                        <p className="text-[10px] text-muted-foreground">Total Assigned</p>
                                    </div>
                                    <div className="rounded-lg border p-3 text-center bg-indigo-50 border-indigo-200">
                                        <p className="text-lg font-bold text-indigo-600">
                                            {detailReviewers.filter(r => r.status === 'COMPLETED').length}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">Completed</p>
                                    </div>
                                    <div className="rounded-lg border p-3 text-center bg-amber-50 border-amber-200">
                                        <p className="text-lg font-bold text-amber-600">
                                            {detailReviewers.filter(r => r.status !== 'COMPLETED').length}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">Pending</p>
                                    </div>
                                </div>

                                {/* Reviewer list */}
                                <div className="space-y-2">
                                    {detailReviewers.map((r, i) => {
                                        const statusLabels: Record<string, string> = {
                                            ASSIGNED: 'Assigned',
                                            IN_PROGRESS: 'In Progress',
                                            COMPLETED: 'Completed',
                                            DECLINED: 'Declined',
                                        }
                                        const statusColors: Record<string, string> = {
                                            ASSIGNED: 'bg-gray-100 text-gray-700 border-gray-300',
                                            IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-300',
                                            COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
                                            DECLINED: 'bg-red-100 text-red-700 border-red-300',
                                        }
                                        const status = r.status || 'ASSIGNED'

                                        return (
                                            <div
                                                key={r.reviewerId}
                                                className="rounded-lg border p-3 bg-white hover:shadow-sm transition-shadow"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}.</span>
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 border flex items-center justify-center text-xs font-bold text-gray-600">
                                                            {r.reviewerName?.charAt(0)?.toUpperCase() || "?"}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium"><UserLink userId={r.reviewerId} name={r.reviewerName || `Reviewer #${r.reviewerId}`} className="text-sm font-medium" /></p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <Badge className={`text-[10px] ${statusColors[status]}`}>
                                                                    {statusLabels[status] || status}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {r.totalScore !== null && (
                                                            <span className={`text-sm font-mono font-semibold ${
                                                                r.totalScore >= 3.5 ? 'text-emerald-600' :
                                                                r.totalScore >= 2 ? 'text-indigo-600' : 'text-red-600'
                                                            }`}>
                                                                {r.totalScore.toFixed(1)}
                                                            </span>
                                                        )}
                                                        {r.reviewId && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0 text-indigo-500 hover:text-indigo-700"
                                                                onClick={() => setViewingReviewId(r.reviewId!)}
                                                                title="View review"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Scores */}
                                                <div className="flex items-center gap-3 mt-2 ml-11">
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Relevance: <strong>{(r.relevanceScore * 100).toFixed(0)}%</strong>
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Bid: <strong>{(r.bidScore * 100).toFixed(0)}%</strong>
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Review Detail Dialog for Chair */}
            <ReviewDetailDialog
                reviewId={viewingReviewId}
                open={viewingReviewId !== null}
                onClose={() => setViewingReviewId(null)}
            />

            {/* ── Bid Detail Sheet ── */}
            <Sheet open={bidSheetPaperId !== null} onOpenChange={v => !v && setBidSheetPaperId(null)}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-white z-10">
                        <SheetTitle className="text-lg flex items-center gap-2">
                            <Gavel className="h-5 w-5 text-indigo-600" />
                            Bid Details — Paper #{bidSheetPaperId}
                        </SheetTitle>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {fullPapers.find(p => p.id === bidSheetPaperId)?.title}
                        </p>
                    </SheetHeader>
                    <div className="p-6 space-y-4">
                        {bidSheetLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : bidSheetBids.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Gavel className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                <p className="text-sm">No bids submitted for this paper yet.</p>
                            </div>
                        ) : (
                            <>
                                {/* Summary */}
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { label: 'Eager', value: bidSheetBids.filter(b => b.bidValue === 'EAGER').length, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                                        { label: 'Willing', value: bidSheetBids.filter(b => b.bidValue === 'WILLING').length, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                                        { label: 'In a pinch', value: bidSheetBids.filter(b => b.bidValue === 'IN_A_PINCH').length, color: 'bg-amber-50 border-amber-200 text-amber-700' },
                                        { label: 'Not willing', value: bidSheetBids.filter(b => b.bidValue === 'NOT_WILLING').length, color: 'bg-red-50 border-red-200 text-red-700' },
                                    ].map(item => (
                                        <div key={item.label} className={`rounded-lg border p-3 text-center ${item.color}`}>
                                            <p className="text-lg font-bold">{item.value}</p>
                                            <p className="text-[10px]">{item.label}</p>
                                        </div>
                                    ))}
                                </div>
                                {/* Bid list grouped by type */}
                                {(['EAGER', 'WILLING', 'IN_A_PINCH', 'NOT_WILLING'] as const).map(bidType => {
                                    const bidsOfType = bidSheetBids.filter(b => b.bidValue === bidType)
                                    if (bidsOfType.length === 0) return null
                                    const config: Record<string, { label: string; dot: string }> = {
                                        EAGER: { label: 'Eager', dot: 'bg-emerald-500' },
                                        WILLING: { label: 'Willing', dot: 'bg-indigo-500' },
                                        IN_A_PINCH: { label: 'In a pinch', dot: 'bg-amber-500' },
                                        NOT_WILLING: { label: 'Not willing', dot: 'bg-red-500' },
                                    }
                                    return (
                                        <div key={bidType} className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2.5 h-2.5 rounded-full ${config[bidType].dot}`} />
                                                <span className="text-sm font-semibold">{config[bidType].label} ({bidsOfType.length})</span>
                                            </div>
                                            <div className="space-y-1">
                                                {bidsOfType.map(b => (
                                                    <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-white text-sm">
                                                        <span className="font-medium"><UserLink userId={b.reviewerId} name={b.reviewerName || `Reviewer #${b.reviewerId}`} className="font-medium text-sm" /></span>
                                                        <span className="text-xs text-muted-foreground">ID: {b.reviewerId}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* ── Reviewer Info Sheet ── */}
            <ReviewerInfoSheet
                reviewerInfoId={reviewerInfoId}
                reviewerProfile={reviewerProfile}
                reviewerProfileLoading={reviewerProfileLoading}
                reviewers={reviewers}
                assignmentCountPerReviewer={assignmentCountPerReviewer}
                currentAssignments={currentData?.assignments || []}
                fullPapers={fullPapers}
                editingPaperId={editingPaperId}
                bidMapForPaper={bidMapForPaper}
                onClose={() => { setReviewerInfoId(null); setReviewerProfile(null) }}
            />

            {/* ═══════════ ASSIGN REVIEWERS DIALOG ═══════════ */}
            <AssignReviewersDialog
                dialogPaperId={dialogPaperId}
                dialogPaper={dialogPaper}
                dialogSortedReviewers={dialogSortedReviewers}
                dialogPaperAssignments={dialogPaperAssignments}
                dialogAssignedIds={dialogAssignedIds}
                dialogConflictIds={dialogConflictIds}
                dialogBidMap={dialogBidMap}
                dialogReviewStatus={dialogReviewStatus}
                dialogLoading={dialogLoading}
                dialogReviewerSearch={dialogReviewerSearch}
                dialogAssigning={dialogAssigning}
                assignmentCountPerReviewer={assignmentCountPerReviewer}
                paperAuthors={paperAuthors}
                subjectAreaMap={subjectAreaMap}
                minReviewers={minReviewers}
                onDialogReviewerSearchChange={setDialogReviewerSearch}
                onDialogAssign={handleDialogAssign}
                onDialogRemove={handleDialogRemove}
                onClose={() => setDialogPaperId(null)}
            />
        </div>
    )
}
