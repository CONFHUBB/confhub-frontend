"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Loader2, Gavel } from "lucide-react"
import { UserLink } from "@/components/shared/user-link"
import type { BiddingResponse } from "@/types/bidding"

interface BidDetailSheetProps {
    paperId: number | null
    paperTitle: string | undefined
    bids: BiddingResponse[]
    loading: boolean
    onClose: () => void
}

const BID_CONFIG: Record<string, { label: string; dot: string }> = {
    EAGER: { label: 'Eager', dot: 'bg-emerald-500' },
    WILLING: { label: 'Willing', dot: 'bg-indigo-500' },
    IN_A_PINCH: { label: 'In a pinch', dot: 'bg-amber-500' },
    NOT_WILLING: { label: 'Not willing', dot: 'bg-red-500' },
}

const BID_SUMMARY_CONFIG = [
    { key: 'EAGER', label: 'Eager', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { key: 'WILLING', label: 'Willing', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
    { key: 'IN_A_PINCH', label: 'In a pinch', color: 'bg-amber-50 border-amber-200 text-amber-700' },
    { key: 'NOT_WILLING', label: 'Not willing', color: 'bg-red-50 border-red-200 text-red-700' },
] as const

export function BidDetailSheet({ paperId, paperTitle, bids, loading, onClose }: BidDetailSheetProps) {
    return (
        <Sheet open={paperId !== null} onOpenChange={v => !v && onClose()}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
                <SheetHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-white z-10">
                    <SheetTitle className="text-lg flex items-center gap-2">
                        <Gavel className="h-5 w-5 text-indigo-600" />
                        Bid Details — Paper #{paperId}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {paperTitle}
                    </p>
                </SheetHeader>
                <div className="p-6 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : bids.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Gavel className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            <p className="text-sm">No bids submitted for this paper yet.</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary */}
                            <div className="grid grid-cols-4 gap-2">
                                {BID_SUMMARY_CONFIG.map(item => (
                                    <div key={item.key} className={`rounded-lg border p-3 text-center ${item.color}`}>
                                        <p className="text-lg font-bold">
                                            {bids.filter(b => b.bidValue === item.key).length}
                                        </p>
                                        <p className="text-[10px]">{item.label}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Bid list grouped by type */}
                            {(['EAGER', 'WILLING', 'IN_A_PINCH', 'NOT_WILLING'] as const).map(bidType => {
                                const bidsOfType = bids.filter(b => b.bidValue === bidType)
                                if (bidsOfType.length === 0) return null
                                const cfg = BID_CONFIG[bidType]
                                return (
                                    <div key={bidType} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                                            <span className="text-sm font-semibold">{cfg.label} ({bidsOfType.length})</span>
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
    )
}
