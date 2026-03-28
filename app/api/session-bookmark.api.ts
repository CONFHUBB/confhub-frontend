import http from '@/lib/http'

/**
 * Task 4: Server-side session bookmark persistence for My Schedule (program page).
 * Replaces localStorage.setItem(`myBookmarks_${conferenceId}`) usage.
 *
 * Endpoints:
 *   GET    /api/v1/session-bookmarks/{conferenceId}               → string[]
 *   POST   /api/v1/session-bookmarks/{conferenceId}/{sessionId}   → void
 *   DELETE /api/v1/session-bookmarks/{conferenceId}/{sessionId}   → void
 *   DELETE /api/v1/session-bookmarks/{conferenceId}               → void (clear all)
 */

export async function getSessionBookmarks(conferenceId: number): Promise<string[]> {
    const res = await http.get<string[]>(`/session-bookmarks/${conferenceId}`)
    return res.data
}

export async function addSessionBookmark(conferenceId: number, sessionId: string): Promise<void> {
    await http.post(`/session-bookmarks/${conferenceId}/${encodeURIComponent(sessionId)}`)
}

export async function removeSessionBookmark(conferenceId: number, sessionId: string): Promise<void> {
    await http.delete(`/session-bookmarks/${conferenceId}/${encodeURIComponent(sessionId)}`)
}

export async function clearSessionBookmarks(conferenceId: number): Promise<void> {
    await http.delete(`/session-bookmarks/${conferenceId}`)
}

/**
 * Toggle a single session bookmark (add if absent, remove if present).
 * Returns the new bookmark state (true = bookmarked after this call).
 */
export async function toggleSessionBookmark(
    conferenceId: number,
    sessionId: string,
    currentlyBookmarked: boolean
): Promise<boolean> {
    if (currentlyBookmarked) {
        await removeSessionBookmark(conferenceId, sessionId)
        return false
    } else {
        await addSessionBookmark(conferenceId, sessionId)
        return true
    }
}
