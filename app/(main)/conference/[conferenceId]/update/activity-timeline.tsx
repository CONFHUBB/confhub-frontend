"use client"

import { useEffect, useState } from "react"
import { getConferenceActivities, updateConferenceActivities, getActivityAuditLogs } from "@/app/api/conference.api"
import type { ConferenceActivityDTO, ActivityAuditLogDTO } from "@/types/conference"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Calendar, Info, ExternalLink, ChevronDown, ChevronUp, Clock, User, ArrowRight, ToggleLeft, ToggleRight, CalendarClock, Settings, History, Search, Filter, ChevronLeft, ChevronRight, Download, Check, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { HelpTooltip } from "@/components/help-tooltip"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'

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
    "REGISTRATION",
    "EVENT_DAY",
]

const ACTIVITY_LABELS: Record<string, string> = {
    "PAPER_SUBMISSION": "Paper Submission / Update",
    "REVIEWER_BIDDING": "Reviewer Bidding",
    "REVIEW_SUBMISSION": "Review Submission",
    "REVIEW_DISCUSSION": "Review Discussion",
    "AUTHOR_NOTIFICATION": "Author Decision Notification",
    "CAMERA_READY_SUBMISSION": "Camera-Ready Submission",
    "REGISTRATION": "Registration",
    "EVENT_DAY": "Event Day",
}

const ACTIVITY_DESCRIPTIONS: Record<string, string> = {
    "PAPER_SUBMISSION": "When enabled, authors can submit new papers and update existing submissions. Set a deadline to auto-close submissions.",
    "REVIEWER_BIDDING": "When enabled, reviewers can place bids on papers. Reviewers must select Subject Areas before bidding. Should be enabled after Paper Submission closes.",
    "REVIEW_SUBMISSION": "When enabled, assigned reviewers can submit their reviews. Enable this after paper assignments are finalized.",
    "REVIEW_DISCUSSION": "When enabled, reviewers can discuss papers and view each other's reviews. Typically enabled after all reviews are submitted.",
    "AUTHOR_NOTIFICATION": "When enabled, authors receive acceptance/rejection decisions. Enable this after all review discussions are complete.",
    "CAMERA_READY_SUBMISSION": "When enabled, accepted authors can upload final camera-ready versions. Enable after author notifications are sent.",
    "REGISTRATION": "When enabled, accepted authors and attendees can register and purchase tickets for the conference. Set the registration deadline here.",
    "EVENT_DAY": "Marks the event start date. Enable this on the day of the conference for check-in and on-site management features.",
}

// Quick action configuration per activity type
const QUICK_ACTIONS: Record<string, { label: string; tab: string }> = {
    "PAPER_SUBMISSION": { label: "View Papers", tab: "features-paper-management" },
    "REVIEWER_BIDDING": { label: "View Bidding", tab: "features-review-management" },
    "REVIEW_SUBMISSION": { label: "View Reviews", tab: "features-review-management" },
    "REVIEW_DISCUSSION": { label: "View Reviews", tab: "features-review-management" },
    "AUTHOR_NOTIFICATION": { label: "View Decisions", tab: "features-review-management" },
    "CAMERA_READY_SUBMISSION": { label: "View Camera-Ready", tab: "features-camera-ready" },
    "REGISTRATION": { label: "View Attendees", tab: "features-attendees" },
    "EVENT_DAY": { label: "View Check-In", tab: "features-attendees" },
}

// Activity icons/emoji
const ACTIVITY_ICONS: Record<string, string> = {
    "PAPER_SUBMISSION": "📄",
    "REVIEWER_BIDDING": "🔨",
    "REVIEW_SUBMISSION": "📝",
    "REVIEW_DISCUSSION": "💬",
    "AUTHOR_NOTIFICATION": "📧",
    "CAMERA_READY_SUBMISSION": "🏁",
    "REGISTRATION": "🎟️",
    "EVENT_DAY": "🎤",
}

// Audit log action config
const ACTION_CONFIG: Record<string, { label: string; color: string; icon: typeof ToggleRight }> = {
    "ENABLED": { label: "Enabled", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: ToggleRight },
    "DISABLED": { label: "Disabled", color: "text-red-700 bg-red-50 border-red-200", icon: ToggleLeft },
    "DEADLINE_CHANGED": { label: "Deadline Changed", color: "text-indigo-700 bg-indigo-50 border-indigo-200", icon: CalendarClock },
}

export function ActivityTimeline({ conferenceId, onNavigate }: ActivityTimelineProps) {
    const [activities, setActivities] = useState<ConferenceActivityDTO[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [auditLogs, setAuditLogs] = useState<ActivityAuditLogDTO[]>([])
    const [activeTab, setActiveTab] = useState<'config' | 'log'>('config')
    const [auditLoading, setAuditLoading] = useState(false)

    // Log table state
    const [logSearch, setLogSearch] = useState('')
    const [logActionFilter, setLogActionFilter] = useState('ALL')
    const [logPage, setLogPage] = useState(1)

    // Derived state
    const activeFilterCount = logActionFilter !== 'ALL' ? 1 : 0

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
        if (activeTab !== 'log') return
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
    }, [activeTab, conferenceId])

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
                activity.id === id ? { ...activity, deadline: value || null } : activity
            )
        )
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            await updateConferenceActivities(conferenceId, activities)
            toast.success("Activity timeline updated successfully!")
            // Refresh audit logs if panel is open
            if (activeTab === 'log') {
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

    // ── Client-side deadline validation ──
    const validationErrors: Record<string, string> = {}
    const now = new Date()
    
    // Rule 1: Deadlines must be in strict chronological order
    const deadlineEntries: { type: string; date: Date; label: string }[] = []
    for (const type of ACTIVITY_ORDER) {
        const act = activities.find(a => a.activityType === type)
        if (act?.deadline) {
            const d = new Date(act.deadline)
            if (!isNaN(d.getTime())) {
                deadlineEntries.push({ type, date: d, label: ACTIVITY_LABELS[type] || type })
            }
        }
    }
    for (let i = 0; i < deadlineEntries.length - 1; i++) {
        const curr = deadlineEntries[i]
        const next = deadlineEntries[i + 1]
        if (curr.date >= next.date) {
            validationErrors[next.type] = `Deadline must be after "${curr.label}" (${curr.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })})`
        }
    }
    
    // Rule 2: Newly set deadlines must be in the future
    for (const act of activities) {
        if (act.deadline) {
            const d = new Date(act.deadline)
            if (!isNaN(d.getTime()) && d < now && !validationErrors[act.activityType]) {
                validationErrors[act.activityType] = 'Deadline cannot be in the past'
            }
        }
    }
    
    const hasValidationErrors = Object.keys(validationErrors).length > 0

    // Process logs for table
    const filteredLogs = auditLogs.filter(log => {
        if (logActionFilter !== 'ALL' && log.action !== logActionFilter) return false
        if (logSearch.trim()) {
            const q = logSearch.toLowerCase()
            return log.performedBy.toLowerCase().includes(q) || log.activityLabel.toLowerCase().includes(q)
        }
        return true
    })
    
    const logsPerPage = 10
    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage))
    const paginatedLogs = filteredLogs.slice((logPage - 1) * logsPerPage, logPage * logsPerPage)

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
            
            {/* Horizontal Tabs */}
            <div className="flex gap-1 border-b mb-6 mt-2">
                <button
                    onClick={() => setActiveTab('config')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        activeTab === 'config'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                    }`}
                >
                    <Settings className="h-4 w-4" />
                    Configuration
                </button>
                <button
                    onClick={() => setActiveTab('log')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        activeTab === 'log'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                    }`}
                >
                    <History className="h-4 w-4" />
                    System Logs
                </button>
            </div>

            <CardContent className="px-0 pb-0">
                {activeTab === 'config' ? (
                <>
                {/* Workflow guidance banner */}
                <div className="flex items-start gap-3 p-4 mb-4 rounded-lg bg-indigo-50 border border-indigo-200 text-sm">
                    <Info className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                    <div className="text-indigo-800">
                        <p className="font-medium">Workflow Guide</p>
                        <p className="mt-0.5 text-indigo-700">
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
                                            {/* Deadline input — w-56 prevents AM/PM cut-off */}
                                            <div className="sm:w-56">
                                                <div className="relative">
                                                    <Input 
                                                        type="datetime-local" 
                                                        value={formattedDate}
                                                        onChange={(e) => handleDateChange(activity.id, e.target.value)}
                                                        className={`text-sm cursor-pointer w-full text-foreground/90 pl-8 ${
                                                            validationErrors[activity.activityType]
                                                                ? 'border-red-400 bg-red-50/50 focus-visible:ring-red-400'
                                                                : ''
                                                        }`}
                                                    />
                                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                                </div>
                                                {validationErrors[activity.activityType] && (
                                                    <p className="mt-1.5 text-[11px] text-red-600 font-medium flex items-start gap-1">
                                                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                                        {validationErrors[activity.activityType]}
                                                    </p>
                                                )}
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
                                                className="h-7 text-xs gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
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

                <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t py-4 -mx-8 px-8 md:-mx-12 md:px-12 flex items-center justify-between gap-4">
                    {hasValidationErrors && (
                        <p className="text-sm text-red-600 font-medium flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4" />
                            Fix deadline errors before saving
                        </p>
                    )}
                    {!hasValidationErrors && <div />}
                    <Button onClick={handleSave} disabled={saving || activities.length === 0 || hasValidationErrors}>
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

                </>
                ) : (
                /* ── System Logs Section ── */
                <div className="mx-6 mb-8 mt-2 rounded-xl border bg-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            Activity History
                            {!auditLoading && (
                                <span className="text-xs font-normal text-muted-foreground">
                                    ({auditLogs.length})
                                </span>
                            )}
                        </h3>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by user or activity..."
                                className="pl-9 h-9 text-sm"
                                value={logSearch}
                                onChange={(e) => { setLogSearch(e.target.value); setLogPage(1) }}
                            />
                        </div>
                        {/* Action Filter */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-9 gap-2 text-sm px-3">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    Filters
                                    {activeFilterCount > 0 && (
                                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs font-normal">
                                            {activeFilterCount}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-0" align="end">
                                <div className="p-4 space-y-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-sm">Action Type</h4>
                                        <div className="grid gap-1">
                                            {['ALL', 'ENABLED', 'DISABLED', 'DEADLINE_CHANGED'].map(status => (
                                                <div
                                                    key={status}
                                                    className="flex items-center justify-between px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-muted"
                                                    onClick={() => { setLogActionFilter(status); setLogPage(1) }}
                                                >
                                                    <span className={logActionFilter === status ? 'font-medium' : ''}>
                                                        {status === 'ALL' ? 'All Actions' : ACTION_CONFIG[status as keyof typeof ACTION_CONFIG]?.label}
                                                    </span>
                                                    {logActionFilter === status && <Check className="h-4 w-4" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {activeFilterCount > 0 && (
                                    <div className="p-3 border-t bg-muted/50">
                                        <Button
                                            variant="ghost"
                                            className="w-full text-xs h-8"
                                            onClick={() => { setLogActionFilter('ALL'); setLogPage(1); }}
                                        >
                                            Clear filters
                                        </Button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>
                        {/* Export Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-xs h-9"
                            disabled={auditLoading || paginatedLogs.length === 0}
                            onClick={() => {
                                const headers = ['Time', 'Activity Phase', 'Action', 'Updates', 'User']
                                const rows = filteredLogs.map(log => [
                                    formatAuditDate(log.createdAt),
                                    `${ACTIVITY_ICONS[log.activityType] || ''} ${log.activityLabel}`,
                                    ACTION_CONFIG[log.action]?.label || ACTION_CONFIG["ENABLED"].label,
                                    log.action === "DEADLINE_CHANGED" ? `${formatDeadlineValue(log.oldValue)} -> ${formatDeadlineValue(log.newValue)}` : '',
                                    log.performedBy
                                ])
                                const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
                                const blob = new Blob([csv], { type: 'text/csv' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `audit-logs-${conferenceId}.csv`
                                a.click()
                                URL.revokeObjectURL(url)
                            }}
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export CSV
                        </Button>
                    </div>

                    {/* Table View */}
                    {auditLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : paginatedLogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed text-sm">
                            <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="font-medium text-foreground">No logs found</p>
                            <p className="mt-1">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-lg border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="w-12 text-center">#</TableHead>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Activity Phase</TableHead>
                                            <TableHead className="w-32">Action</TableHead>
                                            <TableHead>Updates</TableHead>
                                            <TableHead>User</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedLogs.map((log, idx) => {
                                            const config = ACTION_CONFIG[log.action] || ACTION_CONFIG["ENABLED"]
                                            const IconComp = config.icon
                                            return (
                                                <TableRow key={log.id}>
                                                    <TableCell className="text-center text-xs text-muted-foreground font-medium">
                                                        {(logPage - 1) * logsPerPage + idx + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-muted-foreground whitespace-nowrap">
                                                        {formatAuditDate(log.createdAt)}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-foreground whitespace-nowrap">
                                                        {ACTIVITY_ICONS[log.activityType] || ''} {log.activityLabel}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap">
                                                        <Badge variant="outline" className={`font-medium ${config.color.split(' ').filter(c => !c.startsWith('bg-')).join(' ')} ${config.color.split(' ').find(c => c.startsWith('bg-'))} bg-opacity-10 text-opacity-100 border-transparent`}>
                                                            <IconComp className="w-3 h-3 mr-1" />
                                                            {config.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="min-w-[200px]">
                                                        {log.action === "DEADLINE_CHANGED" ? (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="line-through opacity-70 bg-muted px-1.5 py-0.5 rounded">{formatDeadlineValue(log.oldValue)}</span>
                                                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                                                <span className="font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded shadow-sm border border-primary/20">{formatDeadlineValue(log.newValue)}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground italic text-xs">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 text-xs font-bold">
                                                                {(log.performedBy ?? "?")[0]?.toUpperCase()}
                                                            </div>
                                                            <span className="text-sm font-medium">{log.performedBy}</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t">
                                    <p className="text-xs text-muted-foreground">
                                        Page {logPage} of {totalPages} · {filteredLogs.length} events
                                    </p>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={logPage === 1}
                                            onClick={() => setLogPage(p => Math.max(1, p - 1))}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={logPage === totalPages}
                                            onClick={() => setLogPage(p => Math.min(totalPages, p + 1))}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                )}
            </CardContent>
        </Card>
    )
}
