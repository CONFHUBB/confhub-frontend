'use client'

import { PaperDiscussion } from '@/components/paper-discussion'
import { useTrackSettings } from '@/hooks/useTrackSettings'
import { AlertCircle, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

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

    if (!userId) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">Please log in to view discussions.</p>
            </div>
        )
    }

    // ── Discussion posting rules ──
    // Chair: can VIEW all discussions, but CANNOT POST
    // Reviewer: can POST to assigned papers; posting to non-assigned papers depends on allowDiscussNonAssignedPapers
    // Author: can POST only if allowAuthorDiscuss setting is true
    //
    // For the `discussionEnabled` prop of PaperDiscussion:
    //   - false = hides the post/reply forms (read-only mode)
    //   - true  = shows post/reply forms
    const canPost = (() => {
        // Chair can never post — they are observers
        if (isChair && !isReviewer && !isAuthor) return false
        // Reviewer can post if discussion is globally enabled
        if (isReviewer) return settings.enableAllPapersForDiscussion
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
