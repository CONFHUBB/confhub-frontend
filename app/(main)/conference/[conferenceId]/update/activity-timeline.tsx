"use client"

import { useEffect, useState } from "react"
import { getConferenceActivities, updateConferenceActivities } from "@/app/api/conference.api"
import type { ConferenceActivityDTO } from "@/types/conference"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Calendar, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { HelpTooltip } from "@/components/help-tooltip"
import toast from "react-hot-toast"

interface ActivityTimelineProps {
    conferenceId: number
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

export function ActivityTimeline({ conferenceId }: ActivityTimelineProps) {
    const [activities, setActivities] = useState<ConferenceActivityDTO[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

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

    const handleToggle = (id: number, checked: boolean) => {
        setActivities(prev => 
            prev.map(activity => 
                activity.id === id ? { ...activity, isEnabled: checked } : activity
            )
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
        } catch (err: any) {
            console.error("Failed to update activities:", err)
            const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update activity timeline. Please try again."
            toast.error(msg)
        } finally {
            setSaving(false)
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
                            <strong>Tip:</strong> Set deadlines for each phase. You can enable multiple phases at once, but the recommended flow is sequential.
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

                            return (
                                <div key={activity.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-top gap-3 flex-1 min-w-0">
                                        <div className="mt-0.5 w-6 shrink-0 flex justify-center text-xs font-mono text-muted-foreground">
                                            {index + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-semibold text-sm">
                                                    {ACTIVITY_LABELS[activity.activityType] || activity.name || activity.activityType}
                                                </p>
                                                {activity.isEnabled && (
                                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                                        Active
                                                    </span>
                                                )}
                                                {!activity.isEnabled && (
                                                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                        Disabled
                                                    </span>
                                                )}
                                            </div>
                                            {description && (
                                                <p className="text-xs text-muted-foreground leading-relaxed pr-4">
                                                    {description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 pl-9 sm:pl-0 shrink-0 flex-wrap sm:flex-nowrap">
                                        <div className="flex-1 sm:w-48 relative">
                                            <Input 
                                                type="datetime-local" 
                                                value={formattedDate}
                                                onChange={(e) => handleDateChange(activity.id, e.target.value)}
                                                className="text-sm cursor-pointer w-full text-foreground/90 pl-8"
                                            />
                                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Switch 
                                                checked={activity.isEnabled}
                                                onCheckedChange={(checked) => handleToggle(activity.id, checked)}
                                                aria-label={`Toggle ${activity.name}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="flex justify-end">
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
            </CardContent>
        </Card>
    )
}
