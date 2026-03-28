"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Settings2, Shield } from "lucide-react"
import { ReviewSettings } from "./review-settings"
import { ConflictManagement } from "./conflict-management"

interface ReviewConflictConfigProps {
    conferenceId: number
}

export function ReviewConflictConfig({ conferenceId }: ReviewConflictConfigProps) {
    const [reviewOpen, setReviewOpen] = useState(true)
    const [conflictOpen, setConflictOpen] = useState(true)

    return (
        <div className="space-y-4">
            {/* Section 1: Review Settings */}
            <div className="rounded-xl border">
                <button
                    onClick={() => setReviewOpen(!reviewOpen)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors rounded-t-xl"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-100 text-indigo-600">
                            <Settings2 className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                            <p className="font-semibold text-sm">Review Settings</p>
                            <p className="text-xs text-muted-foreground">Double-blind, reviewer quota, discussion settings, etc.</p>
                        </div>
                    </div>
                    {reviewOpen
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    }
                </button>
                {reviewOpen && (
                    <div className="border-t px-5 py-5">
                        <ReviewSettings conferenceId={conferenceId} />
                    </div>
                )}
            </div>

            {/* Section 2: Conflict Settings */}
            <div className="rounded-xl border">
                <button
                    onClick={() => setConflictOpen(!conflictOpen)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors rounded-t-xl"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-100 text-amber-600">
                            <Shield className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                            <p className="font-semibold text-sm">Conflict Settings</p>
                            <p className="text-xs text-muted-foreground">Domain conflicts, manual conflicts, author self-config.</p>
                        </div>
                    </div>
                    {conflictOpen
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    }
                </button>
                {conflictOpen && (
                    <div className="border-t px-5 py-5">
                        <ConflictManagement conferenceId={conferenceId} />
                    </div>
                )}
            </div>
        </div>
    )
}
