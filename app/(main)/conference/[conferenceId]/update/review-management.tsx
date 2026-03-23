"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { Settings2, Gavel as GavelIcon, Users, Shield, Loader2, FileText, Search, Bell, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

// Sub-tab components
import { ReviewSettings } from "./review-settings"
import { ReviewerAssignment } from "./reviewer-assignment"
import { ConflictManagement } from "./conflict-management"
import { AuthorNotificationWizard } from "./author-notification-wizard"

// Bidding APIs
import { getBidsByPaper } from "@/app/api/bidding.api"
import { getPapersByConference } from "@/app/api/paper.api"
import type { PaperResponse } from "@/types/paper"
import type { BiddingResponse, BidValue } from "@/types/bidding"

interface ReviewManagementProps {
    conferenceId: number
}

type SubTab = "review-settings" | "bidding" | "reviewer-assignment" | "conflict-settings" | "aggregates"

const SUB_TABS: { key: SubTab; label: string; icon: React.ReactNode }[] = [
    { key: "review-settings", label: "Review Settings", icon: <Settings2 className="h-4 w-4" /> },
    { key: "bidding", label: "Bidding Overview", icon: <GavelIcon className="h-4 w-4" /> },
    { key: "reviewer-assignment", label: "Reviewer Assignment", icon: <Users className="h-4 w-4" /> },
    { key: "conflict-settings", label: "Conflict Settings", icon: <Shield className="h-4 w-4" /> },
    { key: "aggregates", label: "Aggregates & Notification", icon: <Bell className="h-4 w-4" /> },
]

export function ReviewManagement({ conferenceId }: ReviewManagementProps) {
    const [activeTab, setActiveTab] = useState<SubTab>("review-settings")

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold mb-1">Review Management</h2>
                <p className="text-sm text-muted-foreground">
                    Configure review settings, manage bidding, assign reviewers, and handle conflicts.
                </p>
            </div>

            {/* Horizontal sub-tabs */}
            <div className="flex gap-1 border-b pb-0">
                {SUB_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === tab.key
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === "review-settings" && (
                    <ReviewSettings conferenceId={conferenceId} />
                )}
                {activeTab === "bidding" && (
                    <BiddingOverview conferenceId={conferenceId} />
                )}
                {activeTab === "reviewer-assignment" && (
                    <ReviewerAssignment conferenceId={conferenceId} />
                )}
                {activeTab === "conflict-settings" && (
                    <ConflictManagement conferenceId={conferenceId} />
                )}
                {activeTab === "aggregates" && (
                    <AuthorNotificationWizard conferenceId={conferenceId} />
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════
// Bidding Overview (Chair view)
// ═══════════════════════════════════════════════

const BID_CONFIG: Record<BidValue, { label: string; color: string; dotColor: string; bgSection: string }> = {
    EAGER: { label: "Eager", color: "bg-emerald-100 text-emerald-700 border-emerald-200", dotColor: "bg-emerald-500", bgSection: "bg-emerald-50 border-emerald-200" },
    WILLING: { label: "Willing", color: "bg-blue-100 text-blue-700 border-blue-200", dotColor: "bg-blue-500", bgSection: "bg-blue-50 border-blue-200" },
    IN_A_PINCH: { label: "In a pinch", color: "bg-amber-100 text-amber-700 border-amber-200", dotColor: "bg-amber-500", bgSection: "bg-amber-50 border-amber-200" },
    NOT_WILLING: { label: "Not willing", color: "bg-red-100 text-red-700 border-red-200", dotColor: "bg-red-500", bgSection: "bg-red-50 border-red-200" },
}

const BID_ORDER: BidValue[] = ["EAGER", "WILLING", "IN_A_PINCH", "NOT_WILLING"]

interface PaperBidSummary {
    paperId: number
    paperTitle: string
    trackName: string
    bids: BiddingResponse[]
    eager: number
    willing: number
    inAPinch: number
    notWilling: number
    total: number
}

type BidFilter = "all" | "has-bids" | "no-bids"

function BiddingOverview({ conferenceId }: { conferenceId: number }) {
    const [paperBids, setPaperBids] = useState<PaperBidSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filterBid, setFilterBid] = useState<BidFilter>("all")
    const [sheetPaper, setSheetPaper] = useState<PaperBidSummary | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const papersData = await getPapersByConference(conferenceId)

            const summaries: PaperBidSummary[] = await Promise.all(
                (papersData || []).map(async (p) => {
                    try {
                        const bids = await getBidsByPaper(p.id)
                        const bidList = bids || []
                        return {
                            paperId: p.id,
                            paperTitle: p.title,
                            trackName: p.track?.name || p.trackName || "—",
                            bids: bidList,
                            eager: bidList.filter(b => b.bidValue === "EAGER").length,
                            willing: bidList.filter(b => b.bidValue === "WILLING").length,
                            inAPinch: bidList.filter(b => b.bidValue === "IN_A_PINCH").length,
                            notWilling: bidList.filter(b => b.bidValue === "NOT_WILLING").length,
                            total: bidList.length,
                        }
                    } catch {
                        return {
                            paperId: p.id, paperTitle: p.title,
                            trackName: p.track?.name || p.trackName || "—",
                            bids: [], eager: 0, willing: 0, inAPinch: 0, notWilling: 0, total: 0,
                        }
                    }
                })
            )
            setPaperBids(summaries)
        } catch (err) {
            console.error("Failed to load bidding data:", err)
        } finally {
            setLoading(false)
        }
    }, [conferenceId])

    useEffect(() => { fetchData() }, [fetchData])

    // Filter + search
    const filtered = paperBids.filter(p => {
        if (filterBid === "has-bids" && p.total === 0) return false
        if (filterBid === "no-bids" && p.total > 0) return false
        if (search.trim()) {
            const q = search.toLowerCase()
            return p.paperTitle.toLowerCase().includes(q) || p.paperId.toString().includes(q)
        }
        return true
    })

    // Summary stats
    const totalBids = paperBids.reduce((s, p) => s + p.total, 0)
    const papersWithBids = paperBids.filter(p => p.total > 0).length
    const papersWithoutBids = paperBids.filter(p => p.total === 0).length

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                    onClick={() => setFilterBid("all")}
                    className={`rounded-lg border p-4 text-center transition-all hover:shadow-sm ${filterBid === "all" ? "ring-2 ring-primary" : ""}`}
                >
                    <p className="text-2xl font-bold">{paperBids.length}</p>
                    <p className="text-xs text-muted-foreground">Total Papers</p>
                </button>
                <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{totalBids}</p>
                    <p className="text-xs text-muted-foreground">Total Bids</p>
                </div>
                <button
                    onClick={() => setFilterBid(filterBid === "has-bids" ? "all" : "has-bids")}
                    className={`rounded-lg border p-4 text-center transition-all hover:shadow-sm ${filterBid === "has-bids" ? "ring-2 ring-primary" : ""}`}
                >
                    <p className="text-2xl font-bold text-emerald-600">{papersWithBids}</p>
                    <p className="text-xs text-muted-foreground">Papers with Bids</p>
                </button>
                <button
                    onClick={() => setFilterBid(filterBid === "no-bids" ? "all" : "no-bids")}
                    className={`rounded-lg border p-4 text-center transition-all hover:shadow-sm ${filterBid === "no-bids" ? "ring-2 ring-primary" : ""}`}
                >
                    <p className="text-2xl font-bold text-amber-600">{papersWithoutBids}</p>
                    <p className="text-xs text-muted-foreground">No Bids Yet</p>
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        className="pl-10 h-9"
                        placeholder="Search by title or paper ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="h-9 rounded-md border px-3 text-sm bg-white"
                    value={filterBid}
                    onChange={e => setFilterBid(e.target.value as BidFilter)}
                >
                    <option value="all">All Papers</option>
                    <option value="has-bids">Has Bids</option>
                    <option value="no-bids">No Bids</option>
                </select>
            </div>

            {/* Papers table */}
            {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No papers match your filters.</p>
                </div>
            ) : (
                <div className="overflow-auto rounded-lg border bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-gray-50/80">
                                <th className="px-3 py-3 text-left font-medium text-gray-600 w-12">STT</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-600 w-14">ID</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-600 min-w-[200px]">Title</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-600 w-28">Track</th>
                                <th className="px-3 py-3 text-center font-medium text-gray-600 w-20">
                                    <span className="flex items-center justify-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${BID_CONFIG.EAGER.dotColor}`} /> Eager
                                    </span>
                                </th>
                                <th className="px-3 py-3 text-center font-medium text-gray-600 w-20">
                                    <span className="flex items-center justify-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${BID_CONFIG.WILLING.dotColor}`} /> Willing
                                    </span>
                                </th>
                                <th className="px-3 py-3 text-center font-medium text-gray-600 w-24">
                                    <span className="flex items-center justify-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${BID_CONFIG.IN_A_PINCH.dotColor}`} /> In a pinch
                                    </span>
                                </th>
                                <th className="px-3 py-3 text-center font-medium text-gray-600 w-24">
                                    <span className="flex items-center justify-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${BID_CONFIG.NOT_WILLING.dotColor}`} /> Not willing
                                    </span>
                                </th>
                                <th className="px-3 py-3 text-center font-medium text-gray-600 w-16">Total</th>
                                <th className="px-3 py-3 text-center font-medium text-gray-600 w-20">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p, idx) => (
                                <tr
                                    key={p.paperId}
                                    className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                                >
                                    <td className="px-3 py-3 text-gray-400 text-xs font-medium">{idx + 1}</td>
                                    <td className="px-3 py-3 text-gray-400 font-mono text-xs">{p.paperId}</td>
                                    <td className="px-3 py-3 font-medium line-clamp-1">{p.paperTitle}</td>
                                    <td className="px-3 py-3 text-xs text-muted-foreground">{p.trackName}</td>
                                    <td className="px-3 py-3 text-center">
                                        {p.eager > 0 ? (
                                            <Badge className={`text-[10px] ${BID_CONFIG.EAGER.color}`}>{p.eager}</Badge>
                                        ) : <span className="text-muted-foreground text-xs">0</span>}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        {p.willing > 0 ? (
                                            <Badge className={`text-[10px] ${BID_CONFIG.WILLING.color}`}>{p.willing}</Badge>
                                        ) : <span className="text-muted-foreground text-xs">0</span>}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        {p.inAPinch > 0 ? (
                                            <Badge className={`text-[10px] ${BID_CONFIG.IN_A_PINCH.color}`}>{p.inAPinch}</Badge>
                                        ) : <span className="text-muted-foreground text-xs">0</span>}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        {p.notWilling > 0 ? (
                                            <Badge className={`text-[10px] ${BID_CONFIG.NOT_WILLING.color}`}>{p.notWilling}</Badge>
                                        ) : <span className="text-muted-foreground text-xs">0</span>}
                                    </td>
                                    <td className="px-3 py-3 text-center font-semibold">{p.total}</td>
                                    <td className="px-3 py-3 text-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs gap-1"
                                            onClick={() => setSheetPaper(p)}
                                        >
                                            <Eye className="h-3 w-3" /> View
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Bid Detail Sheet ── */}
            <Sheet open={sheetPaper !== null} onOpenChange={v => !v && setSheetPaper(null)}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-white z-10">
                        <SheetTitle className="text-lg">
                            #{sheetPaper?.paperId} — Bid Details
                        </SheetTitle>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {sheetPaper?.paperTitle}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="text-muted-foreground">Track: <strong>{sheetPaper?.trackName}</strong></span>
                            <span className="text-muted-foreground">Total: <strong>{sheetPaper?.total || 0}</strong> bids</span>
                        </div>
                    </SheetHeader>

                    <div className="p-6 space-y-5">
                        {sheetPaper && sheetPaper.total === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                <p className="text-sm">No bids received for this paper yet.</p>
                            </div>
                        ) : sheetPaper && (
                            <>
                                {/* Bid count summary bar */}
                                <div className="grid grid-cols-4 gap-2">
                                    {BID_ORDER.map(bv => {
                                        const count = bv === "EAGER" ? sheetPaper.eager
                                            : bv === "WILLING" ? sheetPaper.willing
                                            : bv === "IN_A_PINCH" ? sheetPaper.inAPinch
                                            : sheetPaper.notWilling
                                        return (
                                            <div key={bv} className={`rounded-lg border p-2 text-center ${BID_CONFIG[bv].bgSection}`}>
                                                <p className="text-lg font-bold">{count}</p>
                                                <p className="text-[10px] text-muted-foreground">{BID_CONFIG[bv].label}</p>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Grouped by bid type */}
                                {BID_ORDER.map(bv => {
                                    const bidsOfType = sheetPaper.bids.filter(b => b.bidValue === bv)
                                    if (bidsOfType.length === 0) return null
                                    return (
                                        <div key={bv}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`w-2.5 h-2.5 rounded-full ${BID_CONFIG[bv].dotColor}`} />
                                                <p className="text-xs font-semibold uppercase text-muted-foreground">
                                                    {BID_CONFIG[bv].label} ({bidsOfType.length})
                                                </p>
                                            </div>
                                            <div className="space-y-1.5">
                                                {bidsOfType.map((bid, i) => (
                                                    <div
                                                        key={bid.id}
                                                        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${BID_CONFIG[bv].bgSection}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}.</span>
                                                            <div className="w-7 h-7 rounded-full bg-white border flex items-center justify-center text-[11px] font-bold text-gray-600">
                                                                {bid.reviewerName?.charAt(0)?.toUpperCase() || "?"}
                                                            </div>
                                                            <span className="text-sm font-medium">{bid.reviewerName}</span>
                                                        </div>
                                                        <Badge className={`text-[10px] ${BID_CONFIG[bv].color}`}>
                                                            {BID_CONFIG[bv].label}
                                                        </Badge>
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
        </div>
    )
}
