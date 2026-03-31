'use client'

import { useMemo } from 'react'
import { useUserRoles } from '@/hooks/useUserConferenceRoles'
import { useTrackSettings } from '@/hooks/useTrackSettings'
import type { PaperResponse, PaperStatus } from '@/types/paper'
import type { PaperAuthorItem } from '@/app/api/paper.api'
import {
    FileText, Eye, Users, Shield, MessageSquare, Gavel, Camera, History, Paperclip
} from 'lucide-react'

// ── Tab Configuration ──
export interface TabConfig {
    key: string
    label: string
    icon: any // Lucide icon component
    badge?: string | number
}

// ── Permission Flags ──
export interface PaperPermissions {
    canViewAssignments: boolean
    canMakeDecision: boolean
    canWriteReview: boolean
    canEditMetadata: boolean        // Author only
    canSubmitCameraReady: boolean   // Author only — redirects to payment wizard
    canViewDiscussion: boolean
    canViewReviews: boolean
    canViewConflicts: boolean
    canViewHistory: boolean
    canViewCameraReady: boolean     // Chair (read-only) + Author (with action)
    canViewDecision: boolean
    canViewFiles: boolean           // All roles can view submitted files
}

// ── Hook Return Type ──
export interface PaperRoleResult {
    isChair: boolean
    isReviewer: boolean
    isAuthor: boolean
    userId: number | null
    permissions: PaperPermissions
    visibleTabs: TabConfig[]
    isLoading: boolean
    isDoubleBlind: boolean
}

/**
 * Hook to determine the current user's effective role and permissions
 * for a specific paper within a conference.
 *
 * Combines:
 * - useUserRoles (conference role detection)
 * - useTrackSettings (review policy settings)
 * - Paper author check (is current user an author?)
 */
export function usePaperRole(
    conferenceId: number,
    paper: PaperResponse | null,
    authors: PaperAuthorItem[],
    reviewData?: { reviewCount: number; completedReviewCount: number }
): PaperRoleResult {
    const { hasRoleInConference, userId, isLoading: rolesLoading } = useUserRoles()
    const { settings, loading: settingsLoading } = useTrackSettings(conferenceId, paper?.trackId)

    const isChair = hasRoleInConference(conferenceId, 'CONFERENCE_CHAIR') ||
        hasRoleInConference(conferenceId, 'PROGRAM_CHAIR')
    const isReviewer = hasRoleInConference(conferenceId, 'REVIEWER')
    const isAuthor = useMemo(() => {
        if (!userId || !authors.length) return false
        return authors.some(a => a.user?.id === userId)
    }, [userId, authors])

    const paperStatus = paper?.status as PaperStatus | undefined
    const isAccepted = paperStatus === 'ACCEPTED' || paperStatus === 'CAMERA_READY'
    const isDecided = paperStatus === 'ACCEPTED' || paperStatus === 'REJECTED'

    // ── Permissions (strict role-based) ──
    const permissions = useMemo<PaperPermissions>(() => ({
        canViewAssignments: isChair,
        canMakeDecision: isChair,
        canWriteReview: isReviewer,
        canEditMetadata: isAuthor,                          // Author only
        canSubmitCameraReady: isAuthor && isAccepted,       // Author only — goes through payment/wizard
        canViewDiscussion: isChair || isReviewer || (isAuthor && settings.allowAuthorDiscuss),
        canViewReviews: isChair || isReviewer || isAuthor,
        canViewConflicts: isChair || isAuthor,
        canViewHistory: isChair,
        canViewCameraReady: isChair || (isAuthor && isAccepted), // Chair sees read-only, Author sees action button
        canViewDecision: isChair || (isAuthor && isDecided),
        canViewFiles: true,                                  // Everyone can view submitted files
    }), [isChair, isReviewer, isAuthor, isAccepted, isDecided, settings.allowAuthorDiscuss])

    // ── Visible Tabs (role-filtered) ──
    const visibleTabs = useMemo<TabConfig[]>(() => {
        const tabs: (TabConfig & { show: boolean })[] = [
            { key: 'info', label: 'Info', icon: FileText, show: true },
            { key: 'files', label: 'Files', icon: Paperclip, show: permissions.canViewFiles },
            {
                key: 'reviews', label: 'Reviews', icon: Eye, show: permissions.canViewReviews,
                badge: reviewData ? `${reviewData.completedReviewCount}/${reviewData.reviewCount}` : undefined
            },
            { key: 'assignments', label: 'Assignments', icon: Users, show: permissions.canViewAssignments },
            { key: 'conflicts', label: 'Conflicts', icon: Shield, show: permissions.canViewConflicts },
            { key: 'discussion', label: 'Discussion', icon: MessageSquare, show: permissions.canViewDiscussion },
            { key: 'decision', label: 'Decision', icon: Gavel, show: permissions.canViewDecision },
            { key: 'camera-ready', label: 'Camera Ready', icon: Camera, show: permissions.canViewCameraReady },
            { key: 'history', label: 'History', icon: History, show: permissions.canViewHistory },
        ]
        return tabs.filter(t => t.show).map(({ show, ...rest }) => rest)
    }, [permissions, reviewData])

    return {
        isChair,
        isReviewer,
        isAuthor,
        userId,
        permissions,
        visibleTabs,
        isLoading: rolesLoading || settingsLoading,
        isDoubleBlind: settings.isDoubleBlind,
    }
}
