'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTracksByConference, getTrackReviewSettings } from '@/app/api/track.api'
import type { TrackReviewSetting } from '@/types/track'

const DEFAULT_SETTINGS: TrackReviewSetting = {
    isDoubleBlind: true,
    reviewerInstructions: '',
    allowReviewerQuota: false,
    reviewerInviteExpirationDays: 7,
    allowOthersReviewAccessAfterSubmit: false,
    allowReviewUpdateDuringDiscussion: false,
    showReviewerIdentityToOtherReviewer: false,
    showAggregateColumns: false,
    allowReviewerSeeStatusBeforeNotification: false,
    enableAllPapersForDiscussion: false,
    allowDiscussNonAssignedPapers: false,
    allowAuthorDiscuss: false,
    doNotShowWithdrawnPapers: false,
    enableDomainConflict: true,
    enableAuthorSelfConflict: true,
    allowAuthorConfigureConflict: false,
}

/**
 * Hook to fetch TrackReviewSettings for a conference/track.
 * 
 * Usage:
 *   // Paper-specific context (knows trackId):
 *   const { settings } = useTrackSettings(conferenceId, paper.trackId)
 * 
 *   // Dashboard/overview (auto-picks first track):
 *   const { settings } = useTrackSettings(conferenceId)
 */
export function useTrackSettings(conferenceId: number, trackId?: number) {
    const [settings, setSettings] = useState<TrackReviewSetting>(DEFAULT_SETTINGS)
    const [loading, setLoading] = useState(true)
    const [resolvedTrackId, setResolvedTrackId] = useState<number | undefined>(trackId)

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true)
            let tid = trackId
            if (!tid) {
                // If no trackId provided, get first track of conference
                const tracks = await getTracksByConference(conferenceId)
                tid = tracks[0]?.id
                setResolvedTrackId(tid)
            }
            if (tid) {
                const data = await getTrackReviewSettings(tid)
                setSettings(data)
            }
        } catch {
            // Fallback to defaults silently — settings row may not exist yet
        } finally {
            setLoading(false)
        }
    }, [conferenceId, trackId])

    useEffect(() => {
        if (conferenceId) fetchSettings()
    }, [conferenceId, fetchSettings])

    return { settings, loading, resolvedTrackId, refetch: fetchSettings }
}

export { DEFAULT_SETTINGS }
export type { TrackReviewSetting }
