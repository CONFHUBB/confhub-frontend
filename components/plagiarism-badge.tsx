"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ShieldCheck, ShieldAlert, ShieldX, Loader2, RefreshCw, AlertTriangle, Globe, FileText, ExternalLink, CheckCircle2, Search } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getPlagiarismResult, recheckPlagiarism, type PlagiarismDetails } from "@/app/api/plagiarism.api"
import { toast } from 'sonner'

interface PlagiarismBadgeProps {
    paperId: number
    score?: number | null
    status?: string | null
    showDetail?: boolean
    className?: string
}

function getScoreColor(score: number) {
    if (score <= 20) return { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", border: "border-green-200 dark:border-green-800" }
    if (score <= 40) return { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-800" }
    return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800" }
}

function getScoreIcon(score: number) {
    if (score <= 20) return <ShieldCheck className="h-3.5 w-3.5" />
    if (score <= 40) return <ShieldAlert className="h-3.5 w-3.5" />
    return <ShieldX className="h-3.5 w-3.5" />
}

function getScoreLabel(score: number) {
    if (score <= 20) return "Low Similarity"
    if (score <= 40) return "Moderate Similarity"
    return "High Similarity"
}

function parseDetails(raw: any): PlagiarismDetails | null {
    if (!raw) return null
    if (typeof raw === 'string') {
        try { return JSON.parse(raw) } catch { return null }
    }
    return raw as PlagiarismDetails
}

export function PlagiarismBadge({ paperId, score, status, showDetail = true, className }: PlagiarismBadgeProps) {
    const [open, setOpen] = useState(false)
    const [details, setDetails] = useState<PlagiarismDetails | null>(null)
    const [loading, setLoading] = useState(false)
    const [rechecking, setRechecking] = useState(false)
    // Local score that updates from API results
    const [localScore, setLocalScore] = useState<number | null>(null)
    const [localStatus, setLocalStatus] = useState<string | null>(null)

    const loadDetails = async () => {
        setLoading(true)
        try {
            const res = await getPlagiarismResult(paperId)
            setDetails(parseDetails(res.details))
            if (res.score != null) setLocalScore(res.score)
            if (res.status) setLocalStatus(res.status)
        } catch {
            toast.error("Failed to load plagiarism details")
        } finally {
            setLoading(false)
        }
    }

    const handleRecheck = async () => {
        setRechecking(true)
        try {
            const res = await recheckPlagiarism(paperId)
            const parsed = parseDetails(res.details)
            setDetails(parsed)
            if (res.score != null) setLocalScore(res.score)
            if (res.status) setLocalStatus(res.status)

            const s = res.score ?? 0
            const label = s <= 20 ? '✅ Low' : s <= 40 ? '⚠️ Moderate' : '🚨 High'
            toast.success(
                `Plagiarism Check Complete!\n${label} Similarity: ${s.toFixed(1)}%` +
                (parsed ? `\nInternal: ${(parsed.internalScore ?? 0).toFixed(1)}% | Web: ${(parsed.webSearchScore ?? 0).toFixed(1)}% | AI: ${(parsed.externalScore ?? 0).toFixed(1)}%` : ''),
                { duration: 6000 }
            )
        } catch {
            toast.error("Re-check failed. Please try again.")
        } finally {
            setRechecking(false)
        }
    }

    const effectiveStatus = localStatus ?? status
    const effectiveScore = localScore ?? score ?? 0

    // Status-based rendering
    if (!effectiveStatus || effectiveStatus === "PENDING") {
        return (
            <Badge variant="outline" className={cn("gap-1 text-muted-foreground", className)}>
                <Loader2 className="h-3 w-3 animate-spin" />
                Pending
            </Badge>
        )
    }

    if (effectiveStatus === "CHECKING") {
        return (
            <Badge variant="outline" className={cn("gap-1 text-blue-600", className)}>
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking...
            </Badge>
        )
    }

    if (effectiveStatus === "FAILED") {
        return (
            <Badge variant="outline" className={cn("gap-1 text-muted-foreground", className)}>
                <AlertTriangle className="h-3 w-3" />
                Check Failed
            </Badge>
        )
    }

    // COMPLETED
    const displayScore = effectiveScore
    const colors = getScoreColor(displayScore)

    const badge = (
        <Badge
            variant="outline"
            className={cn(
                "gap-1 cursor-pointer transition-colors",
                colors.bg, colors.text, colors.border,
                showDetail && "hover:opacity-80",
                className
            )}
            onClick={showDetail ? () => { setOpen(true); loadDetails() } : undefined}
        >
            {getScoreIcon(displayScore)}
            {displayScore.toFixed(1)}%
        </Badge>
    )

    if (!showDetail) return badge

    // Use details score if available, otherwise API-level score, then prop score
    // details.finalScore may be undefined for old pre-refactor data
    const dialogScore = (details?.finalScore != null && details.finalScore > 0) ? details.finalScore : displayScore
    const isStaleData = details != null && details.checkedAt == null

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{badge}</DialogTrigger>
            <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[85vh] overflow-y-auto overflow-x-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {getScoreIcon(dialogScore)}
                        Plagiarism Report
                    </DialogTitle>
                    <DialogDescription>
                        {getScoreLabel(dialogScore)} — {dialogScore.toFixed(1)}% similarity detected
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading details...</p>
                    </div>
                ) : details ? (
                    <div className="space-y-5">
                        {/* Stale data warning */}
                        {isStaleData && (
                            <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5">
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-amber-800 dark:text-amber-300">Outdated results</p>
                                    <p className="text-xs text-amber-700 dark:text-amber-400">This data is from an older check engine. Click <strong>Re-check</strong> to run the latest 3-layer analysis.</p>
                                </div>
                            </div>
                        )}

                        {/* Score Summary Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            <ScoreCard label="Internal" score={details.internalScore} />
                            <ScoreCard label="Web Search" score={details.webSearchScore} />
                            <ScoreCard label="Final" score={details.finalScore} highlight />
                        </div>

                        {/* ═══ Internal Matches ═══ */}
                        <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                                <FileText className="h-4 w-4 text-indigo-500" />
                                Internal Database Check
                            </h4>
                            {details.internalMatches && details.internalMatches.length > 0 ? (
                                <div className="space-y-2">
                                    {details.internalMatches.map((m, i) => (
                                        <div key={i} className="text-sm bg-muted/50 rounded-lg px-3 py-2.5 space-y-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="flex-1 font-medium leading-relaxed" title={m.title}>
                                                    #{m.paperId} — {m.title}
                                                </span>
                                                <span className={cn("font-mono text-xs font-bold shrink-0",
                                                    (m.similarity ?? 0) > 40 ? "text-red-600" : (m.similarity ?? 0) > 20 ? "text-yellow-600" : "text-green-600"
                                                )}>
                                                    {(m.similarity ?? 0).toFixed(1)}%
                                                </span>
                                            </div>
                                            {m.matchedSnippet && (
                                                <p className="text-xs text-muted-foreground italic bg-muted/50 rounded px-2 py-1">
                                                    Matched: {m.matchedSnippet}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50/50 dark:bg-green-950/20 rounded-lg px-3 py-2.5 border border-green-100 dark:border-green-900">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    No similar papers found in the system database.
                                </div>
                            )}
                        </div>

                        {/* ═══ Web Search Results ═══ */}
                        <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                                <Globe className="h-4 w-4 text-blue-500" />
                                Web Search Results
                            </h4>
                            {details.webSearchMatches && details.webSearchMatches.length > 0 ? (
                                <div className="space-y-2">
                                    {details.webSearchMatches.map((wm, i) => (
                                        <div key={i} className="text-sm bg-blue-50/50 dark:bg-blue-950/20 rounded-lg px-3 py-2.5 space-y-1 border border-blue-100 dark:border-blue-900">
                                            <div className="flex items-start justify-between gap-3">
                                                <a href={wm.url} target="_blank" rel="noopener noreferrer"
                                                    className="flex-1 text-blue-700 dark:text-blue-400 font-medium hover:underline leading-relaxed flex items-start gap-1 mt-0.5">
                                                    <span className="break-words">{wm.title}</span>
                                                    <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-1" />
                                                </a>
                                                <span className={cn("font-mono text-xs font-bold shrink-0",
                                                    (wm.similarity ?? 0) > 60 ? "text-red-600" : "text-yellow-600"
                                                )}>
                                                    {(wm.similarity ?? 0).toFixed(1)}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2">{wm.snippet}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50/50 dark:bg-green-950/20 rounded-lg px-3 py-2.5 border border-green-100 dark:border-green-900">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    No similar content found on the web.
                                </div>
                            )}
                        </div>



                        {/* Checked At + Re-check */}
                        <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs text-muted-foreground">
                                Checked: {details.checkedAt ? new Date(details.checkedAt).toLocaleString() : "Not yet checked with latest engine"}
                            </span>
                            <Button variant="outline" size="sm" onClick={handleRecheck} disabled={rechecking}>
                                <RefreshCw className={cn("h-3.5 w-3.5 mr-1", rechecking && "animate-spin")} />
                                {rechecking ? "Checking..." : "Re-check"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <Search className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">No plagiarism check results yet.</p>
                        <Button variant="outline" size="sm" onClick={handleRecheck} disabled={rechecking}>
                            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", rechecking && "animate-spin")} />
                            {rechecking ? "Checking..." : "Run Plagiarism Check"}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

function ScoreCard({ label, score, highlight }: { label: string; score: number; highlight?: boolean }) {
    const displayScore = score ?? 0
    const colors = getScoreColor(displayScore)
    return (
        <div className={cn(
            "rounded-lg border px-2 py-2 text-center",
            highlight ? cn(colors.bg, colors.border) : "bg-muted/30"
        )}>
            <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
            <p className={cn("text-lg font-bold", highlight ? colors.text : "")}>
                {displayScore.toFixed(1)}%
            </p>
        </div>
    )
}
