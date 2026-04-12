'use client'

import { useEffect, useState } from 'react'
import { PaperDiscussion } from '@/components/paper-discussion'
import { useTrackSettings } from '@/hooks/useTrackSettings'
import { getConferenceActivities } from '@/app/api/conference.api'
import { getDiscussionByPaper } from '@/app/api/discussion.api'
import { AlertCircle, Eye, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { isActivityOpen } from '@/lib/activity'

interface DiscussionTabProps {
    paperId: number
    userId: number | null
    isChair: boolean
    isReviewer: boolean
    isAuthor: boolean
    conferenceId: number
}

export function DiscussionTab({ paperId, userId, isChair, isReviewer, isAuthor, conferenceId }: DiscussionTabProps) {
    const { settings } = useTrackSettings(conferenceId)
    const [activityEnabled, setActivityEnabled] = useState<boolean | null>(null) // null = loading
    const [hasExistingDiscussions, setHasExistingDiscussions] = useState(false)

    // Fetch discussion activity status + existing posts
    useEffect(() => {
        const check = async () => {
            try {
                const [activities, posts] = await Promise.all([
                    getConferenceActivities(conferenceId).catch(() => []),
                    getDiscussionByPaper(paperId).catch(() => []),
                ])
                // Check if REVIEW_DISCUSSION activity is currently enabled/open
                const discussionActivity = activities.find(a => a.activityType === 'REVIEW_DISCUSSION')
                const isEnabled = discussionActivity?.isEnabled === true
                const isOpen = isActivityOpen(discussionActivity)
                setActivityEnabled(isEnabled || isOpen)
                setHasExistingDiscussions(posts.length > 0)
            } catch {
                setActivityEnabled(false)
            }
        }
        check()
    }, [conferenceId, paperId])

    if (!userId) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">Please log in to view discussions.</p>
            </div>
        )
    }

    if (activityEnabled === null) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
        )
    }

    // ── Discussion posting rules ──
    // Discussion is allowed if:
    //   1. The REVIEW_DISCUSSION activity is enabled/open, OR
    //   2. There are already existing discussions (phase was enabled before)
    // Chair: can VIEW all discussions, but CANNOT POST
    // Reviewer: can POST when discussion is active
    // Author: can POST only if allowAuthorDiscuss setting is true AND discussion active
    const discussionActive = activityEnabled || hasExistingDiscussions

    const canPost = (() => {
        if (!discussionActive) return false
        // Chair can never post — they are observers
        if (isChair && !isReviewer && !isAuthor) return false
        // Reviewer can post
        if (isReviewer) return true
        // Author can post only if track allows author discussion
        if (isAuthor) return settings.allowAuthorDiscuss
        return false
    })()

    // Anonymization: Chair sees real names, others see anonymized
    const shouldAnonymize = !isChair

    return (
        <div className="max-w-4xl space-y-4">
            {/* Chair read-only banner */}
            {isChair && !isReviewer && (
                <Card className="border-indigo-200 bg-indigo-50/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Eye className="h-5 w-5 text-indigo-500 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-indigo-800">Chair View — Read Only</p>
                            <p className="text-xs text-indigo-600 mt-0.5">
                                As Conference/Program Chair you can view all discussions but cannot post. Discussions are between reviewers{settings.allowAuthorDiscuss ? ' and authors' : ''}.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <PaperDiscussion
                paperId={paperId}
                currentUserId={userId}
                isChair={isChair}
                anonymize={shouldAnonymize}
                discussionEnabled={canPost}
            />
        </div>
    )
}
