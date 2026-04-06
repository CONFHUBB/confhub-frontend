"use client"
import { useEffect, useState, useMemo, useCallback } from "react"
import {
    runAutoAssign,
    confirmAssignments,
    getCurrentAssignments,
    manualAssign,
    removeAssignment,
    type AssignmentPreview,

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
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"


import { HelpTooltip } from "@/components/help-tooltip"
import {
    Loader2, Users, FileText, Check, AlertTriangle,
    BarChart3, Settings2, ArrowLeft,
} from "lucide-react"
import { toast } from 'sonner'
import { ReviewDetailDialog } from "./review-detail-dialog"
import { AutoAssignPanel } from "./_components/auto-assign-panel"
import { AssignmentPreviewPanel } from "./_components/assignment-preview-panel"
import { ReviewerInfoSheet } from "./_components/reviewer-info-sheet"
import { AssignReviewersDialog } from "./_components/assign-reviewers-dialog"
import { AssignmentOverviewTable } from "./_components/assignment-overview-table"
import { EditPaperView } from "./_components/edit-paper-view"
import { AssignmentDetailSheet, type DetailReviewerInfo } from "./_components/assignment-detail-sheet"
import { BidDetailSheet } from "./_components/bid-detail-sheet"

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

    // ── Paper-centric data ──
    const [fullPapers, setFullPapers] = useState<PaperResponse[]>([])
    const [paperAuthors, setPaperAuthors] = useState<Record<number, string>>({})
    const [allConflicts, setAllConflicts] = useState<PaperConflictResponse[]>([])
    const [subjectAreaMap, setSubjectAreaMap] = useState<Record<number, string>>({})
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
    const [inlineAssigning, setInlineAssigning] = useState<number | null>(null)

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

    // ── Paper detail sheet ──
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
                <AssignmentOverviewTable
                    papers={fullPapers}
                    paperAuthors={paperAuthors}
                    subjectAreaMap={subjectAreaMap}
                    allPaperBidSummary={allPaperBidSummary}
                    currentAssignments={currentData?.assignments || []}
                    reviewerCountPerPaper={reviewerCountPerPaper}
                    conflictCountPerPaper={conflictCountPerPaper}
                    showAggregateColumns={showAggregateColumns}
                    aggregateMap={aggregateMap}
                    minReviewers={minReviewers}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={PAGE_SIZE}
                    filteredPapersCount={filteredPapers.length}
                    paginatedPapers={paginatedPapers}
                    expandedPaperId={expandedPaperId}
                    expandedBids={expandedBids}
                    expandedReviewStatus={expandedReviewStatus}
                    expandedLoading={expandedLoading}
                    inlineAssigning={inlineAssigning}
                    reviewers={reviewers}
                    allConflicts={allConflicts}
                    assignmentCountPerReviewer={assignmentCountPerReviewer}
                    paperSearchQuery={paperSearchQuery}
                    onToggleExpand={paperId => toggleExpandPaper(paperId)}
                    onInlineAssign={handleInlineAssign}
                    onInlineRemove={handleInlineRemove}
                    onOpenAssignDialog={openAssignDialog}
                    onOpenBidSheet={openBidSheet}
                    onOpenEditPaper={openEditPaper}
                    onSearchChange={setPaperSearchQuery}
                    onPageChange={setCurrentPage}
                    onViewReviewerInfo={setReviewerInfoId}
                    onViewReview={setViewingReviewId}
                />
            )}

            {/* ═══════════ EDIT PAPER: Reviewer Table ═══════════ */}
            {viewMode === "edit-paper" && editingPaper && (
                <EditPaperView
                    editingPaper={editingPaper}
                    paperAuthors={paperAuthors}
                    subjectAreaMap={subjectAreaMap}
                    editPaperAssignments={editPaperAssignments}
                    assignedReviewerIds={assignedReviewerIds}
                    editPaperConflictUserIds={editPaperConflictUserIds}
                    filteredReviewersForEdit={filteredReviewersForEdit}
                    bidMapForPaper={bidMapForPaper}
                    trackAssignmentCountPerReviewer={trackAssignmentCountPerReviewer}
                    assignmentCountPerReviewer={assignmentCountPerReviewer}
                    reviewStatusMap={reviewStatusMap}
                    assigning={assigning}
                    reviewerSearchQuery={reviewerSearchQuery}
                    onAssign={handleManualAssignForPaper}
                    onRemove={handleRemoveAssignment}
                    onSearchChange={setReviewerSearchQuery}
                    onViewReviewerInfo={setReviewerInfoId}
                    onViewReview={reviewId => setViewingReviewId(reviewId)}
                    getRelevanceForReviewer={getRelevanceForReviewer}
                />
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
            <AssignmentDetailSheet
                paperId={detailPaperId}
                paperTitle={fullPapers.find(p => p.id === detailPaperId)?.title}
                paperAuthors={detailPaperId ? (paperAuthors[detailPaperId] || "—") : "—"}
                detailReviewers={detailReviewers}
                loading={detailLoading}
                onClose={() => setDetailPaperId(null)}
                onViewReview={reviewId => setViewingReviewId(reviewId)}
            />

            {/* Review Detail Dialog for Chair */}
            <ReviewDetailDialog
                reviewId={viewingReviewId}
                open={viewingReviewId !== null}
                onClose={() => setViewingReviewId(null)}
            />

            {/* ── Bid Detail Sheet ── */}
            <BidDetailSheet
                paperId={bidSheetPaperId}
                paperTitle={fullPapers.find(p => p.id === bidSheetPaperId)?.title}
                bids={bidSheetBids}
                loading={bidSheetLoading}
                onClose={() => setBidSheetPaperId(null)}
            />

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
