"use client"

import { useEffect, useState } from "react"
import { getAggregatesByConference, sendAuthorNotifications } from "@/app/api/review-aggregate.api"
import type { ReviewAggregate, AuthorNotificationRequest } from "@/app/api/review-aggregate.api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, BarChart3, Bell, Send, ChevronDown, ChevronRight } from "lucide-react"
import { Select } from "antd"
import toast from "react-hot-toast"

interface AuthorNotificationWizardProps {
    conferenceId: number
}

const PAPER_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "REVISION", "WITHDRAWN"]

export function AuthorNotificationWizard({ conferenceId }: AuthorNotificationWizardProps) {
    const [aggregates, setAggregates] = useState<ReviewAggregate[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedPaper, setExpandedPaper] = useState<number | null>(null)

    // Notification wizard state
    const [step, setStep] = useState<"overview" | "compose" | "result">("overview")
    const [subject, setSubject] = useState("Paper Decision Notification")
    const [recipientType, setRecipientType] = useState<"PRIMARY_CONTACT" | "ALL_AUTHORS">("PRIMARY_CONTACT")
    const [messagePerStatus, setMessagePerStatus] = useState<Record<string, string>>({
        ACCEPTED: "Congratulations! Your paper \"{paperTitle}\" (#{paperId}) has been ACCEPTED.",
        REJECTED: "We regret to inform you that your paper \"{paperTitle}\" (#{paperId}) has not been accepted.",
        REVISION: "Your paper \"{paperTitle}\" (#{paperId}) requires revision. Please submit a revised version.",
    })
    const [isSending, setIsSending] = useState(false)
    const [results, setResults] = useState<Record<number, string>>({})

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const data = await getAggregatesByConference(conferenceId)
                setAggregates(data)
            } catch (err) {
                console.error("Failed to load aggregates:", err)
                toast.error("Failed to load review aggregates")
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [conferenceId])

    const handleSend = async () => {
        setIsSending(true)
        try {
            const request: AuthorNotificationRequest = {
                messagePerStatus,
                subject,
                recipientType,
            }
            const res = await sendAuthorNotifications(conferenceId, request)
            setResults(res)
            setStep("result")
            toast.success("Notifications sent successfully!")
        } catch (err) {
            console.error("Failed to send:", err)
            toast.error("Failed to send notifications")
        } finally {
            setIsSending(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "ACCEPTED": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            case "REJECTED": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            case "REVISION": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
            case "UNDER_REVIEW": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
            case "SUBMITTED": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
            case "WITHDRAWN": return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
            default: return "bg-gray-100 text-gray-800"
        }
    }

    // Group papers by status
    const papersByStatus = aggregates.reduce<Record<string, ReviewAggregate[]>>((acc, agg) => {
        const s = agg.paperStatus || "UNKNOWN"
        if (!acc[s]) acc[s] = []
        acc[s].push(agg)
        return acc
    }, {})

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {step === "overview" && <><BarChart3 className="h-5 w-5" /> Review Aggregates & Notification</>}
                        {step === "compose" && <><Bell className="h-5 w-5" /> Compose Notifications</>}
                        {step === "result" && <><Send className="h-5 w-5" /> Notification Results</>}
                    </h2>
                </div>
                {step === "overview" && (
                    <Button onClick={() => setStep("compose")} size="lg">
                        <Bell className="h-4 w-4 mr-2" />
                        Send Author Notifications
                    </Button>
                )}
                {(step === "compose" || step === "result") && (
                    <Button variant="outline" onClick={() => setStep("overview")}>
                        ← Back to Overview
                    </Button>
                )}
            </div>

            {/* ====== STEP: OVERVIEW ====== */}
            {step === "overview" && (
                <>
                    {/* Status Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {PAPER_STATUSES.map((status) => (
                            <div key={status} className="rounded-lg border p-3 text-center">
                                <p className="text-xs text-muted-foreground">{status}</p>
                                <p className="text-2xl font-bold">{papersByStatus[status]?.length || 0}</p>
                            </div>
                        ))}
                    </div>

                    {/* Aggregates Table */}
                    {aggregates.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg bg-muted/5">
                            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">No reviews found for this conference.</p>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-semibold">Paper</th>
                                        <th className="text-center px-4 py-3 font-semibold">Status</th>
                                        <th className="text-center px-4 py-3 font-semibold">Reviews</th>
                                        <th className="text-center px-4 py-3 font-semibold">Completed</th>
                                        <th className="text-center px-4 py-3 font-semibold">Avg Score</th>
                                        <th className="text-center px-4 py-3 font-semibold">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {aggregates.map((agg) => (
                                        <>
                                            <tr key={agg.paperId} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="font-medium">#{agg.paperId}</span>{" "}
                                                    <span className="text-muted-foreground">{agg.paperTitle}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(agg.paperStatus)}`}>
                                                        {agg.paperStatus}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">{agg.reviewCount}</td>
                                                <td className="px-4 py-3 text-center">{agg.completedReviewCount}</td>
                                                <td className="px-4 py-3 text-center font-mono">
                                                    {agg.averageTotalScore?.toFixed(2) || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        className="text-primary hover:underline text-xs"
                                                        onClick={() => setExpandedPaper(expandedPaper === agg.paperId ? null : agg.paperId)}
                                                    >
                                                        {expandedPaper === agg.paperId ? (
                                                            <ChevronDown className="h-4 w-4 inline" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 inline" />
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedPaper === agg.paperId && agg.questionAggregates.length > 0 && (
                                                <tr key={`${agg.paperId}-detail`}>
                                                    <td colSpan={6} className="px-8 py-3 bg-muted/10">
                                                        <p className="text-xs font-semibold mb-2">Per-Question Scores</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            {agg.questionAggregates.map((qa) => (
                                                                <div key={qa.questionId} className="rounded border p-2 text-xs">
                                                                    <p className="font-medium text-muted-foreground">{qa.questionText}</p>
                                                                    <p className="font-mono mt-1">
                                                                        Avg: <strong>{qa.averageScore.toFixed(2)}</strong>
                                                                        {" | "}Min: {qa.minScore.toFixed(1)}
                                                                        {" | "}Max: {qa.maxScore.toFixed(1)}
                                                                        {" | "}Answers: {qa.answerCount}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* ====== STEP: COMPOSE ====== */}
            {step === "compose" && (
                <div className="space-y-6">
                    <div className="rounded-lg border p-6 space-y-4">
                        <div>
                            <label className="text-sm font-semibold block mb-1.5">Email Subject</label>
                            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10" />
                        </div>

                        <div>
                            <label className="text-sm font-semibold block mb-1.5">Recipient Type</label>
                            <Select
                                className="w-full h-10"
                                value={recipientType}
                                onChange={(val) => setRecipientType(val as any)}
                                options={[
                                    { value: "PRIMARY_CONTACT", label: "Primary Contact (first author)" },
                                    { value: "ALL_AUTHORS", label: "All Authors" },
                                ]}
                            />
                        </div>

                        <div className="border-t pt-4">
                            <p className="text-sm font-semibold mb-3">Message Templates per Status</p>
                            <p className="text-xs text-muted-foreground mb-3">
                                Placeholders: {"{paperTitle}"}, {"{paperId}"}, {"{status}"}
                            </p>
                            {["ACCEPTED", "REJECTED", "REVISION"].map((status) => (
                                <div key={status} className="mb-4">
                                    <label className="text-sm font-medium flex items-center gap-2 mb-1">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(status)}`}>
                                            {status}
                                        </span>
                                    </label>
                                    <Textarea
                                        value={messagePerStatus[status] || ""}
                                        onChange={(e) => setMessagePerStatus(prev => ({
                                            ...prev,
                                            [status]: e.target.value,
                                        }))}
                                        className="min-h-[60px] text-sm"
                                        placeholder={`Message for ${status} papers...`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button onClick={handleSend} disabled={isSending} size="lg">
                            {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            <Send className="h-4 w-4 mr-2" />
                            Send Notifications
                        </Button>
                        <Button variant="outline" onClick={() => setStep("overview")}>Cancel</Button>
                    </div>
                </div>
            )}

            {/* ====== STEP: RESULT ====== */}
            {step === "result" && (
                <div className="space-y-4">
                    <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold">Paper ID</th>
                                    <th className="text-left px-4 py-3 font-semibold">Result</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {Object.entries(results).map(([paperId, result]) => (
                                    <tr key={paperId} className="hover:bg-muted/30">
                                        <td className="px-4 py-3 font-medium">#{paperId}</td>
                                        <td className="px-4 py-3">
                                            <span className={result.startsWith("SENT") ? "text-green-600" : "text-muted-foreground"}>
                                                {result}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Button onClick={() => setStep("overview")} variant="outline">
                        ← Back to Overview
                    </Button>
                </div>
            )}
        </div>
    )
}
