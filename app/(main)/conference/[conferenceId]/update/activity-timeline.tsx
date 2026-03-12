"use client"

import { useEffect, useState } from "react"
import { getConferenceActivities, updateConferenceActivities } from "@/app/api/conference.api"
import type { ConferenceActivityDTO } from "@/types/conference"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
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
    "PAPER_SUBMISSION": "Nộp bài / Cập nhật bài",
    "REVIEWER_BIDDING": "Đăng ký chấm bài (Bidding)",
    "REVIEW_SUBMISSION": "Nộp đánh giá (Review)",
    "REVIEW_DISCUSSION": "Thảo luận về Review",
    "AUTHOR_NOTIFICATION": "Gửi thông báo kết quả cho tác giả",
    "CAMERA_READY_SUBMISSION": "Nộp phiên bản bài báo cuối cùng (Camera-Ready)",
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
            } catch (err) {
                console.error("Failed to load activities:", err)
                toast.error("Failed to load activity timeline. Please try again.")
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
        } catch (err) {
            console.error("Failed to update activities:", err)
            toast.error("Failed to update activity timeline. Please try again.")
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
                <CardTitle className="text-xl">Activity Timeline</CardTitle>
                <CardDescription>
                    Configure deadlines and enable/disable features for each phase of the conference.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
                <div className="rounded-lg border divide-y mb-6">
                    {activities.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No activities configured for this conference yet.
                        </div>
                    ) : (
                        activities.map((activity, index) => {
                            // Format date for datetime-local input (YYYY-MM-DDThh:mm)
                            // We need to strip timezone or extra seconds if the backend provides them
                            let formattedDate = activity.deadline || ""
                            if (formattedDate) {
                                // Try to safely convert ISO string to what datetime-local expects
                                try {
                                    const dateObj = new Date(formattedDate)
                                    if (!isNaN(dateObj.getTime())) {
                                        // create a string format accepted by datetime-local (yyyy-MM-ddThh:mm)
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
                                            <div className="text-xs text-muted-foreground font-mono">
                                                {activity.activityType}
                                            </div>
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
