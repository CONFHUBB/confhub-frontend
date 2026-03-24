"use client"

import { useEffect, useState } from "react"
import { getConferenceActivities, updateConferenceActivities, getActivityAuditLogs } from "@/app/api/conference.api"
import type { ConferenceActivityDTO, ActivityAuditLogDTO } from "@/types/conference"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Calendar, Info, ExternalLink, ChevronDown, ChevronUp, Clock, User, ArrowRight, ToggleLeft, ToggleRight, CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { HelpTooltip } from "@/components/help-tooltip"
import toast from "react-hot-toast"

interface ActivityTimelineProps {
    conferenceId: number
    onNavigate?: (tab: string) => void
}

// Activity types in logical order for displaying
const ACTIVITY_ORDER = [
    "PAPER_SUBMISSION",
    "REVIEWER_BIDDING",
    "REVIEW_SUBMISSION",
    "REVIEW_DISCUSSION",
    "AUTHOR_NOTIFICATION",
    "CAMERA_READY_SUBMISSION",
]

const ACTIVITY_LABELS: Record<string, string> = {
    "PAPER_SUBMISSION": "Paper Submission / Update",
    "REVIEWER_BIDDING": "Reviewer Bidding",
    "REVIEW_SUBMISSION": "Review Submission",
    "REVIEW_DISCUSSION": "Review Discussion",
    "AUTHOR_NOTIFICATION": "Author Decision Notification",
    "CAMERA_READY_SUBMISSION": "Camera-Ready Submission",
}

const ACTIVITY_DESCRIPTIONS: Record<string, string> = {
    "PAPER_SUBMISSION": "When enabled, authors can submit new papers and update existing submissions. Set a deadline to auto-close submissions.",
    "REVIEWER_BIDDING": "When enabled, reviewers can place bids on papers. Reviewers must select Subject Areas before bidding. Should be enabled after Paper Submission closes.",
    "REVIEW_SUBMISSION": "When enabled, assigned reviewers can submit their reviews. Enable this after paper assignments are finalized.",
    "REVIEW_DISCUSSION": "When enabled, reviewers can discuss papers and view each other's reviews. Typically enabled after all reviews are submitted.",
    "AUTHOR_NOTIFICATION": "When enabled, authors receive acceptance/rejection decisions. Enable this after all review discussions are complete.",
    "CAMERA_READY_SUBMISSION": "When enabled, accepted authors can upload final camera-ready versions. Enable after author notifications are sent.",
}

// Quick action configuration per activity type
const QUICK_ACTIONS: Record<string, { label: string; tab: string }> = {
    "PAPER_SUBMISSION": { label: "View Papers", tab: "features-paper-management" },
    "REVIEWER_BIDDING": { label: "View Bidding", tab: "features-review-management" },
    "REVIEW_SUBMISSION": { label: "View Reviews", tab: "features-review-management" },
    "REVIEW_DISCUSSION": { label: "View Reviews", tab: "features-review-management" },
    "AUTHOR_NOTIFICATION": { label: "View Decisions", tab: "features-review-management" },
    "CAMERA_READY_SUBMISSION": { label: "View Camera-Ready", tab: "features-camera-ready" },
}

// Activity icons/emoji
const ACTIVITY_ICONS: Record<string, string> = {
    "PAPER_SUBMISSION": "📄",
    "REVIEWER_BIDDING": "🔨",
    "REVIEW_SUBMISSION": "📝",
    "REVIEW_DISCUSSION": "💬",
    "AUTHOR_NOTIFICATION": "📧",
    "CAMERA_READY_SUBMISSION": "🏁",
}

// Audit log action config
const ACTION_CONFIG: Record<string, { label: string; color: string; icon: typeof ToggleRight }> = {
    "ENABLED": { label: "Enabled", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: ToggleRight },
    "DISABLED": { label: "Disabled", color: "text-red-700 bg-red-50 border-red-200", icon: ToggleLeft },
    "DEADLINE_CHANGED": { label: "Deadline Changed", color: "text-blue-700 bg-blue-50 border-blue-200", icon: CalendarClock },
}

export function ActivityTimeline({ conferenceId, onNavigate }: ActivityTimelineProps) {
    const [activities, setActivities] = useState<ConferenceActivityDTO[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [auditLogs, setAuditLogs] = useState<ActivityAuditLogDTO[]>([])
    const [auditLogsOpen, setAuditLogsOpen] = useState(false)
    const [auditLoading, setAuditLoading] = useState(false)

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                setLoading(true)
                const data = await getConferenceActivities(conferenceId)
                
                // Sort by predefined order
                const sortedData = [...data].sort((a, b) => {
                    const indexA = ACTIVITY_ORDER.indexOf(a.activityType)
                    const indexB = ACTIVITY_ORDER.indexOf(b.activityType)
                    
                    // Put unknown types at the bottom
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    
                    return indexA - indexB;
                });
                
                setActivities(sortedData)
            } catch (err: any) {
                console.error("Failed to load activities:", err)
                const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to load activity timeline. Please try again."
                toast.error(msg)
            } finally {
                setLoading(false)
            }
        }
        fetchActivities()
    }, [conferenceId])

    // Fetch audit logs when section is opened
    useEffect(() => {
        if (!auditLogsOpen) return
        const fetchAuditLogs = async () => {
            try {
                setAuditLoading(true)
                const data = await getActivityAuditLogs(conferenceId)
                setAuditLogs(data)
            } catch {
                setAuditLogs([])
            } finally {
                setAuditLoading(false)
            }
        }
        fetchAuditLogs()
    }, [auditLogsOpen, conferenceId])

    const handleToggle = (id: number, checked: boolean) => {
        setActivities(prev => 
            prev.map(activity => {
                if (activity.id === id) {
                    return { ...activity, isEnabled: checked }
                }
                // If enabling one, disable all others
                if (checked) {
                    return { ...activity, isEnabled: false }
                }
                return activity
            })
        )
    }

    const handleDateChange = (id: number, value: string) => {
        setActivities(prev => 
            prev.map(activity => 
                activity.id === id ? { ...activity, deadline: value } : activity
            )
        )
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            await updateConferenceActivities(conferenceId, activities)
            toast.success("Activity timeline updated successfully!")
            // Refresh audit logs if panel is open
            if (auditLogsOpen) {
                const data = await getActivityAuditLogs(conferenceId)
                setAuditLogs(data)
            }
        } catch (err: any) {
            console.error("Failed to update activities:", err)
            const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update activity timeline. Please try again."
            toast.error(msg)
        } finally {
            setSaving(false)
        }
    }

    const formatAuditDate = (iso: string) => {
        try {
            const d = new Date(iso)
            return d.toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            })
        } catch {
            return iso
        }
    }

    const formatDeadlineValue = (val: string | null) => {
        if (!val || val === 'none') return '—'
        try {
            const d = new Date(val)
            return d.toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            })
        } catch {
            return val
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="px-0 pt-0">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">Activity Timeline</CardTitle>
                    <HelpTooltip title="Activity Timeline Guide">
                        <p className="font-semibold mb-2">How the conference workflow works:</p>
                        <p>Activities should be enabled <strong>sequentially</strong> following the conference lifecycle. Each activity represents a phase:</p>
                        <ol className="list-decimal ml-4 mt-2 space-y-1.5">
                            <li><strong>Paper Submission</strong> — Open first so authors can submit papers</li>
                            <li><strong>Reviewer Bidding</strong> — Open after submissions close, reviewers bid on papers</li>
                            <li><strong>Review Submission</strong> — Open after paper assignments, reviewers submit reviews</li>
                            <li><strong>Review Discussion</strong> — Open for reviewers to discuss and reach consensus</li>
                            <li><strong>Author Notification</strong> — Send accept/reject decisions to authors</li>
                            <li><strong>Camera-Ready</strong> — Accepted authors upload final versions</li>
                        </ol>
                        <p className="mt-3 text-amber-700 bg-amber-50 rounded p-2 text-xs">
                            <strong>Note:</strong> Only one activity can be active at a time. Enabling an activity will automatically disable the currently active one.
                        </p>
                    </HelpTooltip>
                </div>
                <CardDescription>
                    Configure deadlines and enable/disable features for each phase of the conference.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
                {/* Workflow guidance banner */}
                <div className="flex items-start gap-3 p-4 mb-4 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <div className="text-blue-800">
                        <p className="font-medium">Workflow Guide</p>
                        <p className="mt-0.5 text-blue-700">
                            Enable activities in order: <strong>Submission</strong> → <strong>Bidding</strong> → <strong>Review</strong> → <strong>Discussion</strong> → <strong>Notification</strong> → <strong>Camera-Ready</strong>. 
                            Set a deadline for each phase, then toggle the switch to activate.
                        </p>
                    </div>
                </div>

                <div className="rounded-lg border divide-y mb-6">
                    {activities.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No activities configured for this conference yet.
                        </div>
                    ) : (
                        activities.map((activity, index) => {
                            // Format date for datetime-local input (YYYY-MM-DDThh:mm)
                            let formattedDate = activity.deadline || ""
                            if (formattedDate) {
                                try {
                                    const dateObj = new Date(formattedDate)
                                    if (!isNaN(dateObj.getTime())) {
                                        const yyyy = dateObj.getFullYear()
                                        const MM = String(dateObj.getMonth() + 1).padStart(2, '0')
                                        const dd = String(dateObj.getDate()).padStart(2, '0')
                                        const hh = String(dateObj.getHours()).padStart(2, '0')
                                        const mm = String(dateObj.getMinutes()).padStart(2, '0')
                                        formattedDate = `${yyyy}-${MM}-${dd}T${hh}:${mm}`
                                    }
                                } catch (e) {
                                    console.error("Date parsing error", e)
                                }
                            }

                            const description = ACTIVITY_DESCRIPTIONS[activity.activityType] || ""
                            const quickAction = QUICK_ACTIONS[activity.activityType]
                            const icon = ACTIVITY_ICONS[activity.activityType] || "⚙️"

                            // Determine phase status for visual cue
                            const orderIdx = ACTIVITY_ORDER.indexOf(activity.activityType)
                            const activeIdx = activities.findIndex(a => a.isEnabled)
                            const activeOrderIdx = activeIdx >= 0 ? ACTIVITY_ORDER.indexOf(activities[activeIdx].activityType) : -1
                            const isPast = activeOrderIdx >= 0 && orderIdx < activeOrderIdx
                            const isCurrent = activity.isEnabled
                            const isFuture = activeOrderIdx >= 0 && orderIdx > activeOrderIdx

                            return (
                                <div
                                    key={activity.id}
                                    className={`flex flex-col p-4 gap-3 transition-colors ${
                                        isCurrent
                                            ? "bg-emerald-50/40 border-l-4 border-l-emerald-500"
                                            : isPast
                                                ? "bg-muted/20 border-l-4 border-l-gray-300"
                                                : "hover:bg-muted/30 border-l-4 border-l-transparent"
                                    }`}
                                >
                                    {/* Row 1: Main info */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-top gap-3 flex-1 min-w-0">
                                            <div className="mt-0.5 w-8 shrink-0 flex justify-center text-lg">
                                                {icon}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <p className="font-semibold text-sm">
                                                        {ACTIVITY_LABELS[activity.activityType] || activity.name || activity.activityType}
                                                    </p>
                                                    {isCurrent && (
                                                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300 animate-pulse">
                                                            ● Active
                                                        </Badge>
                                                    )}
                                                    {isPast && (
                                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                            Completed
                                                        </Badge>
                                                    )}
                                                    {isFuture && (
                                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                            Upcoming
                                                        </Badge>
                                                    )}
                                                    {!isCurrent && !isPast && !isFuture && (
                                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                            Disabled
                                                        </Badge>
                                                    )}
                                                </div>
                                                {description && (
                                                    <p className="text-xs text-muted-foreground leading-relaxed pr-4">
                                                        {description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 pl-11 sm:pl-0 shrink-0 flex-wrap sm:flex-nowrap">
                                            {/* Deadline input */}
                                            <div className="flex-1 sm:w-48 relative">
                                                <Input 
                                                    type="datetime-local" 
                                                    value={formattedDate}
                                                    onChange={(e) => handleDateChange(activity.id, e.target.value)}
                                                    className="text-sm cursor-pointer w-full text-foreground/90 pl-8"
                                                />
                                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                            </div>
                                            {/* Toggle */}
                                            <Switch 
                                                checked={activity.isEnabled}
                                                onCheckedChange={(checked) => handleToggle(activity.id, checked)}
                                                aria-label={`Toggle ${activity.name}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Row 2: Quick Action */}
                                    {quickAction && onNavigate && (
                                        <div className="pl-11">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                                onClick={() => onNavigate(quickAction.tab)}
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                                {quickAction.label}
                                                <ArrowRight className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t py-4 -mx-8 px-8 md:-mx-12 md:px-12 flex justify-end">
                    <Button onClick={handleSave} disabled={saving || activities.length === 0}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </div>

                {/* ── Audit Logs Section ── */}
                <div className="rounded-lg border">
                    <button
                        onClick={() => setAuditLogsOpen(!auditLogsOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-indigo-600" />
                            <span className="text-sm font-semibold">Change History</span>
                            {auditLogs.length > 0 && (
                                <Badge variant="outline" className="text-[10px]">{auditLogs.length}</Badge>
                            )}
                        </div>
                        {auditLogsOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                    </button>

                    {auditLogsOpen && (
                        <div className="border-t px-4 py-3">
                            {auditLoading ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                </div>
                            ) : auditLogs.length === 0 ? (
                                <div className="text-center py-6 text-sm text-muted-foreground">
                                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p>No changes recorded yet.</p>
                                    <p className="text-xs mt-1">Changes will appear here after saving activity updates.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {auditLogs.map((log) => {
                                        const config = ACTION_CONFIG[log.action] || ACTION_CONFIG["ENABLED"]
                                        const IconComp = config.icon
                                        return (
                                            <div
                                                key={log.id}
                                                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border text-sm ${config.color}`}
                                            >
                                                <IconComp className="h-4 w-4 mt-0.5 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-medium">
                                                            {ACTIVITY_ICONS[log.activityType] || ''} {log.activityLabel}
                                                        </span>
                                                        <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                                                            {config.label}
                                                        </Badge>
                                                    </div>
                                                    {log.action === "DEADLINE_CHANGED" && (
                                                        <p className="text-xs mt-0.5 opacity-80">
                                                            {formatDeadlineValue(log.oldValue)} → {formatDeadlineValue(log.newValue)}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-1 text-xs opacity-70">
                                                        <span className="flex items-center gap-1">
                                                            <User className="h-3 w-3" />
                                                            {log.performedBy}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {formatAuditDate(log.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
